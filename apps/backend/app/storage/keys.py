from uuid import UUID


def upload_key(user_id: UUID, sha256: str, ext: str) -> str:
    return f"uploads/{user_id}/{sha256}.{ext}"


def export_key(user_id: UUID, version_id: UUID, template: str, ext: str) -> str:
    return f"exports/{user_id}/{version_id}/{template}.{ext}"


def user_prefixes(user_id: UUID) -> list[str]:
    return [f"uploads/{user_id}/", f"exports/{user_id}/"]
