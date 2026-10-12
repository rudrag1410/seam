import re
from dataclasses import dataclass

from app.ai.scoring.keywords import find_keywords

_NUMBER = re.compile(r"\$?\d[\d,]*(?:\.\d+)?\s?(?:%|[kKmMbB]\b|x\b|\+)?")
_YEARS_AFTER = re.compile(r"\s*\+?\s*(?:years?|yrs?)\b", re.I)


@dataclass
class FabricationResult:
    after: str
    requires_confirmation: bool
    reason: str | None


def _norm(num: str) -> str:
    return re.sub(r"[\s,$+]", "", num).lower()


def _numbers(text: str) -> set[str]:
    return {_norm(m.group()) for m in _NUMBER.finditer(text)}


def _is_years_of_experience(norm: str, tail: str, estimated_years: float | None) -> bool:
    if estimated_years is None or not _YEARS_AFTER.match(tail):
        return False
    try:
        return abs(float(norm.rstrip("%kmbx")) - estimated_years) <= 1.5
    except ValueError:
        return False


def _redact_new_numbers(after: str, known: set[str], estimated_years: float | None) -> tuple[str, list[str]]:
    out: list[str] = []
    reasons: list[str] = []
    cursor = 0
    for m in _NUMBER.finditer(after):
        raw = m.group()
        norm = _norm(raw)
        out.append(after[cursor : m.start()])
        cursor = m.end()
        if norm in known or _is_years_of_experience(norm, after[m.end() :], estimated_years):
            out.append(raw)
            continue
        reasons.append(f"new number {raw.strip()}")
        out.append("[X]%" if raw.rstrip().endswith("%") else "[X]")
    out.append(after[cursor:])
    return "".join(out), reasons


def check_fabrication(
    after: str,
    *,
    evidence_text: str,
    resume_text: str,
    estimated_years: float | None = None,
) -> FabricationResult:
    rewritten, reasons = _redact_new_numbers(after, _numbers(evidence_text), estimated_years)

    new_tech = [t for t in find_keywords(after) if t not in set(find_keywords(resume_text))]
    reasons.extend(f"{t} isn't on your resume" for t in new_tech)

    if not reasons:
        return FabricationResult(after, False, None)
    return FabricationResult(rewritten, True, "Adds " + "; ".join(reasons[:3]))
