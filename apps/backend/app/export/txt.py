from app.export.layout import to_blocks


def render_txt(doc: dict) -> bytes:
    lines: list[str] = []
    for b in to_blocks(doc):
        if b.kind == "heading":
            lines += ["", b.text.upper()]
        elif b.kind == "bullet":
            lines.append(f"- {b.text}")
        elif b.kind == "role":
            lines.append(f"{b.text}  ({b.meta})" if b.meta else b.text)
        else:
            lines.append(b.text)
    return ("\n".join(lines).strip() + "\n").encode()
