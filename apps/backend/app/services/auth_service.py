from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import AppError, ErrorCode, unauthorized
from app.core.security import (
    create_access_token,
    hash_password,
    hash_token,
    new_refresh_token,
    verify_password,
)
from app.db.models import JobPreferences, Profile, RefreshToken, User


async def create_user(db: AsyncSession, email: str, password: str, full_name: str) -> User:
    email = email.lower()
    if await db.scalar(select(User.id).where(User.email == email)):
        raise AppError(
            ErrorCode.EMAIL_TAKEN,
            "An account with that email already exists.",
            status=409,
            hint="Try signing in instead.",
        )
    user = User(email=email, password_hash=hash_password(password), full_name=full_name.strip())
    db.add(user)
    await db.flush()
    db.add(Profile(user_id=user.id, full_name=user.full_name))
    db.add(JobPreferences(user_id=user.id))
    return user


async def authenticate(db: AsyncSession, email: str, password: str) -> User:
    user = await db.scalar(select(User).where(User.email == email.lower()))
    if user is None or not verify_password(password, user.password_hash):
        raise AppError(ErrorCode.INVALID_CREDENTIALS, "That email and password don't match.", status=401)
    return user


async def issue_tokens(
    db: AsyncSession, user_id: UUID, settings: Settings, family_id: UUID | None = None
) -> tuple[str, str]:
    refresh = new_refresh_token()
    db.add(
        RefreshToken(
            user_id=user_id,
            family_id=family_id or uuid4(),
            token_hash=hash_token(refresh),
            expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_ttl_days),
        )
    )
    return create_access_token(user_id, settings), refresh


async def rotate_refresh(db: AsyncSession, token: str, settings: Settings) -> tuple[UUID, str, str]:
    row = await db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(token)))
    if row is None:
        raise unauthorized()
    now = datetime.now(UTC)
    if row.revoked_at is not None:
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.family_id == row.family_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        await db.commit()
        raise unauthorized("Your session expired. Please sign in again.")
    expires = row.expires_at if row.expires_at.tzinfo else row.expires_at.replace(tzinfo=UTC)
    if expires < now:
        raise unauthorized("Your session expired. Please sign in again.")
    row.revoked_at = now
    access, refresh = await issue_tokens(db, row.user_id, settings, row.family_id)
    return row.user_id, access, refresh


async def revoke(db: AsyncSession, token: str | None) -> None:
    if not token:
        return
    row = await db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(token)))
    if row:
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.family_id == row.family_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=datetime.now(UTC))
        )
