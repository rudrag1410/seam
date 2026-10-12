"""OpenAI generation: structured JSON with one repair attempt, a model fallback,
a circuit breaker, streaming text and a vision path."""

import base64
import json
import logging
import re
from collections.abc import AsyncIterator
from typing import Any, TypeVar, cast

from openai import APIError, APITimeoutError, AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam
from pydantic import BaseModel, ValidationError

from app.ai.gateway.breaker import CircuitBreaker
from app.ai.gateway.json_stream import ArrayObjectScanner
from app.ai.gateway.router import Route, Task, route_for
from app.ai.gateway.usage import CallRecord, Recorder, timed
from app.core.config import Settings
from app.core.errors import AppError

log = logging.getLogger("seam.openai")
T = TypeVar("T", bound=BaseModel)


def _messages(items: list[Any]) -> list[ChatCompletionMessageParam]:
    return cast(list[ChatCompletionMessageParam], items)


LLM_UNAVAILABLE = AppError(
    "LLM_UNAVAILABLE",
    "The AI service isn't responding right now.",
    status=503,
    hint="Your inputs are saved. Try again in a minute.",
    retryable=True,
)

LLM_NOT_CONFIGURED = AppError(
    "LLM_NOT_CONFIGURED",
    "AI isn't set up on this server yet.",
    status=503,
    hint="Add OPENAI_API_KEY to apps/backend/.env and restart the API. (AI_MODE=mock runs an offline demo.)",
    retryable=False,
)


