import uuid
from datetime import datetime

from sqlalchemy import Boolean, Float, ForeignKey, Integer, LargeBinary, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, CreatedMixin, IdMixin, Json, UTCDateTime, utcnow


class User(Base, IdMixin, CreatedMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(200), default="")
    onboarded_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)


class Profile(Base):
    __tablename__ = "profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    full_name: Mapped[str] = mapped_column(String(200), default="")
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    headline: Mapped[str | None] = mapped_column(String(300), nullable=True)
    current_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    current_company: Mapped[str | None] = mapped_column(String(200), nullable=True)
    years_experience: Mapped[float | None] = mapped_column(Float, nullable=True)
    links: Mapped[dict] = mapped_column(Json, default=dict)
    # Compensation is encrypted at rest and never leaves the backend.
    current_ctc_enc: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    expected_ctc_enc: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    ctc_currency: Mapped[str] = mapped_column(String(3), default="INR")
    notice_period_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, onupdate=utcnow)


class JobPreferences(Base):
    __tablename__ = "job_preferences"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    target_roles: Mapped[list] = mapped_column(Json, default=list)
    seniority: Mapped[str | None] = mapped_column(String(20), nullable=True)
    job_types: Mapped[list] = mapped_column(Json, default=list)
    work_modes: Mapped[list] = mapped_column(Json, default=list)
    locations: Mapped[list] = mapped_column(Json, default=list)
    open_to_relocation: Mapped[bool] = mapped_column(Boolean, default=False)
    industries: Mapped[list] = mapped_column(Json, default=list)
    preferred_tech: Mapped[list] = mapped_column(Json, default=list)
    avoid_tech: Mapped[list] = mapped_column(Json, default=list)
    work_authorization: Mapped[str | None] = mapped_column(String(200), nullable=True)


class RefreshToken(Base, IdMixin, CreatedMixin):
    __tablename__ = "refresh_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"))
    family_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime())
    revoked_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
