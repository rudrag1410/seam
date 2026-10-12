from enum import StrEnum

from app.core.config import Settings


class Band(StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


def band(confidence: float, settings: Settings) -> Band:
    if confidence >= settings.jev_confidence_high:
        return Band.HIGH
    if confidence >= settings.jev_confidence_low:
        return Band.MEDIUM
    return Band.LOW
