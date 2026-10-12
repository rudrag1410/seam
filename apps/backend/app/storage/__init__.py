from app.core.config import Settings
from app.storage.base import Storage
from app.storage.local import LocalStorage


def build_storage(settings: Settings) -> Storage:
    if settings.r2_endpoint:
        from app.storage.r2 import R2Storage

        return R2Storage(settings)
    return LocalStorage(settings.local_storage_dir)
