import hashlib
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.gateway import AIGateway
from app.ai.pipelines.parse_resume import parse_resume
from app.ai.scoring.experience import estimate_years
from app.core.config import Settings
from app.core.errors import not_found
from app.db.models import MasterResume, SourceFile, User
from app.parsing.validate import validate_upload
from app.schemas.enums import ActivityKind, EntityType
from app.schemas.resume import ResumeOut
from app.schemas.resume_ast import ExperienceSection, Resume
from app.services import activity
from app.storage.base import Storage
from app.storage.keys import upload_key


def _prefill(resume: Resume) -> dict[str, str | float | None]:
    c = resume.contact
    exp = next((s for s in resume.sections if isinstance(s, ExperienceSection)), None)
    first = exp.items[0] if exp and exp.items else None
    years = round(estimate_years(resume.model_dump()) * 2) / 2  # nearest half year
    links = {
        "linkedin": next((x for x in c.links if "linkedin" in x.lower()), None),
        "github": next((x for x in c.links if "github" in x.lower()), None),
    }
    return {
        "full_name": c.name or None,
        "headline": c.headline,
        "email": c.email,
        "phone": c.phone,
        "location": c.location,
        "current_title": first.title.split(" | ")[0].strip()
        if first and first.title
        else None,  # "A | B" lists two titles; use the first
        "current_company": first.company if first else None,
        "years_experience": years if years else None,
        **links,
    }


def to_out(master: MasterResume, source: SourceFile | None) -> ResumeOut:
    document = Resume.model_validate(master.document)
    return ResumeOut(
        id=str(master.id),
        filename=source.filename if source else None,
        size_bytes=source.size_bytes if source else None,
        page_count=source.page_count if source else None,
        parse_path=source.parse_path if source else None,
        document=document,
        created_at=master.created_at,
        prefill=_prefill(document),
    )


async def upload_resume(
    db: AsyncSession,
    ai: AIGateway,
    storage: Storage,
    settings: Settings,
    user: User,
    filename: str,
    data: bytes,
) -> ResumeOut:
    file = validate_upload(data, filename, settings)
    sha = hashlib.sha256(data).hexdigest()

    # Content-addressed: the same file re-uploaded is a cache hit.
    source = await db.scalar(
        select(SourceFile).where(SourceFile.user_id == user.id, SourceFile.sha256 == sha)
    )
    if source is not None:
        master = await db.scalar(select(MasterResume).where(MasterResume.source_file_id == source.id))
        if master is not None:
            await db.execute(
                update(MasterResume).where(MasterResume.user_id == user.id).values(is_primary=False)
            )
            master.is_primary = True
            return to_out(master, source)

    result = await parse_resume(ai, settings, data, file)
    key = upload_key(user.id, sha, file.kind)
    await storage.put(key, data, file.mime)

    source = SourceFile(
        user_id=user.id,
        storage_key=key,
        filename=filename[:300],
        mime=file.mime,
        size_bytes=len(data),
        page_count=result.page_count,
        sha256=sha,
        parse_path=result.path,
    )
    db.add(source)
    await db.flush()
    await db.execute(update(MasterResume).where(MasterResume.user_id == user.id).values(is_primary=False))
    master = MasterResume(
        user_id=user.id, source_file_id=source.id, document=result.resume.model_dump(), is_primary=True
    )
    db.add(master)
    await db.flush()
    activity.record(
        db,
        user.id,
        ActivityKind.RESUME_UPLOADED,
        f"Uploaded {filename}",
        entity_type=EntityType.RESUME,
        entity_id=master.id,
    )
    return to_out(master, source)


async def get_resume(db: AsyncSession, user: User, resume_id: UUID) -> tuple[MasterResume, SourceFile | None]:
    master = await db.get(MasterResume, resume_id)
    if master is None or master.user_id != user.id:
        raise not_found("Resume")
    source = await db.get(SourceFile, master.source_file_id) if master.source_file_id else None
    return master, source


async def primary_resume(db: AsyncSession, user: User) -> tuple[MasterResume, SourceFile | None] | None:
    master = await db.scalar(
        select(MasterResume).where(MasterResume.user_id == user.id, MasterResume.is_primary.is_(True))
    )
    if master is None:
        return None
    source = await db.get(SourceFile, master.source_file_id) if master.source_file_id else None
    return master, source
