from datetime import UTC, datetime

from fastapi import APIRouter, Response
from sqlalchemy import select

from app.api.deps import DbDep, SettingsDep, StorageDep, UserDep
from app.core.security import clear_auth_cookies
from app.db.models import MasterResume
from app.schemas.common import PreferencesIO, ProfileIO, UserOut
from app.schemas.enums import ActivityKind
from app.services import activity, profile_service
from app.storage.keys import user_prefixes

router = APIRouter(prefix="/me", tags=["me"])


@router.get("", response_model=UserOut)
async def me(user: UserDep, db: DbDep) -> UserOut:
    has_resume = await db.scalar(select(MasterResume.id).where(MasterResume.user_id == user.id).limit(1))
    return UserOut(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        onboarded=user.onboarded_at is not None,
        has_resume=has_resume is not None,
    )


@router.get("/profile", response_model=ProfileIO)
async def get_profile(user: UserDep, db: DbDep, settings: SettingsDep) -> ProfileIO:
    return await profile_service.get_profile(db, user, settings)


@router.put("/profile", response_model=ProfileIO)
async def put_profile(body: ProfileIO, user: UserDep, db: DbDep, settings: SettingsDep) -> ProfileIO:
    out = await profile_service.save_profile(db, user, body, settings)
    activity.record(db, user.id, ActivityKind.PROFILE_UPDATED, "Updated profile")
    await db.commit()
    return out


@router.get("/preferences", response_model=PreferencesIO)
async def get_preferences(user: UserDep, db: DbDep) -> PreferencesIO:
    return await profile_service.get_preferences(db, user)


@router.put("/preferences", response_model=PreferencesIO)
async def put_preferences(body: PreferencesIO, user: UserDep, db: DbDep) -> PreferencesIO:
    out = await profile_service.save_preferences(db, user, body)
    activity.record(db, user.id, ActivityKind.PROFILE_UPDATED, "Updated job preferences")
    await db.commit()
    return out


@router.post("/onboarding/complete", status_code=204)
async def complete_onboarding(user: UserDep, db: DbDep) -> None:
    user.onboarded_at = datetime.now(UTC)
    await db.commit()


@router.delete("", status_code=204)
async def delete_me(
    response: Response, user: UserDep, db: DbDep, storage: StorageDep, settings: SettingsDep
) -> None:
    """Deletes the user and, by cascade, every row; purges the user's stored files."""
    for prefix in user_prefixes(user.id):
        await storage.delete_prefix(prefix)
    await db.delete(user)
    await db.commit()
    clear_auth_cookies(response, settings)
