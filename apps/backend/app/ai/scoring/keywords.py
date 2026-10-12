"""Keyword canonicalization and detection, shared by scoring, guards and the mock provider."""

import re
from functools import lru_cache
from pathlib import Path

import yaml

from app.schemas.enums import SectionType

_YAML = Path(__file__).resolve().parent.parent / "canonical_skills.yaml"


@lru_cache
def _alias_map() -> dict[str, str]:
    raw: dict[str, list[str]] = yaml.safe_load(_YAML.read_text())
    out: dict[str, str] = {}
    for canonical, aliases in raw.items():
        out[canonical.lower()] = canonical
        for alias in aliases:
            out[alias.lower()] = canonical
    return out


def _longest_alias_first(entry: tuple[str, str]) -> int:
    return -len(entry[0])


@lru_cache
def _patterns() -> list[tuple[re.Pattern[str], str]]:
    pats = []
    # Longest aliases first so "react native" wins over "react".
    for alias, canonical in sorted(_alias_map().items(), key=_longest_alias_first):
        pats.append((re.compile(rf"(?<![\w+#.]){re.escape(alias)}(?![\w+#]|\.\w)", re.I), canonical))
    return pats


def canonicalize(term: str) -> str:
    t = term.strip()
    return _alias_map().get(t.lower(), t)


def find_keywords(text: str) -> list[str]:
    """Canonical skills mentioned in `text`, in order of first appearance."""
    hits: list[tuple[int, str]] = []
    seen: set[str] = set()
    for pat, canonical in _patterns():
        m = pat.search(text)
        if m and canonical not in seen:
            seen.add(canonical)
            hits.append((m.start(), canonical))
    return [c for _, c in sorted(hits)]


def resume_text(document: dict) -> str:
    """Flatten a resume document into searchable text."""
    parts: list[str] = [document.get("contact", {}).get("name", "")]
    for s in document.get("sections", []):
        if s["type"] == SectionType.SUMMARY:
            parts.append(s["text"])
        elif s["type"] == SectionType.SKILLS:
            for g in s["groups"]:
                parts.append(g["label"])
                parts.extend(g["items"])
        elif s["type"] in (SectionType.EXPERIENCE, SectionType.PROJECTS):
            for it in s["items"]:
                parts.extend([it.get("company", ""), it.get("title", ""), it.get("name", "")])
                parts.extend(b["text"] for b in it["bullets"])
        elif s["type"] == SectionType.EDUCATION:
            for it in s["items"]:
                parts.extend([it["school"], it.get("degree", ""), it.get("details") or ""])
        elif s["type"] == SectionType.OTHER:
            parts.append(s["title"])
            parts.extend(s["lines"])
    return "\n".join(p for p in parts if p)


def keyword_alignment(document: dict, jd_keywords: list[str]) -> tuple[float, list[str], list[str]]:
    """Share of canonical JD keywords present in the resume (alias-aware)."""
    if not jd_keywords:
        return 1.0, [], []
    have = set(find_keywords(resume_text(document)))
    wanted = [canonicalize(k) for k in dict.fromkeys(jd_keywords)]
    matched = [k for k in wanted if k in have]
    missing = [k for k in wanted if k not in have]
    return len(matched) / len(wanted), matched, missing
