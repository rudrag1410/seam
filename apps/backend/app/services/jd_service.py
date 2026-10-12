import hashlib
import re
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.gateway import AIGateway
from app.ai.guards.injection import sanitize
from app.ai.pipelines.analyze_jd import analyze_jd, check_jd_length
from app.ai.scoring.experience import estimate_years
from app.ai.scoring.fit import compute_fit
from app.core.config import Settings
from app.core.crypto import decrypt
from app.core.errors import AppError, ErrorCode, not_found
from app.db.models import JobDescription, JobPreferences, MasterResume, Profile, User
from app.schemas.enums import ActivityKind, EntityType
from app.schemas.jd import FitCheck, JDAnalysis, JDAnalyzeResponse
from app.services import activity


async def build_fit(db: AsyncSession, user: User, settings: Settings, analysis: JDAnalysis) -> FitCheck:
    profile = await db.get(Profile, user.id)
    prefs = await db.get(JobPreferences, user.id)
    master = await db.scalar(
        select(MasterResume).where(MasterResume.user_id == user.id, MasterResume.is_primary.is_(True))
    )
    expected = decrypt(profile.expected_ctc_enc, settings) if profile else None
    years = (
        profile.years_experience
        if profile and profile.years_experience
        else (estimate_years(master.document) if master else None)
    )
    return compute_fit(
        analysis,
        {c.name: getattr(prefs, c.name) for c in JobPreferences.__table__.columns} if prefs else {},
        expected_ctc=float(expected) if expected else None,
        ctc_currency=profile.ctc_currency if profile else "INR",
        years=years,
        low_confidence=settings.jev_confidence_low,
    )


async def ensure_jd(db: AsyncSession, settings: Settings, user: User, text: str | None) -> JobDescription:
    if not text:
        raise AppError(ErrorCode.JD_EMPTY, "Paste the job description to continue.")
    text = sanitize(text)
    check_jd_length(text, settings)

    sha = hashlib.sha256(re.sub(r"\s+", " ", text).lower().encode()).hexdigest()
    row = await db.scalar(
        select(JobDescription).where(JobDescription.user_id == user.id, JobDescription.sha256 == sha)
    )
    if row is None:
        row = JobDescription(user_id=user.id, raw_text=text, sha256=sha)
        db.add(row)
        await db.flush()
    return row


async def analyze_row(
    db: AsyncSession, ai: AIGateway, settings: Settings, user: User, row: JobDescription
) -> tuple[JDAnalysis, list[str], bool]:
    if row.analysis:
        return JDAnalysis.model_validate(row.analysis), [], False
    result = await analyze_jd(ai, settings, row.raw_text)
    analysis = result.analysis
    row.raw_text = result.text
    row.analysis = analysis.model_dump()
    row.title = analysis.title or None
    row.company = analysis.company or None
    label = " · ".join(x for x in [analysis.title, analysis.company] if x) or "job description"
    activity.record(
        db,
        user.id,
        ActivityKind.JD_ANALYZED,
        f"Analyzed {label}",
        entity_type=EntityType.JD,
        entity_id=row.id,
    )
    return analysis, result.warnings, result.degraded


async def analyze(
    db: AsyncSession,
    ai: AIGateway,
    settings: Settings,
    user: User,
    text: str | None,
) -> JDAnalyzeResponse:
    row = await ensure_jd(db, settings, user, text)
    analysis, warnings, degraded = await analyze_row(db, ai, settings, user, row)
    return JDAnalyzeResponse(
        id=str(row.id),
        title=analysis.title,
        company=analysis.company,
        analysis=analysis,
        fit=await build_fit(db, user, settings, analysis),
        warnings=warnings,
        degraded=degraded,
    )


async def get_jd(db: AsyncSession, user: User, jd_id: UUID) -> JobDescription:
    row = await db.get(JobDescription, jd_id)
    if row is None or row.user_id != user.id:
        raise not_found("Job description")
    return row
