from fastapi import APIRouter

from app.api.deps import AIDep, DbDep, SettingsDep, UserDep
from app.schemas.jd import JDAnalyzeRequest, JDAnalyzeResponse
from app.services import jd_service

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("/analyze", response_model=JDAnalyzeResponse)
async def analyze(
    body: JDAnalyzeRequest, user: UserDep, db: DbDep, ai: AIDep, settings: SettingsDep
) -> JDAnalyzeResponse:
    out = await jd_service.analyze(db, ai, settings, user, body.text, body.url)
    await db.commit()
    return out
