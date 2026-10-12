from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, File, UploadFile
from pydantic import ValidationError

from app.api.deps import AIDep, DbDep, SettingsDep, StorageDep, UserDep
from app.core.errors import AppError, ErrorCode, not_found
from app.schemas.resume import ResumeOut
from app.schemas.resume_ast import Resume
from app.services import resume_service

router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.post("", response_model=ResumeOut, status_code=201)
async def upload(
    user: UserDep,
    db: DbDep,
    ai: AIDep,
    storage: StorageDep,
    settings: SettingsDep,
    file: Annotated[UploadFile, File()],
) -> ResumeOut:
    # Read at most limit+1 bytes so an oversized upload is rejected without buffering it all.
    data = await file.read(settings.max_upload_bytes + 1)
    out = await resume_service.upload_resume(db, ai, storage, settings, user, file.filename or "resume", data)
    await db.commit()
    return out


@router.get("/primary", response_model=ResumeOut)
async def primary(user: UserDep, db: DbDep) -> ResumeOut:
    found = await resume_service.primary_resume(db, user)
    if found is None:
        raise not_found("Resume")
    return resume_service.to_out(*found)


@router.get("/{resume_id}", response_model=ResumeOut)
async def get_one(resume_id: UUID, user: UserDep, db: DbDep) -> ResumeOut:
    return resume_service.to_out(*await resume_service.get_resume(db, user, resume_id))


@router.put("/{resume_id}", response_model=ResumeOut)
async def update(resume_id: UUID, body: Resume, user: UserDep, db: DbDep) -> ResumeOut:
    master, source = await resume_service.get_resume(db, user, resume_id)
    try:
        master.document = body.model_dump()
    except ValidationError as exc:  # pragma: no cover - body is already validated
        raise AppError(ErrorCode.VALIDATION_FAILED, str(exc)) from exc
    await db.commit()
    return resume_service.to_out(master, source)
