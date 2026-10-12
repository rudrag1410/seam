from dataclasses import dataclass, field

import pymupdf as fitz  # PyMuPDF

from app.core.config import Settings
from app.core.errors import AppError, ErrorCode


@dataclass
class ExtractedDocument:
    text: str
    page_count: int
    pages_text: list[str]
    links: list[str] = field(default_factory=list)  # hyperlink targets (LinkedIn/GitHub are often just words)


def extract_pdf(data: bytes, settings: Settings) -> ExtractedDocument:
    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception as exc:
        raise AppError(
            ErrorCode.FILE_CORRUPT, "We couldn't open that PDF.", hint="Re-export it and try again."
        ) from exc
    with doc:
        if doc.needs_pass:
            raise AppError(
                ErrorCode.PDF_PASSWORD_PROTECTED,
                "This PDF is password-protected.",
                hint="Export an unlocked copy and upload that.",
            )
        if doc.page_count > settings.max_pages:
            raise AppError(
                ErrorCode.TOO_MANY_PAGES,
                f"Resumes over {settings.max_pages} pages aren't supported. Is this the right file?",
            )
        pages = [str(page.get_text("text", sort=True)) for page in doc]
        links = [
            link["uri"]
            for page in doc
            for link in page.get_links()
            if str(link.get("uri", "")).startswith(("http://", "https://"))
        ]
    return ExtractedDocument("\n".join(pages).strip(), len(pages), pages, links)


def render_pages(data: bytes, settings: Settings, zoom: float = 1.6) -> list[bytes]:
    """PNG renders of each page, for the vision path."""
    with fitz.open(stream=data, filetype="pdf") as doc:
        return [
            page.get_pixmap(matrix=fitz.Matrix(zoom, zoom)).tobytes("png")
            for page in [doc[i] for i in range(min(doc.page_count, settings.max_pages))]
        ]
