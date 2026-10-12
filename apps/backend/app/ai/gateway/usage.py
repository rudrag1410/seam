import logging
import time
from collections.abc import Awaitable, Callable
from contextlib import contextmanager
from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.models import ModelCall

log = logging.getLogger("seam.ai")


@dataclass
class CallRecord:
    provider: str
    task: str
    model: str
    prompt_version: str | None = None
    tokens_in: int = 0
    tokens_out: int = 0
    latency_ms: float = 0
    status: str = "ok"


Recorder = Callable[[CallRecord], Awaitable[None]]


@dataclass
class Timer:
    started: float = field(default_factory=time.perf_counter)

    @property
    def ms(self) -> float:
        return (time.perf_counter() - self.started) * 1000


class DbRecorder:
    """Writes one row per model call. Callable, so it satisfies `Recorder`."""

    def __init__(self, maker: async_sessionmaker[AsyncSession]) -> None:
        self._maker = maker

    async def __call__(self, rec: CallRecord) -> None:
        log.info(
            "model_call %s %s %s %.0fms %s", rec.provider, rec.task, rec.model, rec.latency_ms, rec.status
        )
        try:
            async with self._maker() as db:
                db.add(ModelCall(**rec.__dict__))
                await db.commit()
        except Exception:  # observability must never break a request
            log.exception("failed to record model call")


def make_db_recorder(maker: async_sessionmaker[AsyncSession]) -> Recorder:
    return DbRecorder(maker)


@contextmanager
def timed():
    t = Timer()
    yield t
