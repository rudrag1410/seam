"""Every parsed bullet must come from the source text. Catches parser hallucination."""

import re

from rapidfuzz import fuzz

from app.schemas.parsed import ParsedResume


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def unmatched_ratio(parsed: ParsedResume, source_text: str, threshold: int = 85) -> float:
    haystack = _norm(source_text)
    bullets = [b for r in parsed.experience for b in r.bullets] + [
        b for p in parsed.projects for b in p.bullets
    ]
    if not bullets:
        return 0.0
    missing = sum(1 for b in bullets if fuzz.partial_ratio(_norm(b), haystack) < threshold)
    return missing / len(bullets)
