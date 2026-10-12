"""Explainable match score: per-requirement coverage levels (Jev, or a keyword fallback)
combined with explicit weights in code."""

import re

from app.ai.scoring.experience import estimate_years, seniority_fit
from app.ai.scoring.keywords import (
    canonicalize,
    find_keywords,
    keyword_alignment,
    resume_text,
)
from app.schemas.enums import SectionType, Verdict
from app.schemas.jd import JDAnalysis, Requirement
from app.schemas.scores import MatchScore, RequirementCoverage

WEIGHTS = {"must": 0.50, "nice": 0.15, "keywords": 0.15, "seniority": 0.10, "sections": 0.10}
MAX_LEVEL = 4.0

# requirement id -> (level 0..4, confidence or None)
Coverage = dict[str, tuple[float, float | None]]


def _experience_text(document: dict) -> str:
    parts: list[str] = []
    for s in document.get("sections", []):
        if s["type"] == SectionType.SUMMARY:
            parts.append(s["text"])
        elif s["type"] in (SectionType.EXPERIENCE, SectionType.PROJECTS):
            for it in s["items"]:
                parts.extend(b["text"] for b in it["bullets"])
    return "\n".join(parts)


def keyword_coverage(document: dict, requirements: list[Requirement]) -> Coverage:
    """Degraded-mode coverage: alias-aware keyword matching, no model involved."""
    exp_text = _experience_text(document)
    exp_kw = set(find_keywords(exp_text))
    all_kw = set(find_keywords(resume_text(document)))
    exp_lower = exp_text.lower()
    out: Coverage = {}
    for r in requirements:
        kws = [canonicalize(k) for k in r.keywords] or find_keywords(r.text)
        if not kws:
            tokens = {t for t in re.findall(r"[a-z]{5,}", r.text.lower())}
            hit = sum(1 for t in tokens if t in exp_lower)
            frac = hit / len(tokens) if tokens else 0.0
            out[r.id] = (min(3.0, frac * 4), None)
            continue
        any_frac = sum(k in all_kw for k in kws) / len(kws)
        exp_frac = sum(k in exp_kw for k in kws) / len(kws)
        level = any_frac * 1.0 + exp_frac * 2.0
        out[r.id] = (round(min(MAX_LEVEL, level), 2), None)
    return out


def _verdict(level: float, confidence: float | None, low: float) -> Verdict:
    if confidence is not None and confidence < low:
        return Verdict.UNSURE
    if level >= 3:
        return Verdict.DEMONSTRATED
    if level >= 1:
        return Verdict.LISTED
    return Verdict.MISSING


def _weighted(reqs: list[Requirement], cov: Coverage) -> float:
    total_w = sum(r.weight for r in reqs)
    if not reqs or total_w == 0:
        return 1.0
    return sum(r.weight * cov.get(r.id, (0.0, None))[0] / MAX_LEVEL for r in reqs) / total_w


def _completeness(document: dict) -> float:
    contact = document.get("contact", {})
    sections = {s["type"]: s for s in document.get("sections", [])}
    exp = sections.get("experience")
    checks = [
        bool(contact.get("email") or contact.get("phone")),
        "summary" in sections and bool(sections["summary"]["text"].strip()),
        "skills" in sections and any(g["items"] for g in sections["skills"]["groups"]),
        exp is not None and bool(exp["items"]) and all(i.get("start") for i in exp["items"]),
    ]
    return sum(checks) / len(checks)


def compute_match(
    document: dict,
    jd: JDAnalysis,
    coverage: Coverage | None = None,
    *,
    low_confidence: float = 0.5,
) -> MatchScore:
    reqs = jd.requirements()
    coverage = coverage if coverage is not None else keyword_coverage(document, reqs)

    must = _weighted(jd.must_haves, coverage)
    nice = _weighted(jd.nice_to_haves, coverage)
    kw, matched, missing = keyword_alignment(document, jd.keywords)
    seniority = seniority_fit(jd.seniority, estimate_years(document))
    sections = _completeness(document)

    total = 100 * (
        WEIGHTS["must"] * must
        + WEIGHTS["nice"] * nice
        + WEIGHTS["keywords"] * kw
        + WEIGHTS["seniority"] * seniority
        + WEIGHTS["sections"] * sections
    )
    must_ids = {r.id for r in jd.must_haves}
    rows = [
        RequirementCoverage(
            id=r.id,
            text=r.text,
            must_have=r.id in must_ids,
            level=coverage.get(r.id, (0.0, None))[0],
            confidence=coverage.get(r.id, (0.0, None))[1],
            verdict=_verdict(*coverage.get(r.id, (0.0, None)), low_confidence),
        )
        for r in reqs
    ]
    return MatchScore(
        total=round(total, 1),
        must_have_coverage=round(must, 3),
        nice_to_have_coverage=round(nice, 3),
        keyword_alignment=round(kw, 3),
        seniority_fit=round(seniority, 3),
        section_completeness=round(sections, 3),
        requirements=rows,
        matched_keywords=matched,
        missing_keywords=missing,
    )
