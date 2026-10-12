import asyncio
import logging
import time
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from uuid import UUID

from fastapi import Request
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.ops.apply_ops import apply_ops
from app.ai.pipelines.tailor import TailorInputs, regenerate_one, run_tailor, score_document
from app.ai.scoring.ats import compute_ats
from app.core.config import Settings
from app.core.errors import AppError, ErrorCode, not_found
from app.db.models import (
    ActivityEvent,
    JobDescription,
    MasterResume,
    ResumeVersion,
    Suggestion,
    TailorSession,
    User,
)
from app.schemas.enums import (
    KEPT_DECISIONS,
    REVIEWABLE_STATUSES,
    ActivityKind,
    Decision,
    EntityType,
    SectionName,
    SessionStatus,
    Stage,
    StreamEvent,
    WarningCode,
)
from app.schemas.jd import FitCheck, JDAnalysis
from app.schemas.resume_ast import Resume
from app.schemas.scores import MatchScore
from app.schemas.suggestion import SuggestionOut
from app.schemas.tailor import (
    DecisionsPatch,
    SessionListItem,
    TailorCreate,
    TailorSessionOut,
)
from app.services import activity, jd_service
from app.services.events import TailorBroker

log = logging.getLogger("seam.tailor")
_background: set[asyncio.Task] = set()


def suggestion_out(s: Suggestion) -> SuggestionOut:
    return SuggestionOut.model_validate(
        {
            "id": str(s.id),
            "seq": s.seq,
            "section": s.section,
            "op": s.op,
            "target": s.target,
            "payload": s.payload,
            "before": s.before,
            "rationale": s.rationale,
            "addresses": s.addresses,
            "evidence": s.evidence,
            "confidence": s.confidence,
            "requires_confirmation": s.requires_confirmation,
            "flag_reason": s.flag_reason,
            "score_delta": s.score_delta,
            "checks": s.checks,
            "status": s.status,
            "edited_text": s.edited_text,
        }
    )


async def owned_session(db: AsyncSession, user: User, session_id: UUID) -> TailorSession:
    row = await db.get(TailorSession, session_id)
    if row is None or row.user_id != user.id:
        raise not_found("Tailor session")
    return row


async def base_document(db: AsyncSession, session: TailorSession) -> dict:
    if session.base_version_id:
        version = await db.get(ResumeVersion, session.base_version_id)
        if version:
            return version.document
    master = await db.get(MasterResume, session.master_resume_id)
    assert master is not None
    return master.document


async def create_session(request: Request, db: AsyncSession, user: User, body: TailorCreate) -> TailorSession:
    settings: Settings = request.app.state.settings
    master = await db.get(MasterResume, UUID(body.resume_id))
    if master is None or master.user_id != user.id:
        raise not_found("Resume")
    if body.jd_id:
        jd = await jd_service.get_jd(db, user, UUID(body.jd_id))
    else:
        jd = await jd_service.ensure_jd(db, settings, user, body.jd_text, body.jd_url)
    base_version_id = None
    if body.base_version_id:
        version = await db.get(ResumeVersion, UUID(body.base_version_id))
        if version is None or version.user_id != user.id:
            raise not_found("Version")
        base_version_id = version.id

    session = TailorSession(
        user_id=user.id,
        master_resume_id=master.id,
        base_version_id=base_version_id,
        jd_id=jd.id,
        sections=list(body.sections),
        intensity=body.intensity,
        status=SessionStatus.QUEUED,
        prompt_version=settings.prompt_version,
    )
    db.add(session)
    await db.commit()

    broker: TailorBroker = request.app.state.broker
    broker.open(str(session.id))
    task = asyncio.create_task(_run(request.app, session.id))
    _background.add(task)
    task.add_done_callback(_background.discard)
    return session


