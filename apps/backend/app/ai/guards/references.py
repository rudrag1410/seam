"""Reference check: drop suggestions that point at nodes which don't exist."""

from app.schemas.enums import OpName, SectionType
from app.schemas.suggestion import ModelSuggestion

SECTION_OF_OP_TARGET = {"summary": "summary", "skills": "skills"}


def node_index(document: dict) -> dict[str, tuple[str, str]]:
    """node id -> (kind, section type). Kinds: section, item, bullet, group."""
    index: dict[str, tuple[str, str]] = {}
    for s in document["sections"]:
        index[s["id"]] = ("section", s["type"])
        for g in s.get("groups", []):
            index[g["id"]] = ("group", s["type"])
        for it in s.get("items", []):
            index[it["id"]] = ("item", s["type"])
            for b in it.get("bullets", []):
                index[b["id"]] = ("bullet", s["type"])
    return index


def bullet_text(document: dict) -> dict[str, str]:
    out: dict[str, str] = {}
    for s in document["sections"]:
        if s["type"] == SectionType.SUMMARY:
            out[s["id"]] = s["text"]
        for it in s.get("items", []):
            for b in it.get("bullets", []):
                out[b["id"]] = b["text"]
    return out


_EXPECTED_KIND = {
    OpName.REPLACE_TEXT: {"bullet", "section"},
    OpName.REWRITE_SUMMARY: {"section"},
    OpName.REORDER: {"item"},
    OpName.INSERT_BULLET: {"item"},
    OpName.REMOVE_BULLET: {"bullet"},
    OpName.ADD_SKILL: {"group"},
    OpName.REMOVE_SKILL: {"group"},
}


def is_valid_reference(s: ModelSuggestion, index: dict[str, tuple[str, str]], allowed: set[str]) -> bool:
    """True when the target exists, is the right kind for the op, and sits in a requested section."""
    entry = index.get(s.target)
    if entry is None or entry[0] not in _EXPECTED_KIND[s.op] or entry[1] not in allowed:
        return False
    if s.op == OpName.REWRITE_SUMMARY and entry[1] != "summary":
        return False
    if s.op == OpName.REORDER:
        return bool(s.order) and all(i in index and index[i][0] == "bullet" for i in s.order)
    if s.op in (OpName.REPLACE_TEXT, OpName.REWRITE_SUMMARY, OpName.INSERT_BULLET):
        return bool(s.after and s.after.strip())
    if s.op in (OpName.ADD_SKILL, OpName.REMOVE_SKILL):
        return bool(s.value and s.value.strip())
    return True


def scrub_evidence(s: ModelSuggestion, index: dict[str, tuple[str, str]]) -> None:
    s.evidence = [e for e in s.evidence if e in index]
