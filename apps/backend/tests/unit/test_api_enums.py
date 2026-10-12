"""Every enum meant for the browser must reach the generated client, or the frontend can't use it."""

from app.main import create_app
from app.schemas import enums, stream  # noqa: F401  (importing registers every subclass)
from app.schemas.enums import ApiEnum


def _all_subclasses(base: type) -> set[type]:
    found: set[type] = set()
    for sub in base.__subclasses__():
        found.add(sub)
        found |= _all_subclasses(sub)
    return found


def test_every_api_enum_is_in_the_openapi_document():
    from app.core import errors  # noqa: F401  (ErrorCode lives beside AppError)

    schemas = create_app().openapi()["components"]["schemas"]
    missing = sorted(e.__name__ for e in _all_subclasses(ApiEnum) if e.__name__ not in schemas)
    assert not missing, f"not reachable from any route or listed in CLIENT_ONLY_ENUMS: {missing}"


def test_enum_members_are_pascal_cased_for_the_client():
    schemas = create_app().openapi()["components"]["schemas"]
    assert schemas["Decision"]["x-enum-varnames"] == ["Pending", "Accepted", "Rejected", "Edited"]
    assert schemas["ErrorCode"]["x-enum-varnames"][0] == "CsrfBlocked"
