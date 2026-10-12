import uuid
from datetime import datetime

from sqlalchemy import Float, ForeignKey, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, CreatedMixin, IdMixin, Json, UTCDateTime


class TailorSession(Base, IdMixin, CreatedMixin):
    __tablename__ = "tailor_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    master_resume_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("master_resumes.id"))
    base_version_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    jd_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("job_descriptions.id"))
    sections: Mapped[list] = mapped_column(Json)
    intensity: Mapped[str] = mapped_column(String(20), default="balanced")
    status: Mapped[str] = mapped_column(String(20), default="queued")
    prompt_version: Mapped[str] = mapped_column(String(20))
    score_before: Mapped[dict | None] = mapped_column(Json, nullable=True)
    score_after: Mapped[dict | None] = mapped_column(Json, nullable=True)
    degraded: Mapped[bool] = mapped_column(default=False)
    error_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(300), nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)


class Suggestion(Base, IdMixin):
    __tablename__ = "suggestions"
    __table_args__ = (UniqueConstraint("session_id", "seq"),)

    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("tailor_sessions.id", ondelete="CASCADE"), index=True
    )
    seq: Mapped[int] = mapped_column(Integer)
    section: Mapped[str] = mapped_column(String(50))
    op: Mapped[str] = mapped_column(String(30))
    target: Mapped[str] = mapped_column(String(100))
    payload: Mapped[dict] = mapped_column(Json)
    before: Mapped[dict | None] = mapped_column(Json, nullable=True)
    rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    addresses: Mapped[list] = mapped_column(Json, default=list)
    evidence: Mapped[list] = mapped_column(Json, default=list)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    requires_confirmation: Mapped[bool] = mapped_column(default=False)
    flag_reason: Mapped[str | None] = mapped_column(String(300), nullable=True)
    score_delta: Mapped[float | None] = mapped_column(Float, nullable=True)
    checks: Mapped[dict] = mapped_column(Json, default=dict)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    edited_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)


class ResumeVersion(Base, IdMixin, CreatedMixin):
    __tablename__ = "resume_versions"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("tailor_sessions.id", ondelete="SET NULL"), nullable=True
    )
    parent_version_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("resume_versions.id", ondelete="SET NULL"), nullable=True
    )
    label: Mapped[str] = mapped_column(String(300))
    document: Mapped[dict] = mapped_column(Json)
    jd_title: Mapped[str | None] = mapped_column(String(300), nullable=True)
    jd_company: Mapped[str | None] = mapped_column(String(300), nullable=True)
    match_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    ats_score: Mapped[float | None] = mapped_column(Float, nullable=True)


class CoverLetter(Base, IdMixin, CreatedMixin):
    __tablename__ = "cover_letters"

    version_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("resume_versions.id", ondelete="CASCADE"), index=True
    )
    tone: Mapped[str] = mapped_column(String(30))
    length: Mapped[str] = mapped_column(String(30))
    body: Mapped[str] = mapped_column(Text)
