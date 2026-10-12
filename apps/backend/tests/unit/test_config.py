import pytest

from app.core.config import Settings


@pytest.mark.parametrize(
    "given",
    ["postgres://u:p@h:5432/seam", "postgresql://u:p@h:5432/seam", "postgresql+asyncpg://u:p@h:5432/seam"],
)
def test_postgres_urls_get_the_async_driver(given):
    assert Settings(database_url=given).database_url == "postgresql+asyncpg://u:p@h:5432/seam"


def test_sqlite_url_is_untouched():
    assert Settings(database_url="sqlite+aiosqlite:///./x.db").database_url == "sqlite+aiosqlite:///./x.db"


def test_cors_origins_are_split():
    assert Settings(cors_origins="http://a.com, http://b.com").cors_origin_list == [
        "http://a.com",
        "http://b.com",
    ]
