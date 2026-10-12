from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Protocol, TypeVar, cast

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
    generate: Generator
    jev: JevClient


def build_gateway(settings: Settings, recorder: Recorder | None = None) -> AIGateway:
    generator: Generator = (
        MockGenerator(settings.mock_stream_delay_s)
        if settings.is_mock
        else cast(Generator, OpenAIGenerator(settings, recorder))
    )
    return AIGateway(generate=generator, jev=JevClient(settings, recorder))
