from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Protocol, TypeVar

from pydantic import BaseModel

from app.ai.gateway.jev_client import JevClient
from app.ai.gateway.mock import MockGenerator
from app.ai.gateway.openai_client import OpenAIGenerator
from app.ai.gateway.router import Task
from app.ai.gateway.usage import Recorder
from app.core.config import Settings

T = TypeVar("T", bound=BaseModel)


class Generator(Protocol):
    breaker_open: bool

    async def structured(
        self, task: Task, *, system: str, user: str, schema: type[T], context: dict | None = None
    ) -> T: ...

    async def vision_structured(
        self, task: Task, *, system: str, user: str, images: list[bytes], schema: type[T]
    ) -> T: ...

    def stream_objects(
        self, task: Task, *, system: str, user: str, schema: type[T], context: dict | None = None
    ) -> AsyncIterator[dict]: ...

    def stream_text(
        self, task: Task, *, system: str, user: str, context: dict | None = None
    ) -> AsyncIterator[str]: ...


@dataclass
class AIGateway:
    """OpenAI generates; Jev decides. Jev is optional and every decision has a code fallback."""

    generate: Generator
    jev: JevClient

    @property
    def degraded_reason(self) -> str | None:
        return None if self.jev.enabled and not self.jev.breaker_open else "jev_unavailable"


def build_gateway(settings: Settings, recorder: Recorder | None = None) -> AIGateway:
    generator: Generator = (
        MockGenerator(settings.mock_stream_delay_s)
        if settings.is_mock
        else OpenAIGenerator(settings, recorder)  # type: ignore[assignment]
    )
    return AIGateway(generate=generator, jev=JevClient(settings, recorder))
