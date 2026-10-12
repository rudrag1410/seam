import uuid
from datetime import UTC, datetime
from enum import StrEnum

from sqlalchemy import JSON, DateTime, String, TypeDecorator, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# JSONB on Postgres, plain JSON elsewhere (SQLite for zero-setup local dev).
Json = JSON().with_variant(JSONB(), "postgresql")


class UTCDateTime(TypeDecorator):
    """Timezone-aware UTC datetimes on every backend. SQLite drops tzinfo, which would
    otherwise serialize without a `Z` and be read as local time by clients."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_result_value(self, value: datetime | None, dialect) -> datetime | None:
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value


class EnumString[E: StrEnum](TypeDecorator[E]):
    """A string enum stored as plain text. The column stays a VARCHAR on every backend (no native
    enum to migrate), and rows come back as members rather than bare strings."""

    impl = String
    cache_ok = True

    def __init__(self, enum: type[E], length: int = 30) -> None:
        super().__init__(length)
        self._enum = enum

    def process_bind_param(self, value: E | str | None, dialect) -> str | None:
        return None if value is None else self._enum(value).value

    def process_result_value(self, value: str | None, dialect) -> E | None:
        return None if value is None else self._enum(value)


def utcnow() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


class IdMixin:
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)


class CreatedMixin:
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)
