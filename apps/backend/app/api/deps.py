from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.gateway import AIGateway
from app.core.config import Settings
from app.core.errors import unauthorized
from app.core.security import ACCESS_COOKIE, REFRESH_COOKIE, decode_access_token, set_auth_cookies
from app.db.models import User
from app.services import auth_service
from app.services.events import TailorBroker
from app.storage.base import Storage


def get_settings_dep(request: Request) -> Settings:
    return request.app.state.settings


async def get_db(request: Request) -> AsyncIterator[AsyncSession]:
    async with request.app.state.sessionmaker() as session:
        yield session


def get_ai(request: Request) -> AIGateway:
    return request.app.state.ai


def get_storage(request: Request) -> Storage:
    return request.app.state.storage


def get_broker(request: Request) -> TailorBroker:
    return request.app.state.broker


SettingsDep = Annotated[Settings, Depends(get_settings_dep)]
DbDep = Annotated[AsyncSession, Depends(get_db)]
AIDep = Annotated[AIGateway, Depends(get_ai)]
StorageDep = Annotated[Storage, Depends(get_storage)]
BrokerDep = Annotated[TailorBroker, Depends(get_broker)]


async def current_user(request: Request, response: Response, db: DbDep, settings: SettingsDep) -> User:
    user_id = None
    if token := request.cookies.get(ACCESS_COOKIE):
        user_id = decode_access_token(token, settings)
    if user_id is None:
        refresh = request.cookies.get(REFRESH_COOKIE)
        if not refresh:
            raise unauthorized()
        user_id, access, new_refresh = await auth_service.rotate_refresh(db, refresh, settings)
        await db.commit()
        set_auth_cookies(response, access, new_refresh, settings)
    user = await db.get(User, user_id)
    if user is None:
        raise unauthorized()
    return user


UserDep = Annotated[User, Depends(current_user)]