async def _run(app, session_id: UUID) -> None:
    broker: TailorBroker = app.state.broker
    settings: Settings = app.state.settings
    key = str(session_id)
    started = time.perf_counter()
    seq = 0
    async with app.state.sessionmaker() as db:
        session = await db.get(TailorSession, session_id)
        assert session is not None
        try:
            jd = await db.get(JobDescription, session.jd_id)
            user = await db.get(User, session.user_id)
            assert jd is not None and user is not None
            session.status = SessionStatus.RUNNING
            await db.commit()

            await broker.publish(key, StreamEvent.STAGE, {"stage": Stage.READING, "progress": 0.02})
            analysis, warnings, jd_degraded = await jd_service.analyze_row(
                db, app.state.ai, settings, user, jd
            )
            await db.commit()
            fit = await jd_service.build_fit(db, user, settings, analysis)
            await broker.publish(key, StreamEvent.JD, jd_event(jd, analysis, fit))
            for w in warnings:
                await broker.publish(key, StreamEvent.WARNING, {"code": WarningCode.JD_NOTICE, "message": w})

            inp = TailorInputs(
                resume=await base_document(db, session),
                jd=analysis,
                sections=session.sections,
                intensity=session.intensity,
            )

            async for ev in run_tailor(app.state.ai, settings, inp):
                name, data = ev["event"], ev["data"]
                if name == StreamEvent.SUGGESTION:
                    seq += 1
                    row = Suggestion(
                        session_id=session.id,
                        seq=seq,
                        section=data["section"],
                        op=data["op"],
                        target=data["target"],
                        payload=data["payload"],
                        before=data["before"],
                        rationale=data["rationale"],
                        addresses=data["addresses"],
                        evidence=data["evidence"],
                        confidence=data["confidence"],
                        requires_confirmation=data["requires_confirmation"],
                        flag_reason=data["flag_reason"],
                        score_delta=data["score_delta"],
                        checks=data["checks"],
                    )
                    db.add(row)
                    await db.flush()
                    data = suggestion_out(row).model_dump()
                    await db.commit()
                elif name == StreamEvent.SCORE:
                    session.score_before = data.get("before")
                    if "projected" in data:
                        session.score_after = data["projected"]
                    await db.commit()
                elif name == StreamEvent.DONE:
                    session.degraded = bool(data.get("degraded")) or jd_degraded
                    session.status = SessionStatus.READY
                    session.completed_at = datetime.now(UTC)
                    session.duration_ms = int((time.perf_counter() - started) * 1000)
                    data = {**data, "duration_ms": session.duration_ms}
                    label = " · ".join(x for x in [jd.title, jd.company] if x) or "your resume"
                    activity.record(
                        db,
                        session.user_id,
                        ActivityKind.TAILOR_COMPLETED,
                        f"{data['count']} suggestions ready for {label}",
                        entity_type=EntityType.SESSION,
                        entity_id=session.id,
                    )
                    await db.commit()
                await broker.publish(key, name, data)
        except AppError as exc:
            await _fail(db, broker, session, exc)
        except Exception:
            log.exception("tailor session %s crashed", session_id)
            await _fail(
                db,
                broker,
                session,
                AppError(
                    ErrorCode.TAILOR_FAILED,
                    "Something went wrong while generating suggestions.",
                    status=500,
                    hint="Your inputs are saved. Try again.",
                    retryable=True,
                ),
            )
        finally:
            await broker.finish(key)


def jd_event(jd: JobDescription, analysis: JDAnalysis, fit: FitCheck) -> dict:
    return {
        "title": analysis.title or jd.title,
        "company": analysis.company or jd.company,
        "analysis": analysis.model_dump(),
        "fit": fit.model_dump(),
    }


async def _fail(db: AsyncSession, broker: TailorBroker, session: TailorSession, exc: AppError) -> None:
    session.status = SessionStatus.FAILED
    session.error_code, session.error_message = exc.code, exc.message
    await db.commit()
    await broker.publish(str(session.id), StreamEvent.ERROR, exc.payload()["error"])


