from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ActivityEvent
from app.schemas.enums import ActivityKind, EntityType


def record(
    db: AsyncSession,
    user_id: UUID,
    type_: ActivityKind,
    summary: str,
    *,
    entity_type: EntityType | None = None,
    entity_id: UUID | None = None,
    meta: dict | None = None,
) -> None:
    """Append an event inside the caller's transaction, so the feed can't drift from reality."""
    db.add(
        ActivityEvent(
            user_id=user_id,
            type=type_,
            summary=summary[:500],
            entity_type=entity_type,
            entity_id=entity_id,
            meta=meta or {},
        )
    )
