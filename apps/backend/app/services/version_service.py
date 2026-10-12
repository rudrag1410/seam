from enum import StrEnum
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.scoring.ats import compute_ats
from app.core.errors import AppError, ErrorCode, not_found
from app.db.models import JobDescription, ResumeVersion, TailorSession, User
from app.export.docx import render_docx
from app.export.pdf import render_pdf
from app.export.txt import render_txt
from app.schemas.enums import ActivityKind, ChangeKind, EntityType, ExportFormat, ExportTemplate, SectionType
from app.schemas.jd import JDAnalysis
from app.schemas.resume_ast import Resume
from app.schemas.version import (
    NodeChange,
    VersionCompare,
    VersionDetail,
    VersionOut,
)
from app.services import activity
from app.storage.base import Storage
from app.storage.keys import export_key

FORMATS = {
    ExportFormat.PDF: ("application/pdf", "pdf"),
    ExportFormat.DOCX: ("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"),
    ExportFormat.TXT: ("text/plain; charset=utf-8", "txt"),
}


def _choice[E: StrEnum](options: type[E], value: str) -> E | None:
    """The member for a value the client sent, or None when it isn't one of them."""
    try:
        return options(value)
    except ValueError:
        return None


async def owned_version(db: AsyncSession, user: User, version_id: UUID) -> ResumeVersion:
    row = await db.get(ResumeVersion, version_id)
    if row is None or row.user_id != user.id:
        raise not_found("Version")
    return row


def version_out(v: ResumeVersion) -> VersionOut:
    return VersionOut(
        id=str(v.id),
        label=v.label,
        parent_version_id=str(v.parent_version_id) if v.parent_version_id else None,
        session_id=str(v.session_id) if v.session_id else None,
        jd_title=v.jd_title,
        jd_company=v.jd_company,
        match_score=v.match_score,
        ats_score=v.ats_score,
        created_at=v.created_at,
    )


async def _jd_keywords(db: AsyncSession, v: ResumeVersion) -> list[str]:
    if not v.session_id:
        return []
    session = await db.get(TailorSession, v.session_id)
    jd = await db.get(JobDescription, session.jd_id) if session else None
    return JDAnalysis.model_validate(jd.analysis).keywords if jd and jd.analysis else []


async def version_detail(db: AsyncSession, v: ResumeVersion) -> VersionDetail:
    ats = compute_ats(v.document, await _jd_keywords(db, v))
    return VersionDetail(**version_out(v).model_dump(), document=Resume.model_validate(v.document), ats=ats)


def _flatten(doc: dict) -> dict[str, tuple[str, str, str, int]]:
    """node id -> (section, text, parent id, index)."""
    nodes: dict[str, tuple[str, str, str, int]] = {}
    for s in doc["sections"]:
        if s["type"] == SectionType.SUMMARY:
            nodes[s["id"]] = ("summary", s["text"], s["id"], 0)
        for g in s.get("groups", []):
            nodes[g["id"]] = ("skills", ", ".join(g["items"]), s["id"], 0)
        for it in s.get("items", []):
            for i, b in enumerate(it.get("bullets", [])):
                nodes[b["id"]] = (s["type"], b["text"], it["id"], i)
    return nodes


def diff_documents(a: dict, b: dict) -> list[NodeChange]:
    na, nb = _flatten(a), _flatten(b)
    changes: list[NodeChange] = []
    for node_id, (section, text, parent, idx) in nb.items():
        if node_id not in na:
            changes.append(NodeChange(node_id=node_id, kind=ChangeKind.ADDED, section=section, after=text))
            continue
        _, old_text, _, old_idx = na[node_id]
        if old_text != text:
            changes.append(
                NodeChange(
                    node_id=node_id, kind=ChangeKind.CHANGED, section=section, before=old_text, after=text
                )
            )
        elif old_idx != idx and na[node_id][2] == parent:
            changes.append(NodeChange(node_id=node_id, kind=ChangeKind.MOVED, section=section, after=text))
    for node_id, (section, text, _, _) in na.items():
        if node_id not in nb:
            changes.append(NodeChange(node_id=node_id, kind=ChangeKind.REMOVED, section=section, before=text))
    return changes


def _delta(x: float | None, y: float | None) -> float | None:
    return round(y - x, 1) if x is not None and y is not None else None


async def compare(db: AsyncSession, user: User, a_id: UUID, b_id: UUID) -> VersionCompare:
    a, b = await owned_version(db, user, a_id), await owned_version(db, user, b_id)
    da, dbb = await version_detail(db, a), await version_detail(db, b)

    return VersionCompare(
        a=da,
        b=dbb,
        changes=diff_documents(a.document, b.document),
        match_delta=_delta(a.match_score, b.match_score),
        ats_delta=_delta(a.ats_score, b.ats_score),
    )


async def render_export(
    db: AsyncSession,
    storage: Storage,
    user: User,
    version: ResumeVersion,
    requested_format: str,
    requested_template: str,
) -> tuple[str, bytes | None, str, str, str]:
    """Returns (storage_key, bytes_or_None, content_type, filename, ext). Cached in storage."""
    fmt = _choice(ExportFormat, requested_format)
    template = _choice(ExportTemplate, requested_template)
    if fmt is None:
        raise AppError(ErrorCode.FORMAT_UNSUPPORTED, "Choose pdf, docx or txt.")
    if template is None:
        raise AppError(ErrorCode.TEMPLATE_UNSUPPORTED, "Choose the classic or modern template.")
    content_type, ext = FORMATS[fmt]
    key = export_key(user.id, version.id, template, ext)
    name = (version.document["contact"].get("name") or "resume").strip().replace(" ", "_")
    filename = f"{name}_{version.jd_company or 'tailored'}.{ext}".replace("/", "-")

    data: bytes | None = None
    if not await storage.exists(key):
        try:
            if fmt is ExportFormat.PDF:
                data = render_pdf(version.document, template)
            elif fmt is ExportFormat.DOCX:
                data = render_docx(version.document, template)
            else:
                data = render_txt(version.document)
        except Exception as exc:
            raise AppError(
                ErrorCode.EXPORT_FAILED,
                f"{fmt.value.upper()} export failed.",
                status=500,
                hint="The other formats should still work.",
                retryable=True,
            ) from exc
        await storage.put(key, data, content_type)
        activity.record(
            db,
            user.id,
            ActivityKind.VERSION_EXPORTED,
            f"Exported {fmt.value.upper()} ({template.value.title()})",
            entity_type=EntityType.VERSION,
            entity_id=version.id,
        )
    return key, data, content_type, filename, ext
