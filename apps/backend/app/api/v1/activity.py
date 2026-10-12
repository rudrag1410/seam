from fastapi import APIRouter, Query
from sqlalchemy import select

from app.api.deps import DbDep, UserDep
from app.db.models import ActivityEvent
from app.schemas.common import ActivityOut, ActivityPage

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("", response_model=ActivityPage)
async def feed(
    user: UserDep,
    db: DbDep,
    cursor: int | None = None,
    type: str | None = None,
    limit: int = Query(20, ge=1, le=100),
) -> ActivityPage:
    q = select(ActivityEvent).where(ActivityEvent.user_id == user.id).order_by(ActivityEvent.id.desc())
    if cursor:
        q = q.where(ActivityEvent.id < cursor)
    if type:
        q = q.where(ActivityEvent.type.like(f"{type}%"))
    rows = (await db.scalars(q.limit(limit + 1))).all()
    page, more = rows[:limit], len(rows) > limit
    return ActivityPage(
        items=[
            ActivityOut(
                id=r.id,
                type=r.type,
                entity_type=r.entity_type,
                entity_id=str(r.entity_id) if r.entity_id else None,
                summary=r.summary,
                created_at=r.created_at,
            )
            for r in page
        ],
        next_cursor=page[-1].id if more and page else None,
    )
