"""Derive years of experience and a coarse seniority level from a resume document."""

import re
from datetime import date

from app.schemas.enums import SENIORITY_LADDER, SectionType, Seniority

_YEAR_MONTH = re.compile(r"(\d{4})(?:[-/](\d{1,2}))?")


def _parse(value: str | None, *, default: date) -> date | None:
    if not value:
        return None
    if re.search(r"present|current|now|ongoing", value, re.I):
        return default
    m = _YEAR_MONTH.search(value)
    if not m:
        return None
    return date(int(m.group(1)), int(m.group(2) or 1), 1)


def estimate_years(document: dict, today: date | None = None) -> float:
    today = today or date.today()
    total = 0.0
    for section in document.get("sections", []):
        if section["type"] != SectionType.EXPERIENCE:
            continue
        for item in section["items"]:
            start = _parse(item.get("start"), default=today)
            end = _parse(item.get("end"), default=today) or today
            if start and end >= start:
                total += (end - start).days / 365.25
    return round(total, 1)


def level_for_years(years: float) -> Seniority:
    if years < 2:
        return Seniority.JUNIOR
    if years < 5:
        return Seniority.MID
    if years < 8:
        return Seniority.SENIOR
    if years < 12:
        return Seniority.STAFF
    return Seniority.LEAD


def seniority_fit(jd_level: Seniority, years: float) -> float:
    if jd_level not in SENIORITY_LADDER:
        return 1.0
    gap = abs(SENIORITY_LADDER.index(jd_level) - SENIORITY_LADDER.index(level_for_years(years)))
    return {0: 1.0, 1: 0.6}.get(gap, 0.2)
