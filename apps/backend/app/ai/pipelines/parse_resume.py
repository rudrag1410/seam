import asyncio
import logging
from dataclasses import dataclass

from app.ai.gateway import AIGateway
from app.ai.gateway.router import Task
from app.ai.limits import clip
from app.ai.prompts.registry import render
from app.core.config import Settings
from app.core.errors import AppError, ErrorCode
from app.parsing.consistency import unmatched_ratio
from app.parsing.docx import extract_docx
from app.parsing.heuristic import heuristic_parse, merge_links
from app.parsing.ids import build_resume
from app.parsing.pdf import ExtractedDocument, extract_pdf, render_pages
from app.parsing.quality import choose_path
from app.parsing.validate import ValidatedFile
from app.schemas.enums import FileKind, ParsePath
from app.schemas.parsed import ParsedResume
from app.schemas.resume_ast import Resume

log = logging.getLogger("seam.parse")
_MAX_UNMATCHED = 0.25
_AI_ERRORS = {ErrorCode.LLM_UNAVAILABLE, ErrorCode.LLM_NOT_CONFIGURED}


@dataclass
class ParseResult:
    resume: Resume
    page_count: int
    path: ParsePath
    text: str


async def _vision(ai: AIGateway, settings: Settings, data: bytes) -> ParsedResume:
    images = await asyncio.to_thread(render_pages, data, settings)
    return await ai.generate.vision_structured(
        Task.PARSE_VISION,
        system=render(settings.prompt_version, "parse_structure"),
        user="These are the pages of a resume, in order. Convert them to the JSON structure.",
        images=images,
        schema=ParsedResume,
    )


async def _structure(
    ai: AIGateway, settings: Settings, data: bytes, doc: ExtractedDocument, file: ValidatedFile
) -> tuple[ParsedResume, ParsePath]:
    can_vision = file.kind is FileKind.PDF and settings.has_llm
    path = await choose_path(ai, doc.text, doc.page_count) if file.kind is FileKind.PDF else ParsePath.TEXT

    if path is ParsePath.VISION and not can_vision:
        if len(doc.text) < 80:
            raise AppError(
                ErrorCode.RESUME_UNREADABLE,
                "This looks like a scanned resume, and reading images needs AI to be set up.",
                hint="Upload a PDF exported from Word or Google Docs, or add OPENAI_API_KEY.",
            )
        path = ParsePath.TEXT

    if settings.has_llm:
        try:
            if path is ParsePath.VISION:
                return await _vision(ai, settings, data), ParsePath.VISION
            parsed = await ai.generate.structured(
                Task.PARSE_STRUCTURE,
                system=render(settings.prompt_version, "parse_structure"),
                user=f"<resume_text>\n{clip(doc.text, settings.llm_max_resume_tokens)}\n</resume_text>",
                schema=ParsedResume,
                context={"text": doc.text},
            )
            if can_vision and unmatched_ratio(parsed, doc.text) > _MAX_UNMATCHED:
                log.info("consistency check failed on the text path, retrying with vision")
                return await _vision(ai, settings, data), ParsePath.VISION
            return parsed, ParsePath.TEXT
        except AppError as exc:
            if exc.code not in _AI_ERRORS:
                raise
            log.warning("AI structuring unavailable (%s); using the built-in parser", exc.code)

    return heuristic_parse(doc.text, doc.links), ParsePath.BASIC


async def parse_resume(ai: AIGateway, settings: Settings, data: bytes, file: ValidatedFile) -> ParseResult:
    extract = extract_pdf if file.kind is FileKind.PDF else extract_docx
    doc: ExtractedDocument = await asyncio.to_thread(extract, data, settings)
    if len(doc.text) < 80:
        raise AppError(
            ErrorCode.RESUME_UNREADABLE,
            "We couldn't find any text in that file.",
            hint="If it's a scan, upload a PDF exported from Word or Google Docs.",
        )

    parsed, path = await _structure(ai, settings, data, doc, file)
    parsed.contact.links = merge_links(parsed.contact.links, doc.links)

    resume = build_resume(parsed)
    if not resume.sections:
        raise AppError(
            ErrorCode.RESUME_UNREADABLE,
            "We couldn't find resume content in that file.",
            hint="Check that it's your resume and that the text is selectable.",
        )
    return ParseResult(resume, doc.page_count, path, doc.text)
