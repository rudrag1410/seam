from collections.abc import AsyncIterator
from uuid import UUID

from fastapi import APIRouter, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import BrokerDep, DbDep, SettingsDep, UserDep
from app.api.sse import EventStreamResponse, frame
from app.core.config import Settings
from app.db.models import TailorSession
from app.schemas.stream import TailorEvents
from app.schemas.suggestion import SuggestionOut
from app.schemas.tailor import (
    DecisionsPatch,
    FinalizeOut,
    RegenerateIn,
    SessionListItem,
    TailorCreate,
    TailorCreated,
    TailorSessionOut,
)
from app.services import tailor_service
from app.services.events import TailorBroker

router = APIRouter(prefix="/tailor-sessions", tags=["tailor"])


async def _live(broker: TailorBroker, key: str, last: int) -> AsyncIterator[str]:
    """A run still in memory: replay what was missed, then follow it."""
    async for item in broker.subscribe(key, last):
        if item is None:
            yield ": heartbeat\n\n"
        else:
            event_id, event, data = item
            yield frame(event, data, event_id)


async def _replay(
    db: AsyncSession, settings: Settings, session: TailorSession, last: int
) -> AsyncIterator[str]:
    """A run no longer in memory: rebuild its events from what was saved."""
    async for event_id, event, data in tailor_service.replay_from_db(db, settings, session):
        if event_id > last:
            yield frame(event, data, event_id)


@router.post("", response_model=TailorCreated, status_code=202)
async def create(body: TailorCreate, request: Request, user: UserDep, db: DbDep) -> TailorCreated:
    session = await tailor_service.create_session(request, db, user, body)
    return TailorCreated(id=str(session.id))


@router.get("", response_model=list[SessionListItem])
async def list_all(user: UserDep, db: DbDep, limit: int = 20) -> list[SessionListItem]:
    return await tailor_service.list_sessions(db, user, min(limit, 50))


@router.get("/{session_id}", response_model=TailorSessionOut)
async def get_one(session_id: UUID, user: UserDep, db: DbDep, settings: SettingsDep) -> TailorSessionOut:
    session = await tailor_service.owned_session(db, user, session_id)
    return await tailor_service.session_out(db, user, settings, session)


@router.get(
    "/{session_id}/stream",
    response_class=EventStreamResponse,
    responses={
        200: {"model": TailorEvents, "description": "Server-sent events, one payload type per event name."}
    },
)
async def stream(
    session_id: UUID,
    user: UserDep,
    db: DbDep,
    settings: SettingsDep,
    broker: BrokerDep,
    last_event_id: str | None = Header(default=None),
) -> EventStreamResponse:
    session = await tailor_service.owned_session(db, user, session_id)
    key = str(session.id)
    last = int(last_event_id) if last_event_id and last_event_id.isdigit() else -1

    return EventStreamResponse(
        _live(broker, key, last) if broker.has(key) else _replay(db, settings, session, last),
        headers={"Connection": "keep-alive"},
    )


@router.patch("/{session_id}/suggestions", status_code=204)
async def patch_decisions(session_id: UUID, body: DecisionsPatch, user: UserDep, db: DbDep) -> None:
    session = await tailor_service.owned_session(db, user, session_id)
    await tailor_service.apply_decisions(db, session, body)
    await db.commit()


@router.post("/{session_id}/suggestions/{suggestion_id}/regenerate", response_model=SuggestionOut)
async def regenerate(
    session_id: UUID, suggestion_id: UUID, body: RegenerateIn, request: Request, user: UserDep, db: DbDep
) -> SuggestionOut:
    session = await tailor_service.owned_session(db, user, session_id)
    out = await tailor_service.regenerate(db, request, user, session, suggestion_id, body.instruction)
    await db.commit()
    return out


@router.post("/{session_id}/finalize", response_model=FinalizeOut)
async def finalize(session_id: UUID, request: Request, user: UserDep, db: DbDep) -> FinalizeOut:
    session = await tailor_service.owned_session(db, user, session_id)
    version = await tailor_service.finalize(db, request, user, session)
    await db.commit()
    return FinalizeOut(version_id=str(version.id))
