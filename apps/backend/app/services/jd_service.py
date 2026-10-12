import asyncio
import hashlib
import html
import ipaddress
import re
import socket
from urllib.parse import urlparse
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.gateway import AIGateway
from app.ai.guards.injection import sanitize
from app.ai.pipelines.analyze_jd import analyze_jd, check_jd_length
from app.ai.scoring.experience import estimate_years
from app.ai.scoring.fit import compute_fit
from app.core.config import Settings
from app.core.crypto import decrypt
from app.core.errors import AppError, not_found
from app.db.models import JobDescription, JobPreferences, MasterResume, Profile, User
from app.schemas.jd import FitCheck, JDAnalysis, JDAnalyzeResponse
from app.services import activity

_MAX_BYTES = 2 * 1024 * 1024


def _check_public(host: str) -> None:
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as exc:
        raise AppError("URL_UNREACHABLE", "We couldn't reach that URL.") from exc
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            raise AppError("URL_BLOCKED", "That URL points to a private address.", status=400)


def _html_to_text(raw: str) -> str:
    raw = re.sub(r"(?is)<(script|style|noscript|svg|nav|footer|header)\b.*?</\1>", " ", raw)
    raw = re.sub(r"(?i)<br\s*/?>|</(p|div|li|h[1-6]|tr)>", "\n", raw)
    text = html.unescape(re.sub(r"<[^>]+>", " ", raw))
    return re.sub(r"[ \t]+", " ", re.sub(r"\n\s*\n+", "\n\n", text)).strip()


async def fetch_url_text(url: str) -> str:
    """Server-side fetch with SSRF protection: http(s) only, public IPs only, 5s, 2 MB."""
    current = url
    async with httpx.AsyncClient(timeout=5.0, follow_redirects=False) as client:
        for _ in range(4):
            parsed = urlparse(current)
            if parsed.scheme not in ("http", "https") or not parsed.hostname:
                raise AppError("URL_INVALID", "Enter a full http(s) link to the job posting.")
            await asyncio.to_thread(_check_public, parsed.hostname)
            try:
                async with client.stream("GET", current, headers={"User-Agent": "SeamBot/1.0"}) as resp:
                    if resp.is_redirect and (loc := resp.headers.get("location")):
                        current = str(httpx.URL(current).join(loc))
                        continue
                    if resp.status_code >= 400:
                        raise AppError(
                            "URL_UNREACHABLE", f"That page returned an error ({resp.status_code})."
                        )
                    body = b""
                    async for chunk in resp.aiter_bytes():
                        body += chunk
                        if len(body) > _MAX_BYTES:
                            break
                    return _html_to_text(body[:_MAX_BYTES].decode(resp.encoding or "utf-8", "ignore"))
            except httpx.HTTPError as exc:
                raise AppError(
                    "URL_UNREACHABLE", "We couldn't load that page. Paste the text instead."
                ) from exc
    raise AppError("URL_UNREACHABLE", "That link redirected too many times.")


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


async def ensure_jd(
    db: AsyncSession, settings: Settings, user: User, text: str | None, url: str | None
) -> JobDescription:
    """Find or create the job description row for this text, without analysing it.
    Length is validated here, synchronously, so bad input fails before any work starts."""
    if not text and not url:
        raise AppError("JD_EMPTY", "Paste the job description to continue.")
    source_url = None
    if not text:
        source_url = url
        text = await fetch_url_text(url)  # type: ignore[arg-type]
    text = sanitize(text)
    check_jd_length(text, settings)

    sha = hashlib.sha256(re.sub(r"\s+", " ", text).lower().encode()).hexdigest()
    row = await db.scalar(
        select(JobDescription).where(JobDescription.user_id == user.id, JobDescription.sha256 == sha)
    )
    if row is None:
        row = JobDescription(user_id=user.id, raw_text=text, sha256=sha, source_url=source_url)
        db.add(row)
        await db.flush()
    return row


async def analyze_row(
    db: AsyncSession, ai: AIGateway, settings: Settings, user: User, row: JobDescription
) -> tuple[JDAnalysis, list[str], bool]:
    """Analyse a job description row (cached on the row). Returns (analysis, warnings, degraded)."""
    if row.analysis:
        return JDAnalysis.model_validate(row.analysis), [], False
    result = await analyze_jd(ai, settings, row.raw_text)
    analysis = result.analysis
    row.raw_text = result.text  # injected lines, if any, are stripped
    row.analysis = analysis.model_dump()
    row.title = analysis.title or None
    row.company = analysis.company or None
    label = " · ".join(x for x in [analysis.title, analysis.company] if x) or "job description"
    activity.record(db, user.id, "jd.analyzed", f"Analyzed {label}", entity_type="jd", entity_id=row.id)
    return analysis, result.warnings, result.degraded


async def analyze(
    db: AsyncSession,
    ai: AIGateway,
    settings: Settings,
    user: User,
    text: str | None,
    url: str | None,
) -> JDAnalyzeResponse:
    row = await ensure_jd(db, settings, user, text, url)
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
