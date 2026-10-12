"""In-process event log per tailor session, replayable via Last-Event-ID.

Single-process by design (see README trade-offs). Swapping this class for Redis Streams
changes no caller: publish / finish / subscribe keep the same contract.
"""

import asyncio
import contextlib
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any

from app.schemas.enums import StreamEvent

_RETAIN_SECONDS = 600
HEARTBEAT_SECONDS = 15


@dataclass
class _Stream:
    events: list[tuple[StreamEvent, dict[str, Any]]] = field(default_factory=list)
    finished: bool = False
    cond: asyncio.Condition = field(default_factory=asyncio.Condition)


class TailorBroker:
    def __init__(self) -> None:
        self._streams: dict[str, _Stream] = {}

    def has(self, session_id: str) -> bool:
        return session_id in self._streams

    def open(self, session_id: str) -> None:
        self._streams[session_id] = _Stream()

    async def publish(self, session_id: str, event: StreamEvent, data: dict[str, Any]) -> None:
        stream = self._streams[session_id]
        async with stream.cond:
            stream.events.append((event, data))
            stream.cond.notify_all()

    async def finish(self, session_id: str) -> None:
        stream = self._streams[session_id]
        async with stream.cond:
            stream.finished = True
            stream.cond.notify_all()
        asyncio.get_running_loop().call_later(_RETAIN_SECONDS, self._streams.pop, session_id, None)

    async def subscribe(
        self, session_id: str, last_id: int = -1
    ) -> AsyncIterator[tuple[int, StreamEvent, dict[str, Any]] | None]:
        """Yields (id, event, data); yields None as a heartbeat tick while idle."""
        stream = self._streams[session_id]
        cursor = last_id + 1
        while True:
            async with stream.cond:
                if cursor >= len(stream.events) and not stream.finished:
                    with contextlib.suppress(TimeoutError):
                        await asyncio.wait_for(stream.cond.wait(), HEARTBEAT_SECONDS)
                batch = stream.events[cursor:]
                finished = stream.finished
            if not batch and not finished:
                yield None
                continue
            for offset, (event, data) in enumerate(batch):
                yield cursor + offset, event, data
            cursor += len(batch)
            if finished and cursor >= len(stream.events):
                return