class OpenAIGenerator:
    def __init__(self, settings: Settings, recorder: Recorder | None = None) -> None:
        self._s = settings
        self._recorder = recorder
        self._breaker = CircuitBreaker()
        self._client = AsyncOpenAI(api_key=settings.openai_api_key or "missing", max_retries=0)

    @property
    def breaker_open(self) -> bool:
        return self._breaker.is_open

    def _limits(self, route: Route, model: str) -> dict[str, Any]:
        """Output cap on every call, and a lower reasoning effort on reasoning models (much faster)."""
        kw: dict[str, Any] = {"max_completion_tokens": min(route.max_output, self._s.llm_max_output_tokens)}
        configured = self._s.llm_reasoning_effort
        if configured and re.match(r"(gpt-5|o\d)", model):
            effort = route.effort or configured
            if effort == "minimal" and model.startswith("o"):
                effort = "low"  # o-series has no "minimal"
            kw["reasoning_effort"] = effort
        return kw

    async def _record(self, task: Task, model: str, usage: Any, ms: float, status: str) -> None:
        if not self._recorder:
            return
        await self._recorder(
            CallRecord(
                provider="openai",
                task=task.value,
                model=model,
                prompt_version=self._s.prompt_version,
                tokens_in=getattr(usage, "prompt_tokens", 0) or 0,
                tokens_out=getattr(usage, "completion_tokens", 0) or 0,
                latency_ms=ms,
                status=status,
            )
        )

    async def _chat(
        self,
        task: Task,
        model: str,
        messages: list[ChatCompletionMessageParam],
        route: Route,
        *,
        json_mode: bool,
    ):
        kwargs: dict[str, Any] = self._limits(route, model)
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        with timed() as t:
            try:
                resp = await self._client.chat.completions.create(
                    model=model,
                    messages=messages,
                    timeout=route.timeout_s,
                    **kwargs,  # type: ignore[arg-type]
                )
            except Exception:
                await self._record(task, model, None, t.ms, "error")
                raise
        await self._record(task, model, resp.usage, t.ms, "ok")
        return resp.choices[0].message.content or ""

    async def _structured_once(
        self,
        task: Task,
        route: Route,
        model: str,
        messages: list[ChatCompletionMessageParam],
        schema: type[T],
    ) -> T:
        text = await self._chat(task, model, messages, route, json_mode=True)
        try:
            return schema.model_validate_json(text)
        except (ValidationError, ValueError) as err:
            # One repair attempt with the validator error fed back.
            repair = _messages(
                [
                    *messages,
                    {"role": "assistant", "content": text},
                    {
                        "role": "user",
                        "content": f"That JSON failed validation:\n{err}\nReturn corrected JSON only.",
                    },
                ]
            )
            text = await self._chat(task, model, repair, route, json_mode=True)
            return schema.model_validate_json(text)

    async def structured(
        self, task: Task, *, system: str, user: str, schema: type[T], context: dict | None = None
    ) -> T:
        route = route_for(task, self._s)
        schema_json = json.dumps(schema.model_json_schema())
        messages = _messages(
            [
                {
                    "role": "system",
                    "content": f"{system}\n\nReturn a single JSON object matching this JSON Schema:\n{schema_json}",
                },
                {"role": "user", "content": user},
            ]
        )
        return await self._with_fallback(task, route, messages, schema)

    async def vision_structured(
        self, task: Task, *, system: str, user: str, images: list[bytes], schema: type[T]
    ) -> T:
        route = route_for(task, self._s)
        content: list[dict] = [{"type": "text", "text": user}]
        for img in images:
            b64 = base64.b64encode(img).decode()
            content.append({"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}})
        schema_json = json.dumps(schema.model_json_schema())
        messages = _messages(
            [
                {
                    "role": "system",
                    "content": f"{system}\n\nReturn a single JSON object matching this JSON Schema:\n{schema_json}",
                },
                {"role": "user", "content": content},
            ]
        )
        return await self._with_fallback(task, route, messages, schema)

    async def stream_text(
        self, task: Task, *, system: str, user: str, context: dict | None = None
    ) -> AsyncIterator[str]:
        route = route_for(task, self._s)
        if not self._s.openai_api_key:
            raise LLM_NOT_CONFIGURED
        if self._breaker.is_open:
            raise LLM_UNAVAILABLE
        messages = _messages([{"role": "system", "content": system}, {"role": "user", "content": user}])
        try:
            stream = await self._client.chat.completions.create(
                model=route.model,
                messages=messages,
                stream=True,
                timeout=route.timeout_s,
                **self._limits(route, route.model),  # type: ignore[arg-type]
            )
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
            self._breaker.record_success()
        except (APIError, APITimeoutError) as exc:
            self._breaker.record_failure()
            log.warning("openai stream failed: %s", exc)
            raise LLM_UNAVAILABLE from exc

    async def stream_objects(
        self, task: Task, *, system: str, user: str, schema: type[T], context: dict | None = None
    ) -> AsyncIterator[dict]:
        """Stream a `{"<key>": [ {...}, ... ]}` response and yield each array element as soon as the
        model finishes writing it. If the stream dies after some elements, what arrived is kept."""
        route = route_for(task, self._s)
        if not self._s.openai_api_key:
            raise LLM_NOT_CONFIGURED
        if self._breaker.is_open:
            raise LLM_UNAVAILABLE
        schema_json = json.dumps(schema.model_json_schema())
        messages = _messages(
            [
                {
                    "role": "system",
                    "content": f"{system}\n\nReturn a single JSON object matching this JSON Schema:\n{schema_json}",
                },
                {"role": "user", "content": user},
            ]
        )
        models = [route.model] + (
            [route.fallback] if route.fallback and route.fallback != route.model else []
        )
        emitted = 0
        for model in models:
            scanner = ArrayObjectScanner()
            usage: Any = None
            status = "ok"
            with timed() as t:
                try:
                    stream = await self._client.chat.completions.create(
                        model=model,
                        messages=messages,
                        stream=True,
                        stream_options={"include_usage": True},
                        response_format={"type": "json_object"},
                        timeout=route.timeout_s,
                        **self._limits(route, model),  # type: ignore[arg-type]
                    )
                    async for chunk in stream:
                        if getattr(chunk, "usage", None):
                            usage = chunk.usage
                        delta = chunk.choices[0].delta.content if chunk.choices else None
                        if delta:
                            for obj in scanner.feed(delta):
                                emitted += 1
                                yield obj
                    self._breaker.record_success()
                    await self._record(task, model, usage, t.ms, status)
                    return
                except (APIError, APITimeoutError) as exc:
                    status = "error"
                    self._breaker.record_failure()
                    log.warning("openai stream failed on %s: %s", model, exc)
                    await self._record(task, model, usage, t.ms, status)
                    if emitted:
                        return  # keep what arrived; retrying would duplicate suggestions
        raise LLM_UNAVAILABLE

    async def _with_fallback(
        self, task: Task, route: Route, messages: list[ChatCompletionMessageParam], schema: type[T]
    ) -> T:
        """One structured call on the route's model, then on its fallback, behind the breaker."""
        if not self._s.openai_api_key:
            raise LLM_NOT_CONFIGURED
        if self._breaker.is_open:
            raise LLM_UNAVAILABLE
        models = [route.model] + (
            [route.fallback] if route.fallback and route.fallback != route.model else []
        )
        last: Exception | None = None
        for model in models:
            try:
                result = await self._structured_once(task, route, model, messages, schema)
                self._breaker.record_success()
                return result
            except (APIError, APITimeoutError, ValidationError, ValueError) as exc:
                last = exc
                self._breaker.record_failure()
                log.warning("openai call failed on %s: %s", model, exc)
        raise LLM_UNAVAILABLE from last
