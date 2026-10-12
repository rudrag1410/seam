from app.core.config import Settings


def test_tests_never_see_real_credentials_or_storage():
    s = Settings()
    assert s.r2_endpoint == "" and s.r2_access_key_id == "" and s.r2_secret_access_key == ""
    assert s.openai_api_key == "" and s.typesafe_api_key == ""
    assert s.database_url.startswith("sqlite")
