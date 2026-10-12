"""Field-level encryption for compensation data. Never logged, never sent to a model."""

import base64
import hashlib

from cryptography.fernet import Fernet

from app.core.config import Settings


def _fernet(settings: Settings) -> Fernet:
    # Derive a valid Fernet key from whatever secret is configured, so dev works out of the box.
    secret = settings.field_encryption_key or settings.jwt_secret
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest())
    return Fernet(key)


def encrypt(value: str, settings: Settings) -> bytes:
    return _fernet(settings).encrypt(value.encode())


def decrypt(blob: bytes | None, settings: Settings) -> str | None:
    if not blob:
        return None
    return _fernet(settings).decrypt(blob).decode()
