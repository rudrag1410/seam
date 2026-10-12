"""Rule-based ATS-friendliness estimate with fix-it hints. Labelled an estimate in the UI."""

import re

from app.ai.scoring.keywords import find_keywords, keyword_alignment, resume_text
from app.schemas.enums import SectionType
from app.schemas.scores import AtsCheck, AtsScore

STRONG_VERBS = {
    "led",
    "built",
    "shipped",
    "designed",
    "reduced",
    "increased",
    "improved",
    "launched",
    "architected",
    "owned",
    "created",
    "developed",
    "delivered",
    "cut",
    "drove",
    "scaled",
    "automated",
    "migrated",
    "optimized",
    "implemented",
    "established",
    "mentored",
    "grew",
    "introduced",
    "refactored",
    "streamlined",
    "managed",
    "negotiated",
    "analyzed",
    "wrote",
}
_METRIC = re.compile(r"\d")


def _bullets(document: dict) -> list[str]:
    out: list[str] = []
    for s in document.get("sections", []):
        if s["type"] in (SectionType.EXPERIENCE, SectionType.PROJECTS):
            for it in s["items"]:
                out.extend(b["text"] for b in it["bullets"])
    return out


def bullet_strength(text: str) -> float:
    """0..1: strong opening verb, a number, and a sensible length."""
    words = text.split()
    first = words[0].lower().strip(",.") if words else ""
    score = 0.0
    score += 0.4 if first in STRONG_VERBS else 0.0
    score += 0.4 if _METRIC.search(text) else 0.0
    score += 0.2 if 8 <= len(words) <= 28 else 0.0
    return score


def compute_ats(document: dict, jd_keywords: list[str] | None = None) -> AtsScore:
    types = {s["type"] for s in document.get("sections", [])}
    contact = document.get("contact", {})
    exp = next((s for s in document["sections"] if s["type"] == SectionType.EXPERIENCE), None)
    text = resume_text(document)
    words = len(text.split())
    bullets = _bullets(document)
    strong_share = sum(bullet_strength(b) >= 0.6 for b in bullets) / len(bullets) if bullets else 0.0

    checks = [
        AtsCheck(
            key="headings",
            label="Standard section headings",
            weight=20,
            passed={"experience", "education", "skills"} <= types,
            hint="Include Experience, Education and Skills sections with plain headings.",
        ),
        AtsCheck(
            key="contact",
            label="Contact details in the body",
            weight=15,
            passed=bool(contact.get("email")) and bool(contact.get("phone")),
            hint="Add both an email address and a phone number.",
        ),
        AtsCheck(
            key="dates",
            label="Consistent dates on every role",
            weight=15,
            passed=bool(exp and exp["items"] and all(i.get("start") for i in exp["items"])),
            hint="Give every role a start and end date.",
        ),
        AtsCheck(
            key="length",
            label="Fits one to two pages",
            weight=10,
            passed=250 <= words <= 1000,
            hint="Aim for roughly 250 to 1,000 words.",
        ),
        AtsCheck(
            key="bullets",
            label="Bullets lead with a verb and carry numbers",
            weight=25,
            passed=strong_share >= 0.5,
            hint="Start bullets with a strong past-tense verb and include a measurable result.",
        ),
    ]
    if jd_keywords:
        align, _, _ = keyword_alignment(document, jd_keywords)
        lowered = text.lower()
        stuffed = any(lowered.count(k.lower()) > 8 for k in find_keywords(text))
        checks.append(
            AtsCheck(
                key="keywords",
                label="Healthy keyword density",
                weight=15,
                passed=align >= 0.4 and not stuffed,
                hint="Work in the missing JD keywords where they are true, without repeating them.",
            )
        )
    total_w = sum(c.weight for c in checks)
    total = 100 * sum(c.weight for c in checks if c.passed) / total_w
    return AtsScore(total=round(total, 1), checks=checks)
