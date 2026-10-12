import asyncio
import io
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import Settings
from app.main import create_app

# Tests must be hermetic. A developer's .env or shell can hold real API keys and a real storage
# bucket, and the suite uploads and exports files, so never let any of it leak in.
Settings.model_config["env_file"] = None
for _name in Settings.model_fields:
    os.environ.pop(_name.upper(), None)

FIXTURES = Path(__file__).resolve().parents[3] / "packages" / "fixtures"


def fixture_text(rel: str) -> str:
    return (FIXTURES / rel).read_text()


def text_to_pdf(text: str, size: float = 9, max_chars: int = 110) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    y = 800
    for line in text.split("\n"):
        if y < 40:
            c.showPage()
            y = 800
        c.setFont("Helvetica", size)
        c.drawString(40, y, line[:max_chars])
        y -= size + 3
    c.save()
    return buf.getvalue()


async def _truncate_all(url: str) -> None:
    engine = create_async_engine(url)
    async with engine.begin() as conn:
        names = (
            (
                await conn.execute(
                    text(
                        "select tablename from pg_tables where schemaname='public' and tablename <> 'alembic_version'"
                    )
                )
            )
            .scalars()
            .all()
        )
        if names:
            await conn.execute(text(f"truncate {', '.join(names)} restart identity cascade"))
    await engine.dispose()


def _reset_postgres(url: str) -> None:
    """Empty every table between tests when running against a real Postgres (TEST_DATABASE_URL)."""
    asyncio.run(_truncate_all(url))


@pytest.fixture
def settings(tmp_path) -> Settings:
    pg = os.environ.get("TEST_DATABASE_URL")
    if pg:
        _reset_postgres(Settings(database_url=pg).database_url)
    return Settings(
        app_env="test",
        ai_mode="mock",
        database_url=Settings(database_url=pg).database_url
        if pg
        else f"sqlite+aiosqlite:///{tmp_path}/test.db",
        local_storage_dir=str(tmp_path / "files"),
        jwt_secret="test-secret-that-is-long-enough-for-hs256",
    )


@pytest.fixture
def client(settings):
    with TestClient(create_app(settings)) as c:
        yield c


@pytest.fixture
def authed(client):
    r = client.post(
        "/v1/auth/signup",
        json={"email": "aarav@example.com", "password": "correct-horse", "full_name": "Aarav Mehta"},
    )
    assert r.status_code == 201, r.text
    return client


@pytest.fixture
def resume_pdf() -> bytes:
    return text_to_pdf(fixture_text("resumes/aarav_mehta.txt"))


@pytest.fixture
def jd_text() -> str:
    return fixture_text("jds/senior_frontend.txt")