async def replay_from_db(
    db: AsyncSession, settings: Settings, session: TailorSession
) -> AsyncIterator[tuple[int, StreamEvent, dict]]:
    n = 0
    jd = await db.get(JobDescription, session.jd_id)
    user = await db.get(User, session.user_id)
    if jd is not None and jd.analysis and user is not None:
        analysis = JDAnalysis.model_validate(jd.analysis)
        fit = await jd_service.build_fit(db, user, settings, analysis)
        yield n, StreamEvent.JD, jd_event(jd, analysis, fit)
        n += 1
    if session.score_before:
        yield (
            n,
            StreamEvent.SCORE,
            {
                "before": session.score_before,
                **({"projected": session.score_after} if session.score_after else {}),
            },
        )
        n += 1
    rows = (
        await db.scalars(
            select(Suggestion).where(Suggestion.session_id == session.id).order_by(Suggestion.seq)
        )
    ).all()
    for row in rows:
        yield n, StreamEvent.SUGGESTION, suggestion_out(row).model_dump()
        n += 1
    if session.status == SessionStatus.FAILED:
        yield (
            n,
            StreamEvent.ERROR,
            {"code": session.error_code, "message": session.error_message, "retryable": True},
        )
    else:
        yield (
            n,
            StreamEvent.DONE,
            {"count": len(rows), "degraded": session.degraded, "duration_ms": session.duration_ms},
        )


async def session_out(
    db: AsyncSession, user: User, settings: Settings, session: TailorSession
) -> TailorSessionOut:
    jd = await db.get(JobDescription, session.jd_id)
    assert jd is not None
    analysis = JDAnalysis.model_validate(jd.analysis) if jd.analysis else None
    rows = (
        await db.scalars(
            select(Suggestion).where(Suggestion.session_id == session.id).order_by(Suggestion.seq)
        )
    ).all()
    version_id = await db.scalar(select(ResumeVersion.id).where(ResumeVersion.session_id == session.id))
    return TailorSessionOut(
        id=str(session.id),
        status=session.status,
        intensity=session.intensity,
        sections=session.sections,
        degraded=session.degraded,
        error_code=session.error_code,
        error_message=session.error_message,
        resume_id=str(session.master_resume_id),
        jd_id=str(jd.id),
        jd_title=jd.title,
        jd_company=jd.company,
        jd_text=jd.raw_text,
        jd_url=jd.source_url,
        jd=analysis,
        fit=await jd_service.build_fit(db, user, settings, analysis) if analysis else None,
        resume=Resume.model_validate(await base_document(db, session)),
        suggestions=[suggestion_out(r) for r in rows],
        score_before=MatchScore.model_validate(session.score_before) if session.score_before else None,
        score_after=MatchScore.model_validate(session.score_after) if session.score_after else None,
        version_id=str(version_id) if version_id else None,
        created_at=session.created_at,
    )


async def list_sessions(db: AsyncSession, user: User, limit: int = 20) -> list[SessionListItem]:
    sessions = (
        await db.scalars(
            select(TailorSession)
            .where(TailorSession.user_id == user.id)
            .order_by(TailorSession.created_at.desc())
            .limit(limit)
        )
    ).all()
    out: list[SessionListItem] = []
    for s in sessions:
        jd = await db.get(JobDescription, s.jd_id)
        total = (
            await db.scalar(select(func.count()).select_from(Suggestion).where(Suggestion.session_id == s.id))
            or 0
        )
        decided = (
            await db.scalar(
                select(func.count())
                .select_from(Suggestion)
                .where(Suggestion.session_id == s.id, Suggestion.status != Decision.PENDING)
            )
            or 0
        )
        out.append(
            SessionListItem(
                id=str(s.id),
                status=s.status,
                jd_title=jd.title if jd else None,
                jd_company=jd.company if jd else None,
                suggestion_count=total,
                decided_count=decided,
                match_before=(s.score_before or {}).get("total"),
                match_after=(s.score_after or {}).get("total"),
                created_at=s.created_at,
            )
        )
    return out


async def delete_session(db: AsyncSession, session: TailorSession) -> None:
    if session.status in (SessionStatus.QUEUED, SessionStatus.RUNNING):
        raise AppError(
            ErrorCode.SESSION_NOT_READY, "Wait for this run to finish before deleting it.", status=409
        )
    await db.execute(delete(Suggestion).where(Suggestion.session_id == session.id))
    await db.execute(
        update(ResumeVersion).where(ResumeVersion.session_id == session.id).values(session_id=None)
    )
    await db.execute(delete(ActivityEvent).where(ActivityEvent.entity_id == session.id))
    await db.delete(session)


