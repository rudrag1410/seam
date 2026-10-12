import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, CreatedMixin, EnumString, IdMixin, Json
from app.schemas.enums import ParsePath


class SourceFile(Base, IdMixin, CreatedMixin):
    __tablename__ = "source_files"
    __table_args__ = (UniqueConstraint("user_id", "sha256"),)

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"))
    storage_key: Mapped[str] = mapped_column(String(500))
    filename: Mapped[str] = mapped_column(String(300))
    mime: Mapped[str] = mapped_column(String(100))
    size_bytes: Mapped[int] = mapped_column(Integer)
    page_count: Mapped[int] = mapped_column(Integer, default=1)
    sha256: Mapped[str] = mapped_column(String(64))
    parse_path: Mapped[ParsePath | None] = mapped_column(EnumString(ParsePath, 20), nullable=True)


class MasterResume(Base, IdMixin, CreatedMixin):
    __tablename__ = "master_resumes"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    source_file_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("source_files.id", ondelete="SET NULL"), nullable=True
    )
    document: Mapped[dict] = mapped_column(Json)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=True)


class JobDescription(Base, IdMixin, CreatedMixin):
    __tablename__ = "job_descriptions"
    __table_args__ = (UniqueConstraint("user_id", "sha256"),)

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"))
    raw_text: Mapped[str] = mapped_column(Text)
    sha256: Mapped[str] = mapped_column(String(64))
    analysis: Mapped[dict | None] = mapped_column(Json, nullable=True)
    title: Mapped[str | None] = mapped_column(String(300), nullable=True)
    company: Mapped[str | None] = mapped_column(String(300), nullable=True)
