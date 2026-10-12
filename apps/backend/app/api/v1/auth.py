from fastapi import APIRouter, Request, Response

from app.api.deps import DbDep, SettingsDep
from app.core.errors import unauthorized
from app.core.security import REFRESH_COOKIE, clear_auth_cookies, set_auth_cookies
from app.schemas.common import LoginRequest, SignupRequest
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", status_code=201)
async def signup(body: SignupRequest, response: Response, db: DbDep, settings: SettingsDep) -> dict:
    user = await auth_service.create_user(db, body.email, body.password, body.full_name)
    access, refresh = await auth_service.issue_tokens(db, user.id, settings)
    await db.commit()
    set_auth_cookies(response, access, refresh, settings)
    return {"id": str(user.id)}


@router.post("/login")
async def login(body: LoginRequest, response: Response, db: DbDep, settings: SettingsDep) -> dict:
    user = await auth_service.authenticate(db, body.email, body.password)
    access, refresh = await auth_service.issue_tokens(db, user.id, settings)
    await db.commit()
    set_auth_cookies(response, access, refresh, settings)
    return {"id": str(user.id)}


@router.post("/refresh")
async def refresh(request: Request, response: Response, db: DbDep, settings: SettingsDep) -> dict:
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise unauthorized()
    user_id, access, new_refresh = await auth_service.rotate_refresh(db, token, settings)
    await db.commit()
    set_auth_cookies(response, access, new_refresh, settings)
    return {"id": str(user_id)}


@router.post("/logout", status_code=204)
async def logout(request: Request, response: Response, db: DbDep, settings: SettingsDep) -> None:
    await auth_service.revoke(db, request.cookies.get(REFRESH_COOKIE))
    await db.commit()
    clear_auth_cookies(response, settings)
