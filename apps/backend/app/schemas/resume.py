from datetime import datetime

from app.schemas.base import ApiModel
from app.schemas.enums import ParsePath
from app.schemas.resume_ast import Resume


class ResumeOut(ApiModel):
    id: str
    filename: str | None
    size_bytes: int | None
    page_count: int | None
    parse_path: ParsePath | None
    document: Resume
    created_at: datetime
    prefill: dict[str, str | float | None] = {}
