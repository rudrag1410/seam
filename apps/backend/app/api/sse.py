import json

from fastapi.responses import StreamingResponse

from app.schemas.enums import StreamEvent

STREAM_HEADERS = {"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"}


class EventStreamResponse(StreamingResponse):
    media_type = "text/event-stream"

    def __init__(self, content, status_code: int = 200, headers: dict[str, str] | None = None) -> None:
        super().__init__(content, status_code=status_code, headers={**STREAM_HEADERS, **(headers or {})})


def frame(event: StreamEvent, data: dict, event_id: int | None = None) -> str:
    head = f"id: {event_id}\n" if event_id is not None else ""
    return f"{head}event: {event}\ndata: {json.dumps(data, default=str)}\n\n"
