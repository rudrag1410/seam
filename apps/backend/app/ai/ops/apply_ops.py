import copy
from typing import Any

from app.schemas.enums import OpName, SectionType

Op = dict[str, Any]


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

    if kind in (OpName.REPLACE_TEXT, OpName.REWRITE_SUMMARY):
        section = next((s for s in doc["sections"] if s["id"] == target), None)
        if section is not None and section["type"] == SectionType.SUMMARY:
            section["text"] = _text_for(op)
            return
        found = _find_bullet_parent(doc, target)
        if found:
            bullets, i = found
            bullets[i]["text"] = _text_for(op)

    elif kind == OpName.REORDER:
        item = _find_item(doc, target)
        if item is None:
            return
        by_id = {b["id"]: b for b in item["bullets"]}
        ordered = [by_id[i] for i in payload["order"] if i in by_id]
        listed = {b["id"] for b in ordered}
        item["bullets"] = ordered + [b for b in item["bullets"] if b["id"] not in listed]

    elif kind == OpName.INSERT_BULLET:
        item = _find_item(doc, target)
        if item is not None:
            item["bullets"].append({"id": payload["new_id"], "text": _text_for(op)})

    elif kind == OpName.REMOVE_BULLET:
        found = _find_bullet_parent(doc, target)
        if found:
            bullets, i = found
            del bullets[i]

    elif kind in (OpName.ADD_SKILL, OpName.REMOVE_SKILL):
        group = _find_group(doc, target)
        if group is None:
            return
        value = (op.get("edited_text") or payload["value"]).strip()
        lowered = [s.lower() for s in group["items"]]
        if kind == OpName.ADD_SKILL and value.lower() not in lowered:
            group["items"].append(value)
        elif kind == OpName.REMOVE_SKILL and value.lower() in lowered:
            group["items"].pop(lowered.index(value.lower()))


def apply_ops(document: dict, ops: list[Op]) -> dict:
    doc = copy.deepcopy(document)
    for op in ops:
        _apply_one(doc, op)
    return doc
