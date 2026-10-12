from dataclasses import dataclass

from app.schemas.enums import BlockKind, SectionType

_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
HEADINGS = {
    SectionType.SUMMARY: "Summary",
    SectionType.SKILLS: "Skills",
    SectionType.EXPERIENCE: "Experience",
    SectionType.PROJECTS: "Projects",
    SectionType.EDUCATION: "Education",
}


@dataclass(frozen=True)
class Block:
    kind: BlockKind
    text: str
    meta: str = ""


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
    out = [Block(BlockKind.NAME, c.get("name", ""))]
    contact = [x for x in [c.get("email"), c.get("phone"), c.get("location"), *c.get("links", [])] if x]
    if contact:
        out.append(Block(BlockKind.CONTACT, "  |  ".join(contact)))
    for s in doc["sections"]:
        t = SectionType(s["type"])
        out.append(Block(BlockKind.HEADING, s["title"] if t is SectionType.OTHER else HEADINGS[t]))
        if t is SectionType.SUMMARY:
            out.append(Block(BlockKind.LINE, s["text"]))
        elif t is SectionType.SKILLS:
            out += [
                Block(BlockKind.LINE, f"{g['label']}: {', '.join(g['items'])}")
                for g in s["groups"]
                if g["items"]
            ]
        elif t is SectionType.EXPERIENCE:
            for it in s["items"]:
                title = " — ".join(x for x in [it["title"], it["company"]] if x)
                out.append(Block(BlockKind.ROLE, title, _range(it.get("start"), it.get("end"))))
                out += [Block(BlockKind.BULLET, b["text"]) for b in it["bullets"]]
        elif t is SectionType.PROJECTS:
            for it in s["items"]:
                out.append(
                    Block(BlockKind.ROLE, " — ".join(x for x in [it["name"], it.get("subtitle")] if x))
                )
                out += [Block(BlockKind.BULLET, b["text"]) for b in it["bullets"]]
        elif t is SectionType.EDUCATION:
            for it in s["items"]:
                out.append(
                    Block(
                        BlockKind.ROLE,
                        " — ".join(x for x in [it["degree"], it["school"]] if x),
                        _range(it.get("start"), it.get("end")),
                    )
                )
                if it.get("details"):
                    out.append(Block(BlockKind.LINE, it["details"]))
        elif t is SectionType.OTHER:
            out += [Block(BlockKind.LINE, ln) for ln in s["lines"]]
    return out
