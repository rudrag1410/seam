"""Derive years of experience and a coarse seniority level from a resume document."""

import re
from datetime import date

LEVELS = ["junior", "mid", "senior", "staff", "lead"]
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
        if section["type"] != "experience":
            continue
        for item in section["items"]:
            start = _parse(item.get("start"), default=today)
            end = _parse(item.get("end"), default=today) or today
            if start and end >= start:
                total += (end - start).days / 365.25
    return round(total, 1)


def level_for_years(years: float) -> str:
    if years < 2:
        return "junior"
    if years < 5:
        return "mid"
    if years < 8:
        return "senior"
    if years < 12:
        return "staff"
    return "lead"


def seniority_fit(jd_level: str, years: float) -> float:
    if jd_level not in LEVELS:
        return 1.0
    gap = abs(LEVELS.index(jd_level) - LEVELS.index(level_for_years(years)))
    return {0: 1.0, 1: 0.6}.get(gap, 0.2)
