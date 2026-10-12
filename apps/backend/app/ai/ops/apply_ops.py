"""Pure function that applies accepted suggestion ops to a resume document.

Mirrored by `packages/resume-core/src/apply-ops.ts`; both run the shared vectors in
`packages/fixtures/apply-ops`. Operates on plain dicts so it is trivially portable.
"""

import copy
from typing import Any

Op = dict[str, Any]  # {op, target, payload, edited_text?}


def _find_bullet_parent(doc: dict, bullet_id: str) -> tuple[list, int] | None:
    for section in doc["sections"]:
        for item in section.get("items", []):
            bullets = item.get("bullets")
            if bullets is None:
                continue
            for i, b in enumerate(bullets):
                if b["id"] == bullet_id:
                    return bullets, i
    return None


def _find_item(doc: dict, item_id: str) -> dict | None:
    for section in doc["sections"]:
        for item in section.get("items", []):
            if item["id"] == item_id:
                return item
    return None


def _find_group(doc: dict, group_id: str) -> dict | None:
    for section in doc["sections"]:
        for group in section.get("groups", []):
            if group["id"] == group_id:
                return group
    return None


def _text_for(op: Op) -> str:
    edited = op.get("edited_text")
    return edited if edited else op["payload"].get("after", "")


def _apply_one(doc: dict, op: Op) -> None:
    kind, target, payload = op["op"], op["target"], op["payload"]

    if kind in ("replace_text", "rewrite_summary"):
        section = next((s for s in doc["sections"] if s["id"] == target), None)
        if section is not None and section["type"] == "summary":
            section["text"] = _text_for(op)
            return
        found = _find_bullet_parent(doc, target)
        if found:
            bullets, i = found
            bullets[i]["text"] = _text_for(op)

    elif kind == "reorder":
        item = _find_item(doc, target)
        if item is None:
            return
        by_id = {b["id"]: b for b in item["bullets"]}
        ordered = [by_id[i] for i in payload["order"] if i in by_id]
        listed = {b["id"] for b in ordered}
        item["bullets"] = ordered + [b for b in item["bullets"] if b["id"] not in listed]

    elif kind == "insert_bullet":
        item = _find_item(doc, target)
        if item is not None:
            item["bullets"].append({"id": payload["new_id"], "text": _text_for(op)})

    elif kind == "remove_bullet":
        found = _find_bullet_parent(doc, target)
        if found:
            bullets, i = found
            del bullets[i]

    elif kind in ("add_skill", "remove_skill"):
        group = _find_group(doc, target)
        if group is None:
            return
        value = (op.get("edited_text") or payload["value"]).strip()
        lowered = [s.lower() for s in group["items"]]
        if kind == "add_skill" and value.lower() not in lowered:
            group["items"].append(value)
        elif kind == "remove_skill" and value.lower() in lowered:
            group["items"].pop(lowered.index(value.lower()))


def apply_ops(document: dict, ops: list[Op]) -> dict:
    """Return a new document with `ops` applied in order. The input is never mutated."""
    doc = copy.deepcopy(document)
    for op in ops:
        _apply_one(doc, op)
    return doc
