from fastapi import APIRouter, Request
from sqlalchemy import text

from app.api.deps import DbDep

router = APIRouter(tags=["health"])


@router.get("/healthz")
async def healthz() -> dict:
    return {"status": "ok"}


@router.get("/readyz")
async def readyz(request: Request, db: DbDep) -> dict:
    await db.execute(text("select 1"))
    ai = request.app.state.ai
    return {
        "status": "ok",
        "database": "ok",
        "openai_breaker_open": bool(getattr(ai.generate, "breaker_open", False)),
        "jev": "off" if not ai.jev.enabled else ("degraded" if ai.jev.breaker_open else "ok"),
        "ai_mode": request.app.state.settings.ai_mode,
    }
