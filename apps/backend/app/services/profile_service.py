from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.crypto import decrypt, encrypt
from app.db.models import JobPreferences, Profile, User
from app.schemas.common import PreferencesIO, ProfileIO


async def get_profile(db: AsyncSession, user: User, settings: Settings) -> ProfileIO:
    p = await db.get(Profile, user.id)
    assert p is not None
    cur, exp = decrypt(p.current_ctc_enc, settings), decrypt(p.expected_ctc_enc, settings)
    return ProfileIO(
        full_name=p.full_name,
        phone=p.phone,
        location=p.location,
        headline=p.headline,
        current_title=p.current_title,
        current_company=p.current_company,
        years_experience=p.years_experience,
        links=p.links or {},
        current_ctc=float(cur) if cur else None,
        expected_ctc=float(exp) if exp else None,
        ctc_currency=p.ctc_currency,
        notice_period_days=p.notice_period_days,
    )


async def save_profile(db: AsyncSession, user: User, body: ProfileIO, settings: Settings) -> ProfileIO:
    p = await db.get(Profile, user.id)
    assert p is not None
    for field in (
        "full_name",
        "phone",
        "location",
        "headline",
        "current_title",
        "current_company",
        "years_experience",
        "links",
        "ctc_currency",
        "notice_period_days",
    ):
        setattr(p, field, getattr(body, field))
    p.current_ctc_enc = encrypt(str(body.current_ctc), settings) if body.current_ctc is not None else None
    p.expected_ctc_enc = encrypt(str(body.expected_ctc), settings) if body.expected_ctc is not None else None
    if body.full_name:
        user.full_name = body.full_name
    return await get_profile(db, user, settings)


async def get_preferences(db: AsyncSession, user: User) -> PreferencesIO:
    prefs = await db.get(JobPreferences, user.id)
    assert prefs is not None
    return PreferencesIO.model_validate(prefs, from_attributes=True)


async def save_preferences(db: AsyncSession, user: User, body: PreferencesIO) -> PreferencesIO:
    prefs = await db.get(JobPreferences, user.id)
    assert prefs is not None
    for key, value in body.model_dump().items():
        setattr(prefs, key, value)
    return body
