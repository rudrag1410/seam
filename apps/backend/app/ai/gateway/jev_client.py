"""TypeSafe Jev client: typed decisions with calibrated confidence.

Every decision has a deterministic degraded mode. `ask` returns None when Jev is
unavailable, and callers fall back to code. Jev failures never block the user.
"""

import hashlib
import json
import logging
from dataclasses import dataclass
from typing import Any

from typesafe_sdk import AsyncTypeSafeClient, Choice, Noul, Score

from app.ai.gateway.breaker import CircuitBreaker
from app.ai.gateway.usage import CallRecord, Recorder, timed
from app.core.config import Settings

log = logging.getLogger("seam.jev")


@dataclass
class Battery:
    """A typed, versioned group of questions that share one state and go out as one request."""

    name: str
    version: str
    questions: dict[str, Choice | Score | Noul]


@dataclass
class Answers:
    raw: dict[str, Any]

    def choice(self, name: str) -> tuple[str, float]:
        a = self.raw[name]
        return a.choice, a.confidence

    def score(self, name: str) -> tuple[float, float]:
        a = self.raw[name]
        return a.score, a.confidence

    def noul(self, name: str) -> float:
        return self.raw[name].noul

    def __contains__(self, name: str) -> bool:
        return name in self.raw


class JevClient:
    def __init__(self, settings: Settings, recorder: Recorder | None = None) -> None:
        self._settings = settings
        self._recorder = recorder
        self._breaker = CircuitBreaker()
        self._cache: dict[str, Answers] = {}
        self._client: AsyncTypeSafeClient | None = None

    @property
    def enabled(self) -> bool:
        return bool(self._settings.typesafe_api_key) and not self._settings.is_mock

    @property
    def breaker_open(self) -> bool:
        return self._breaker.is_open

    def _get_client(self) -> AsyncTypeSafeClient:
        if self._client is None:
            self._client = AsyncTypeSafeClient(
                api_key=self._settings.typesafe_api_key,
                model=self._settings.typesafe_default_model,
                timeout=self._settings.jev_timeout_s,
            )
        return self._client

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()

    @staticmethod
    def _key(state: Any, battery: Battery) -> str:
        blob = json.dumps(state, sort_keys=True, default=str) + battery.name + battery.version
        return hashlib.sha256(blob.encode()).hexdigest()

    async def ask(self, state: Any, battery: Battery) -> Answers | None:
        if not self.enabled or self._breaker.is_open or not battery.questions:
            return None
        key = self._key(state, battery)
        if key in self._cache:
            return self._cache[key]
        status = "ok"
        with timed() as t:
            try:
                result = await self._get_client().system_one(state, battery.questions)
                answers = Answers(dict(result.answers))
                self._breaker.record_success()
                self._cache[key] = answers
                return answers
            except Exception as exc:
                status = "error"
                self._breaker.record_failure()
                log.warning("jev %s failed: %s", battery.name, exc)
                return None
            finally:
                if self._recorder:
                    await self._recorder(
                        CallRecord(
                            provider="jev",
                            task=battery.name,
                            model=self._settings.typesafe_default_model,
                            prompt_version=battery.version,
                            latency_ms=t.ms,
                            status=status,
                        )
                    )
