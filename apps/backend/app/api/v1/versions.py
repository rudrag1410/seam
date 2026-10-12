from collections.abc import AsyncIterator
from uuid import UUID

from fastapi import APIRouter, Query, Request
from fastapi.responses import RedirectResponse, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.gateway import AIGateway
from app.ai.pipelines.cover_letter import stream_cover_letter
from app.ai.pipelines.interview_prep import interview_prep
from app.api.deps import AIDep, DbDep, SettingsDep, StorageDep, UserDep
from app.api.sse import EventStreamResponse, frame
from app.core.config import Settings
from app.core.errors import AppError, ErrorCode
from app.db.models import CoverLetter, JobDescription, Profile, ResumeVersion, TailorSession, User
from app.schemas.enums import ActivityKind, EntityType, StreamEvent
from app.schemas.jd import JDAnalysis
from app.schemas.stream import LetterEvents
from app.schemas.version import (
    CoverLetterIn,
    CoverLetterOut,
    InterviewPrep,
    VersionCompare,
    VersionDetail,
    VersionOut,
)
from app.services import activity, version_service

router = APIRouter(prefix="/versions", tags=["versions"])


async def _analysis(db, version: ResumeVersion) -> JDAnalysis:
    session = await db.get(TailorSession, version.session_id) if version.session_id else None
    jd = await db.get(JobDescription, session.jd_id) if session else None
    if jd is None or jd.analysis is None:
        raise AppError(ErrorCode.NO_JD, "This version isn't linked to a job description.", status=409)
    return JDAnalysis.model_validate(jd.analysis)


@router.get("", response_model=list[VersionOut])
async def list_versions(user: UserDep, db: DbDep) -> list[VersionOut]:
    rows = (
        await db.scalars(
            select(ResumeVersion)
            .where(ResumeVersion.user_id == user.id)
            .order_by(ResumeVersion.created_at.desc())
        )
    ).all()
    return [version_service.version_out(r) for r in rows]


@router.get("/{a}/compare/{b}", response_model=VersionCompare)
async def compare(a: UUID, b: UUID, user: UserDep, db: DbDep) -> VersionCompare:
    return await version_service.compare(db, user, a, b)


@router.get("/{version_id}", response_model=VersionDetail)
async def get_one(version_id: UUID, user: UserDep, db: DbDep) -> VersionDetail:
    return await version_service.version_detail(db, await version_service.owned_version(db, user, version_id))


@router.get("/{version_id}/export")
async def export(
    version_id: UUID,
    user: UserDep,
    db: DbDep,
    storage: StorageDep,
    settings: SettingsDep,
    format: str = Query("pdf"),
    template: str = Query("classic"),
):
    version = await version_service.owned_version(db, user, version_id)
    key, data, content_type, filename, _ = await version_service.render_export(
        db, storage, user, version, format, template
    )
    await db.commit()
    if url := storage.presign(key, filename, settings.signed_url_ttl_seconds):
        return RedirectResponse(url, status_code=307)
    body = data if data is not None else await storage.get(key)
    return Response(
        body, media_type=content_type, headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/{version_id}/cover-letters", response_model=list[CoverLetterOut])
async def list_cover_letters(version_id: UUID, user: UserDep, db: DbDep) -> list[CoverLetterOut]:
    await version_service.owned_version(db, user, version_id)
    rows = (
        await db.scalars(
            select(CoverLetter)
            .where(CoverLetter.version_id == version_id)
            .order_by(CoverLetter.created_at.desc())
        )
    ).all()
    return [
        CoverLetterOut(
            id=str(r.id),
            version_id=str(r.version_id),
            tone=r.tone,
            length=r.length,
            body=r.body,
            created_at=r.created_at,
        )
        for r in rows
    ]


async def _cover_letter_events(
    db: AsyncSession,
    ai: AIGateway,
    settings: Settings,
    user: User,
    version: ResumeVersion,
    analysis: JDAnalysis,
    body: CoverLetterIn,
    notice: int | None,
) -> AsyncIterator[str]:
    """Streams the letter as it is written, then saves it and says so."""
    parts: list[str] = []
    try:
        async for chunk in stream_cover_letter(
            ai,
            settings,
            document=version.document,
            jd=analysis,
            tone=body.tone,
            length=body.length,
            notice_period_days=notice,
        ):
            parts.append(chunk)
            yield frame(StreamEvent.CHUNK, {"text": chunk})
    except AppError as exc:
        yield frame(StreamEvent.ERROR, exc.payload()["error"])
        return
    letter = CoverLetter(version_id=version.id, tone=body.tone, length=body.length, body="".join(parts))
    db.add(letter)
    await db.flush()
    activity.record(
        db,
        user.id,
        ActivityKind.COVER_LETTER_GENERATED,
        f"Generated cover letter for {version.label}",
        entity_type=EntityType.VERSION,
        entity_id=version.id,
    )
    await db.commit()
    yield frame(StreamEvent.DONE, {"id": str(letter.id)})


@router.post(
    "/{version_id}/cover-letter",
    response_class=EventStreamResponse,
    responses={
        200: {"model": LetterEvents, "description": "Server-sent events, one payload type per event name."}
    },
)
async def cover_letter(
    version_id: UUID,
    body: CoverLetterIn,
    request: Request,
    user: UserDep,
    db: DbDep,
    ai: AIDep,
    settings: SettingsDep,
) -> EventStreamResponse:
    version = await version_service.owned_version(db, user, version_id)
    analysis = await _analysis(db, version)
    profile = await db.get(Profile, user.id)
    notice = profile.notice_period_days if body.include_notice_period and profile else None

    return EventStreamResponse(_cover_letter_events(db, ai, settings, user, version, analysis, body, notice))


@router.post("/{version_id}/interview-prep", response_model=InterviewPrep)
async def prep(version_id: UUID, user: UserDep, db: DbDep, ai: AIDep, settings: SettingsDep) -> InterviewPrep:
    version = await version_service.owned_version(db, user, version_id)
    return await interview_prep(ai, settings, version.document, await _analysis(db, version))