async def apply_decisions(db: AsyncSession, session: TailorSession, body: DecisionsPatch) -> None:
    ids = {UUID(d.id): d for d in body.decisions}
    rows = (
        await db.scalars(
            select(Suggestion).where(Suggestion.session_id == session.id, Suggestion.id.in_(ids.keys()))
        )
    ).all()
    now = datetime.now(UTC)
    for row in rows:
        d = ids[row.id]
        row.status = d.status
        row.edited_text = d.edited_text if d.status == Decision.EDITED else None
        row.decided_at = None if d.status == Decision.PENDING else now


async def regenerate(
    db: AsyncSession,
    request: Request,
    user: User,
    session: TailorSession,
    suggestion_id: UUID,
    instruction: str,
) -> SuggestionOut:
    settings: Settings = request.app.state.settings
    row = await db.get(Suggestion, suggestion_id)
    if row is None or row.session_id != session.id:
        raise not_found("Suggestion")
    jd = await db.get(JobDescription, session.jd_id)
    assert jd is not None and jd.analysis is not None
    inp = TailorInputs(
        resume=await base_document(db, session),
        jd=JDAnalysis.model_validate(jd.analysis),
        sections=[SectionName(row.section)],
        intensity=session.intensity,
    )
    new = await regenerate_one(
        request.app.state.ai, settings, inp, row.target, SectionName(row.section), instruction
    )
    row.op, row.payload, row.before = new["op"], new["payload"], new["before"]
    row.rationale, row.addresses, row.evidence = new["rationale"], new["addresses"], new["evidence"]
    row.confidence, row.score_delta, row.checks = new["confidence"], new["score_delta"], new["checks"]
    row.requires_confirmation, row.flag_reason = new["requires_confirmation"], new["flag_reason"]
    row.status, row.edited_text, row.decided_at = Decision.PENDING, None, None
    return suggestion_out(row)


async def finalize(db: AsyncSession, request: Request, user: User, session: TailorSession) -> ResumeVersion:
    if session.status not in REVIEWABLE_STATUSES:
        raise AppError(ErrorCode.SESSION_NOT_READY, "Suggestions are still being generated.", status=409)
    existing = await db.scalar(select(ResumeVersion).where(ResumeVersion.session_id == session.id))
    if existing is not None:
        return existing
    settings: Settings = request.app.state.settings
    rows = (
        await db.scalars(
            select(Suggestion).where(Suggestion.session_id == session.id).order_by(Suggestion.seq)
        )
    ).all()
    accepted = [r for r in rows if r.status in KEPT_DECISIONS]
    ops = [
        {"op": r.op, "target": r.target, "payload": r.payload, "edited_text": r.edited_text} for r in accepted
    ]

    base = await base_document(db, session)
    document = apply_ops(base, ops)
    jd = await db.get(JobDescription, session.jd_id)
    assert jd is not None and jd.analysis is not None
    analysis = JDAnalysis.model_validate(jd.analysis)
    match, _ = await score_document(request.app.state.ai, settings, document, analysis)
    ats = compute_ats(document, analysis.keywords)

    n = (
        await db.scalar(
            select(func.count()).select_from(ResumeVersion).where(ResumeVersion.user_id == user.id)
        )
        or 0
    ) + 1
    label = " · ".join(x for x in [jd.company, jd.title] if x) or "Tailored resume"
    version = ResumeVersion(
        user_id=user.id,
        session_id=session.id,
        parent_version_id=session.base_version_id,
        label=f"{label} · v{n}",
        document=document,
        jd_title=jd.title,
        jd_company=jd.company,
        match_score=match.total,
        ats_score=ats.total,
    )
    db.add(version)
    await db.flush()
    before = (session.score_before or {}).get("total")
    delta = f" · Match {before:.0f} → {match.total:.0f}" if before is not None else ""
    activity.record(
        db,
        user.id,
        ActivityKind.REVIEW_FINALIZED,
        f"Accepted {len(accepted)} of {len(rows)} edits{delta}",
        entity_type=EntityType.VERSION,
        entity_id=version.id,
    )
    session.status = SessionStatus.FINALIZED
    session.score_after = match.model_dump()
    return version
