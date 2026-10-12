"""Fit check: compares JD facets with the user's preferences.
Compensation is compared here, in code. Expected CTC is never sent to any model."""

from app.ai.scoring.experience import level_for_years
from app.schemas.jd import FitCheck, FitItem, JDAnalysis

_MODE_LABEL = {"remote": "Remote", "hybrid": "Hybrid", "onsite": "Onsite"}
_TYPE_LABEL = {
    "full_time": "Full-time",
    "contract": "Contract",
    "part_time": "Part-time",
    "internship": "Internship",
    "freelance": "Freelance",
}
_LEVELS = ["junior", "mid", "senior", "staff", "lead"]


def _item(key: str, label: str, status: str, detail: str) -> FitItem:
    return FitItem(key=key, label=label, status=status, detail=detail)  # type: ignore[arg-type]


def _unclear(jd: JDAnalysis, facet: str, low_confidence: float) -> bool:
    """The posting's reading of this facet is too uncertain to compare against."""
    return jd.facet_confidence.get(facet, 1.0) < low_confidence


def _work_mode(jd: JDAnalysis, prefs: dict, low_confidence: float) -> FitItem:
    modes = prefs.get("work_modes") or []
    if jd.work_mode == "unspecified" or _unclear(jd, "work_mode", low_confidence) or not modes:
        detail = "Not stated clearly in the posting." if modes else "Set a work mode preference."
        return _item("work_mode", "Work mode", "unclear", detail)
    if jd.work_mode in modes:
        return _item("work_mode", "Work mode", "ok", f"{_MODE_LABEL[jd.work_mode]}, which you prefer.")
    want = " or ".join(str(_MODE_LABEL.get(m, m)) for m in modes)
    return _item("work_mode", "Work mode", "warn", f"{_MODE_LABEL[jd.work_mode]}. You prefer {want}.")


def _location(jd: JDAnalysis, prefs: dict) -> FitItem:
    locs = [loc.lower() for loc in prefs.get("locations") or []]
    if jd.work_mode == "remote" or not jd.location:
        detail = "Remote role." if jd.work_mode == "remote" else "No location listed."
        return _item("location", "Location", "unclear" if not jd.location else "ok", detail)
    if not locs:
        return _item("location", "Location", "unclear", f"{jd.location}. Add preferred locations to compare.")
    if any(loc in jd.location.lower() or jd.location.lower() in loc for loc in locs):
        return _item("location", "Location", "ok", jd.location)
    if prefs.get("open_to_relocation"):
        return _item("location", "Location", "ok", f"{jd.location}. You are open to relocation.")
    return _item("location", "Location", "warn", f"{jd.location}, outside your preferred locations.")


def _job_type(jd: JDAnalysis, prefs: dict, low_confidence: float) -> FitItem:
    types = prefs.get("job_types") or []
    if jd.employment_type == "unspecified" or _unclear(jd, "employment_type", low_confidence) or not types:
        return _item("job_type", "Job type", "unclear", "Not stated clearly in the posting.")
    label = _TYPE_LABEL[jd.employment_type]
    if jd.employment_type in types:
        return _item("job_type", "Job type", "ok", label)
    return _item("job_type", "Job type", "warn", f"{label}, not in your preferred types.")


def _compensation(jd: JDAnalysis, expected_ctc: float | None, ctc_currency: str) -> FitItem:
    """Compared here, in code. The expected figure never reaches a model."""
    sr = jd.salary_range
    if sr is None or (sr.min is None and sr.max is None):
        return _item("compensation", "Compensation", "unclear", "No salary range in the posting.")
    if expected_ctc is None:
        return _item("compensation", "Compensation", "unclear", "Add an expected CTC to compare.")
    if sr.currency and sr.currency.upper() != ctc_currency.upper():
        detail = f"Range is in {sr.currency}; your expectation is in {ctc_currency}."
        return _item("compensation", "Compensation", "unclear", detail)
    factor = 12 if sr.period == "month" else 1
    top = (sr.max if sr.max is not None else sr.min) * factor  # type: ignore[operator]
    if top >= expected_ctc:
        return _item("compensation", "Compensation", "ok", "Range reaches your expected CTC.")
    gap = round((expected_ctc - top) / expected_ctc * 100)
    return _item(
        "compensation", "Compensation", "warn", f"Top of range is about {gap}% below your expectation."
    )


def _seniority(jd: JDAnalysis, years: float | None, low_confidence: float) -> FitItem:
    if jd.seniority == "unspecified" or _unclear(jd, "seniority", low_confidence) or years is None:
        return _item("seniority", "Seniority", "unclear", "Level isn't clear from the posting.")
    role = jd.seniority.title()
    gap = _LEVELS.index(jd.seniority) - _LEVELS.index(level_for_years(years))
    if -1 <= gap <= 0:
        return _item("seniority", "Seniority", "ok", f"{role} role, in line with your experience.")
    if gap > 0:
        return _item("seniority", "Seniority", "warn", f"{role} role. This is a stretch.")
    return _item("seniority", "Seniority", "warn", f"{role} role, below your level.")


def compute_fit(
    jd: JDAnalysis,
    prefs: dict,
    *,
    expected_ctc: float | None,
    ctc_currency: str,
    years: float | None,
    low_confidence: float = 0.5,
) -> FitCheck:
    return FitCheck(
        items=[
            _work_mode(jd, prefs, low_confidence),
            _location(jd, prefs),
            _job_type(jd, prefs, low_confidence),
            _compensation(jd, expected_ctc, ctc_currency),
            _seniority(jd, years, low_confidence),
        ]
    )
