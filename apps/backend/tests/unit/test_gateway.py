"""OpenAI generator: structured output repair, model fallback and circuit breaker; Jev degraded mode."""

import json
from types import SimpleNamespace

import pytest
from openai import APIConnectionError
from pydantic import BaseModel

from app.ai.gateway.breaker import CircuitBreaker
from app.ai.gateway.jev_client import JevClient
from app.ai.gateway.openai_client import OpenAIGenerator
from app.ai.gateway.router import Task
from app.core.config import Settings
from app.core.errors import AppError

SETTINGS = Settings(
    ai_mode="live", openai_api_key="sk-test", llm_model_openai_fast="fast", llm_model_openai_strong="strong"
)


class Out(BaseModel):
    value: int


def reply(content: str):
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))],
        usage=SimpleNamespace(prompt_tokens=1, completion_tokens=1),
    )


class FakeCompletions:
    def __init__(self, script):
        self.script, self.calls = list(script), []

    async def create(self, **kw):
        self.calls.append(kw["model"])
        step = self.script.pop(0)
        if isinstance(step, Exception):
            raise step
        return reply(step)


def make(script) -> tuple[OpenAIGenerator, FakeCompletions]:
    gen = OpenAIGenerator(SETTINGS)
    fake = FakeCompletions(script)
    gen._client = SimpleNamespace(chat=SimpleNamespace(completions=fake))  # type: ignore[assignment]
    return gen, fake


def down() -> APIConnectionError:
    return APIConnectionError(request=SimpleNamespace())  # type: ignore[arg-type]


async def call(gen: OpenAIGenerator):
    return await gen.structured(Task.JD_ANALYZE, system="s", user="u", schema=Out)


async def test_valid_json_is_parsed():
    gen, fake = make([json.dumps({"value": 7})])
    assert (await call(gen)).value == 7 and fake.calls == ["fast"]


async def test_invalid_json_gets_one_repair_attempt():
    gen, fake = make(['{"value": "oops"}', json.dumps({"value": 1})])
    assert (await call(gen)).value == 1 and fake.calls == ["fast", "fast"]


async def test_failure_falls_back_to_the_other_model():
    gen, fake = make([down(), json.dumps({"value": 2})])
    assert (await call(gen)).value == 2 and fake.calls == ["fast", "strong"]


async def test_exhausted_fallbacks_raise_a_typed_retryable_error():
    gen, _ = make([down(), down()])
    with pytest.raises(AppError) as e:
        await call(gen)
    assert e.value.code == "LLM_UNAVAILABLE" and e.value.retryable and e.value.status == 503


async def test_open_breaker_short_circuits():
    gen, fake = make([])
    for _ in range(5):
        gen._breaker.record_failure()
    with pytest.raises(AppError):
        await call(gen)
    assert fake.calls == []


def test_breaker_opens_then_recovers():
    b = CircuitBreaker(threshold=2, window_s=30, cooldown_s=0.0)
    b.record_failure()
    assert not b.is_open
    b.record_failure()
    assert b._opened_at is not None
    assert not b.is_open  # zero cooldown: half-open immediately


async def test_jev_without_key_is_disabled_not_broken():
    jev = JevClient(Settings(ai_mode="live", typesafe_api_key=""))
    assert not jev.enabled
    assert await jev.ask("state", SimpleNamespace(name="x", version="1", questions={"q": object()})) is None  # type: ignore[arg-type]


class _JevDown:
    async def system_one(self, *a, **k):
        raise RuntimeError("timeout")


class _JevCounting:
    """Answers every battery the same way and counts how often it was asked."""

    def __init__(self) -> None:
        self.calls = 0

    async def system_one(self, state, questions):
        self.calls += 1
        return SimpleNamespace(answers={"q": SimpleNamespace(noul=0.9)})


async def test_jev_failure_returns_none_and_trips_the_breaker():
    jev = JevClient(Settings(ai_mode="live", typesafe_api_key="k"))
    jev._client = _JevDown()  # type: ignore[assignment]
    battery = SimpleNamespace(name="x", version="1", questions={"q": object()})
    for _ in range(5):
        assert await jev.ask({"s": 1}, battery) is None  # type: ignore[arg-type]
    assert jev.breaker_open


async def test_jev_answers_are_cached_by_state_and_battery_version():
    jev = JevClient(Settings(ai_mode="live", typesafe_api_key="k"))
    client = _JevCounting()
    jev._client = client  # type: ignore[assignment]
    battery = SimpleNamespace(name="x", version="1", questions={"q": object()})
    a = await jev.ask({"s": 1}, battery)  # type: ignore[arg-type]
    b = await jev.ask({"s": 1}, battery)  # type: ignore[arg-type]
    assert a is b and client.calls == 1 and a.noul("q") == 0.9
