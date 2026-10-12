"""Flatten a resume document into plain blocks shared by every export format.
Plain, single-column, no tables or images: ATS-safe by construction."""

from dataclasses import dataclass
from typing import Literal

_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
Kind = Literal["name", "contact", "heading", "role", "line", "bullet"]
HEADINGS = {
    "summary": "Summary",
    "skills": "Skills",
    "experience": "Experience",
    "projects": "Projects",
    "education": "Education",
}


@dataclass(frozen=True)
class Block:
    kind: Kind
    text: str
    meta: str = ""  # role: dates


def fmt_date(value: str | None) -> str:
    if not value:
        return ""
    if value.lower() in ("present", "current", "now"):
        return "Present"
    if len(value) >= 7 and value[4] == "-" and value[5:7].isdigit():
        return f"{_MONTHS[int(value[5:7]) - 1]} {value[:4]}"
    return value


def _range(start: str | None, end: str | None) -> str:
    s, e = fmt_date(start), fmt_date(end)
    return f"{s} – {e}" if s and e else s or e


def to_blocks(doc: dict) -> list[Block]:
    c = doc["contact"]
    out = [Block("name", c.get("name", ""))]
    contact = [x for x in [c.get("email"), c.get("phone"), c.get("location"), *c.get("links", [])] if x]
    if contact:
        out.append(Block("contact", "  |  ".join(contact)))
    for s in doc["sections"]:
        t = s["type"]
        out.append(Block("heading", s["title"] if t == "other" else HEADINGS[t]))
        if t == "summary":
            out.append(Block("line", s["text"]))
        elif t == "skills":
            out += [
                Block("line", f"{g['label']}: {', '.join(g['items'])}") for g in s["groups"] if g["items"]
            ]
        elif t == "experience":
            for it in s["items"]:
                title = " — ".join(x for x in [it["title"], it["company"]] if x)
                out.append(Block("role", title, _range(it.get("start"), it.get("end"))))
                out += [Block("bullet", b["text"]) for b in it["bullets"]]
        elif t == "projects":
            for it in s["items"]:
                out.append(Block("role", " — ".join(x for x in [it["name"], it.get("subtitle")] if x)))
                out += [Block("bullet", b["text"]) for b in it["bullets"]]
        elif t == "education":
            for it in s["items"]:
                out.append(
                    Block(
                        "role",
                        " — ".join(x for x in [it["degree"], it["school"]] if x),
                        _range(it.get("start"), it.get("end")),
                    )
                )
                if it.get("details"):
                    out.append(Block("line", it["details"]))
        elif t == "other":
            out += [Block("line", ln) for ln in s["lines"]]
    return out
