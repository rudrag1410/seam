import io
from typing import Any, cast
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)

from app.export.layout import Block, to_blocks
from app.schemas.enums import BlockKind, ExportTemplate

_FACES = {
    ExportTemplate.CLASSIC: ("Times-Roman", "Times-Bold"),
    ExportTemplate.MODERN: ("Helvetica", "Helvetica-Bold"),
}


def _styles(template: ExportTemplate) -> dict[str, ParagraphStyle]:
    regular, bold = _FACES.get(template, _FACES[ExportTemplate.CLASSIC])
    base = ParagraphStyle("base", fontName=regular, fontSize=10, leading=13.2)
    return {
        "name": ParagraphStyle(
            "name", parent=base, fontName=bold, fontSize=20, leading=24, alignment=TA_CENTER
        ),
        "contact": ParagraphStyle(
            "contact", parent=base, alignment=TA_CENTER, textColor=colors.HexColor("#444444")
        ),
        "heading": ParagraphStyle(
            "heading", parent=base, fontName=bold, fontSize=10.5, spaceBefore=9, spaceAfter=1
        ),
        "role": ParagraphStyle("role", parent=base, fontName=bold, spaceBefore=4),
        "line": base,
        "bullet": ParagraphStyle("bullet", parent=base, spaceAfter=1),
    }


def _flush_bullets(story: list, bullets: list[Block], style: ParagraphStyle) -> None:
    """Moves the bullets collected so far into the story as one list, and empties the buffer."""
    if not bullets:
        return
    story.append(
        ListFlowable(
            cast(Any, [ListItem(Paragraph(escape(b.text), style), leftIndent=12) for b in bullets]),
            bulletType="bullet",
            start="•",
            leftIndent=12,
            bulletFontSize=8,
        )
    )
    bullets.clear()


def render_pdf(doc: dict, template: ExportTemplate = ExportTemplate.CLASSIC) -> bytes:
    st = _styles(template)
    story: list = []
    bullets: list[Block] = []

    for b in to_blocks(doc):
        if b.kind is BlockKind.BULLET:
            bullets.append(b)
            continue
        _flush_bullets(story, bullets, st["bullet"])
        if b.kind is BlockKind.HEADING:
            story += [
                Paragraph(escape(b.text.upper()), st["heading"]),
                HRFlowable(width="100%", thickness=0.6, color="#222222", spaceAfter=3),
            ]
        elif b.kind is BlockKind.ROLE:
            text = escape(b.text) + (
                f"  <font name='{_FACES.get(template, _FACES[ExportTemplate.CLASSIC])[0]}'>({escape(b.meta)})</font>"
                if b.meta
                else ""
            )
            story.append(Paragraph(text, st["role"]))
        else:
            story.append(Paragraph(escape(b.text), st[b.kind]))
        if b.kind is BlockKind.CONTACT:
            story.append(Spacer(1, 2))
    _flush_bullets(story, bullets, st["bullet"])

    buf = io.BytesIO()
    SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=17 * mm,
        rightMargin=17 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        title=doc["contact"].get("name", "Resume"),
        author=doc["contact"].get("name", ""),
    ).build(story)
    return buf.getvalue()
