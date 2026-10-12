from app.ai.scoring.experience import level_for_years
from app.schemas.enums import (
    SENIORITY_LADDER,
    EmploymentType,
    Facet,
    FitKey,
    FitStatus,
    SalaryPeriod,
    Seniority,
    WorkMode,
)
from app.schemas.jd import FitCheck, FitItem, JDAnalysis

_MODE_LABEL = {WorkMode.REMOTE: "Remote", WorkMode.HYBRID: "Hybrid", WorkMode.ONSITE: "Onsite"}
_TYPE_LABEL = {
    EmploymentType.FULL_TIME: "Full-time",
    EmploymentType.CONTRACT: "Contract",
    EmploymentType.PART_TIME: "Part-time",
    EmploymentType.INTERNSHIP: "Internship",
    EmploymentType.FREELANCE: "Freelance",
}


def _item(key: FitKey, label: str, status: FitStatus, detail: str) -> FitItem:
    return FitItem(key=key, label=label, status=status, detail=detail)


def _unclear(jd: JDAnalysis, facet: Facet, low_confidence: float) -> bool:
    return jd.facet_confidence.get(facet, 1.0) < low_confidence


def _work_mode(jd: JDAnalysis, prefs: dict, low_confidence: float) -> FitItem:
    modes = prefs.get("work_modes") or []
    if jd.work_mode == WorkMode.UNSPECIFIED or _unclear(jd, Facet.WORK_MODE, low_confidence) or not modes:
        detail = "Not stated clearly in the posting." if modes else "Set a work mode preference."
        return _item(FitKey.WORK_MODE, "Work mode", FitStatus.UNCLEAR, detail)
    if jd.work_mode in modes:
        return _item(
            FitKey.WORK_MODE, "Work mode", FitStatus.OK, f"{_MODE_LABEL[jd.work_mode]}, which you prefer."
        )
    want = " or ".join(str(_MODE_LABEL.get(m, m)) for m in modes)
    return _item(
        FitKey.WORK_MODE, "Work mode", FitStatus.WARN, f"{_MODE_LABEL[jd.work_mode]}. You prefer {want}."
    )


def _location(jd: JDAnalysis, prefs: dict) -> FitItem:
    locs = [loc.lower() for loc in prefs.get("locations") or []]
    if jd.work_mode == WorkMode.REMOTE or not jd.location:
        detail = "Remote role." if jd.work_mode == WorkMode.REMOTE else "No location listed."
        return _item(
            FitKey.LOCATION, "Location", FitStatus.UNCLEAR if not jd.location else FitStatus.OK, detail
        )
    if not locs:
        return _item(
            FitKey.LOCATION,
            "Location",
            FitStatus.UNCLEAR,
            f"{jd.location}. Add preferred locations to compare.",
        )
    if any(loc in jd.location.lower() or jd.location.lower() in loc for loc in locs):
        return _item(FitKey.LOCATION, "Location", FitStatus.OK, jd.location)
    if prefs.get("open_to_relocation"):
        return _item(FitKey.LOCATION, "Location", FitStatus.OK, f"{jd.location}. You are open to relocation.")
    return _item(
        FitKey.LOCATION, "Location", FitStatus.WARN, f"{jd.location}, outside your preferred locations."
    )


def _job_type(jd: JDAnalysis, prefs: dict, low_confidence: float) -> FitItem:
    types = prefs.get("job_types") or []
    if (
        jd.employment_type == EmploymentType.UNSPECIFIED
        or _unclear(jd, Facet.EMPLOYMENT_TYPE, low_confidence)
        or not types
    ):
        return _item(FitKey.JOB_TYPE, "Job type", FitStatus.UNCLEAR, "Not stated clearly in the posting.")
    label = _TYPE_LABEL[jd.employment_type]
    if jd.employment_type in types:
        return _item(FitKey.JOB_TYPE, "Job type", FitStatus.OK, label)
    return _item(FitKey.JOB_TYPE, "Job type", FitStatus.WARN, f"{label}, not in your preferred types.")


def _compensation(jd: JDAnalysis, expected_ctc: float | None, ctc_currency: str) -> FitItem:
    sr = jd.salary_range
    if sr is None or (sr.min is None and sr.max is None):
        return _item(
            FitKey.COMPENSATION, "Compensation", FitStatus.UNCLEAR, "No salary range in the posting."
        )
    if expected_ctc is None:
        return _item(
            FitKey.COMPENSATION, "Compensation", FitStatus.UNCLEAR, "Add an expected CTC to compare."
        )
    if sr.currency and sr.currency.upper() != ctc_currency.upper():
        detail = f"Range is in {sr.currency}; your expectation is in {ctc_currency}."
        return _item(FitKey.COMPENSATION, "Compensation", FitStatus.UNCLEAR, detail)
    factor = 12 if sr.period == SalaryPeriod.MONTH else 1
    bound = sr.max if sr.max is not None else sr.min
    if bound is None:
        return _item(
            FitKey.COMPENSATION, "Compensation", FitStatus.UNCLEAR, "No salary range in the posting."
        )
    top = bound * factor
    if top >= expected_ctc:
        return _item(FitKey.COMPENSATION, "Compensation", FitStatus.OK, "Range reaches your expected CTC.")
    gap = round((expected_ctc - top) / expected_ctc * 100)
    detail = f"Top of range is about {gap}% below your expectation."
    return _item(FitKey.COMPENSATION, "Compensation", FitStatus.WARN, detail)


def _seniority(jd: JDAnalysis, years: float | None, low_confidence: float) -> FitItem:
    if (
        jd.seniority == Seniority.UNSPECIFIED
        or _unclear(jd, Facet.SENIORITY, low_confidence)
        or years is None
    ):
        return _item(FitKey.SENIORITY, "Seniority", FitStatus.UNCLEAR, "Level isn't clear from the posting.")
    role = jd.seniority.title()
    gap = SENIORITY_LADDER.index(jd.seniority) - SENIORITY_LADDER.index(level_for_years(years))
    if -1 <= gap <= 0:
        return _item(
            FitKey.SENIORITY, "Seniority", FitStatus.OK, f"{role} role, in line with your experience."
        )
    if gap > 0:
        return _item(FitKey.SENIORITY, "Seniority", FitStatus.WARN, f"{role} role. This is a stretch.")
    return _item(FitKey.SENIORITY, "Seniority", FitStatus.WARN, f"{role} role, below your level.")


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
