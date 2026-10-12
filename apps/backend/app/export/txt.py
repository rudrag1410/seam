from app.export.layout import to_blocks
from app.schemas.enums import BlockKind


def render_txt(doc: dict) -> bytes:
    lines: list[str] = []
    for b in to_blocks(doc):
        if b.kind is BlockKind.HEADING:
            lines += ["", b.text.upper()]
        elif b.kind is BlockKind.BULLET:
            lines.append(f"- {b.text}")
        elif b.kind is BlockKind.ROLE:
            lines.append(f"{b.text}  ({b.meta})" if b.meta else b.text)
        else:
            lines.append(b.text)
    return ("\n".join(lines).strip() + "\n").encode()
