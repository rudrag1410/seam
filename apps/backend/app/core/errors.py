"""Typed application errors. Every error has a stable `code` the frontend maps to copy."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.security import ACCESS_COOKIE, REFRESH_COOKIE, clear_auth_cookies


class AppError(Exception):
    def __init__(
        self,
        code: str,
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
    return AppError("NOT_FOUND", f"{what} not found.", status=404)


def unauthorized(message: str = "Please sign in to continue.") -> AppError:
    return AppError("UNAUTHORIZED", message, status=401)


async def _app_error(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, AppError)
    response = JSONResponse(exc.payload(), status_code=exc.status)
    if exc.code == "UNAUTHORIZED" and (ACCESS_COOKIE in request.cookies or REFRESH_COOKIE in request.cookies):
        # the session is over: drop the dead cookies so the client lands on sign-in and stays there
        clear_auth_cookies(response, request.app.state.settings)
    return response


async def _validation(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    first = exc.errors()[0] if exc.errors() else {}
    loc = ".".join(str(p) for p in first.get("loc", []) if p != "body")
    err = AppError(
        "VALIDATION_FAILED",
        f"{loc}: {first.get('msg', 'Invalid input')}" if loc else "Invalid input.",
        status=422,
    )
    return JSONResponse(err.payload(), status_code=422)


def install_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _app_error)
    app.add_exception_handler(RequestValidationError, _validation)
