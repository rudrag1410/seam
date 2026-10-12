from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.security import ACCESS_COOKIE, REFRESH_COOKIE, clear_auth_cookies
from app.schemas.enums import ApiEnum


class ErrorCode(ApiEnum):
    CSRF_BLOCKED = "CSRF_BLOCKED"
    EMAIL_TAKEN = "EMAIL_TAKEN"
    EXPORT_FAILED = "EXPORT_FAILED"
    FILE_CORRUPT = "FILE_CORRUPT"
    FILE_EMPTY = "FILE_EMPTY"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    FILE_TYPE_UNSUPPORTED = "FILE_TYPE_UNSUPPORTED"
    FORMAT_UNSUPPORTED = "FORMAT_UNSUPPORTED"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    JD_EMPTY = "JD_EMPTY"
    JD_NOT_A_JD = "JD_NOT_A_JD"
    JD_TOO_LONG = "JD_TOO_LONG"
    JD_TOO_SHORT = "JD_TOO_SHORT"
    JD_UNREADABLE = "JD_UNREADABLE"
    LLM_NOT_CONFIGURED = "LLM_NOT_CONFIGURED"
    LLM_UNAVAILABLE = "LLM_UNAVAILABLE"
    NOT_FOUND = "NOT_FOUND"
    NO_JD = "NO_JD"
    PDF_PASSWORD_PROTECTED = "PDF_PASSWORD_PROTECTED"
    REGENERATE_EMPTY = "REGENERATE_EMPTY"
    RESUME_UNREADABLE = "RESUME_UNREADABLE"
    SESSION_NOT_READY = "SESSION_NOT_READY"
    TAILOR_FAILED = "TAILOR_FAILED"
    TEMPLATE_UNSUPPORTED = "TEMPLATE_UNSUPPORTED"
    TOO_MANY_PAGES = "TOO_MANY_PAGES"
    UNAUTHORIZED = "UNAUTHORIZED"
    VALIDATION_FAILED = "VALIDATION_FAILED"


class AppError(Exception):
    def __init__(
        self,
        code: ErrorCode,
        message: str,
        *,
        status: int = 400,
        hint: str | None = None,
        retryable: bool = False,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
        self.hint = hint
        self.retryable = retryable

    def payload(self) -> dict:
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "hint": self.hint,
                "retryable": self.retryable,
            }
        }


def not_found(what: str) -> AppError:
    return AppError(ErrorCode.NOT_FOUND, f"{what} not found.", status=404)


def unauthorized(message: str = "Please sign in to continue.") -> AppError:
    return AppError(ErrorCode.UNAUTHORIZED, message, status=401)


async def _app_error(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, AppError)
    response = JSONResponse(exc.payload(), status_code=exc.status)
    if exc.code == ErrorCode.UNAUTHORIZED and (
        ACCESS_COOKIE in request.cookies or REFRESH_COOKIE in request.cookies
    ):
        clear_auth_cookies(response, request.app.state.settings)
    return response


async def _validation(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    first = exc.errors()[0] if exc.errors() else {}
    loc = ".".join(str(p) for p in first.get("loc", []) if p != "body")
    err = AppError(
        ErrorCode.VALIDATION_FAILED,
        f"{loc}: {first.get('msg', 'Invalid input')}" if loc else "Invalid input.",
        status=422,
    )
    return JSONResponse(err.payload(), status_code=422)


def install_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _app_error)
    app.add_exception_handler(RequestValidationError, _validation)
