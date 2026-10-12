"""Upload validation by magic bytes, not by extension."""

import io
import zipfile
from dataclasses import dataclass

from app.core.config import Settings
from app.core.errors import AppError, ErrorCode
from app.schemas.enums import FileKind

_SIGNATURES = {
    b"\x89PNG": "a PNG image",
    b"\xff\xd8\xff": "a JPEG image",
    b"GIF8": "a GIF image",
    b"PK\x03\x04": "a ZIP archive",
    b"{\\rtf": "an RTF document",
}


@dataclass(frozen=True)
class ValidatedFile:
    kind: FileKind
    mime: str


def validate_upload(data: bytes, filename: str, settings: Settings) -> ValidatedFile:
    if not data:
        raise AppError(ErrorCode.FILE_EMPTY, "That file is empty.", hint="Choose your resume PDF or DOCX.")
    if len(data) > settings.max_upload_bytes:
        mb = len(data) / 1024 / 1024
        raise AppError(
            ErrorCode.FILE_TOO_LARGE,
            f"That file is {mb:.1f} MB. The limit is {settings.max_upload_mb} MB.",
            status=413,
            hint="Export a smaller copy and try again.",
        )
    if data.startswith(b"%PDF-"):
        return ValidatedFile(FileKind.PDF, "application/pdf")
    if data.startswith(b"PK\x03\x04"):
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                if "word/document.xml" in z.namelist():
                    return ValidatedFile(
                        FileKind.DOCX,
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    )
        except zipfile.BadZipFile:
            pass
    detected = next((label for sig, label in _SIGNATURES.items() if data.startswith(sig)), None)
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "file"
    raise AppError(
        ErrorCode.FILE_TYPE_UNSUPPORTED,
        f"That's {detected or f'a .{ext} file'}. Upload a PDF or DOCX.",
        status=415,
        hint="Resumes must be PDF or DOCX files.",
    )
