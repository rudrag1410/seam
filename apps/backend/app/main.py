import logging
from contextlib import asynccontextmanager
from typing import Any
from urllib.parse import urlparse

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import TypeAdapter
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.ai.gateway import build_gateway
from app.ai.gateway.usage import make_db_recorder
from app.api.v1 import api_router, health_router
from app.core.config import Settings, get_settings
from app.core.errors import AppError, ErrorCode, install_error_handlers
from app.db.base import Base
from app.db.session import make_engine, make_sessionmaker
from app.schemas.enums import ApiEnum, ExportFormat, ExportTemplate, StreamEvent
from app.schemas.stream import ErrorEnvelope
from app.services.events import TailorBroker
from app.storage import build_storage

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

_UNSAFE = {"POST", "PUT", "PATCH", "DELETE"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings: Settings = app.state.settings
    engine = make_engine(settings)
    if settings.database_url.startswith("sqlite"):
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    maker = make_sessionmaker(engine)
    app.state.engine = engine
    app.state.sessionmaker = maker
    app.state.ai = build_gateway(settings, make_db_recorder(maker))
    app.state.storage = build_storage(settings)
    app.state.broker = TailorBroker()
    yield
    await app.state.ai.jev.close()
    await engine.dispose()


async def origin_check(request: Request, call_next: RequestResponseEndpoint) -> Response:
    if request.method in _UNSAFE and (origin := request.headers.get("origin")):
        settings: Settings = request.app.state.settings
        allowed = {o.rstrip("/") for o in settings.cors_origin_list}
        if origin.rstrip("/") not in allowed and urlparse(origin).netloc != request.url.netloc:
            return JSONResponse(
                AppError(ErrorCode.CSRF_BLOCKED, "Cross-site request blocked.", status=403).payload(),
                status_code=403,
            )
    return await call_next(request)


CLIENT_ONLY_ENUMS: tuple[type[ApiEnum], ...] = (StreamEvent, ExportFormat, ExportTemplate)


class SeamAPI(FastAPI):
    def openapi(self) -> dict[str, Any]:
        schema = super().openapi()
        for enum in CLIENT_ONLY_ENUMS:
            schema["components"]["schemas"][enum.__name__] = TypeAdapter(enum).json_schema()
        return schema


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = SeamAPI(
        title="Seam API",
        version="0.1.0",
        lifespan=lifespan,
        responses={"default": {"model": ErrorEnvelope, "description": "The request failed."}},
    )
    app.state.settings = settings
    install_error_handlers(app)
    app.add_middleware(BaseHTTPMiddleware, dispatch=origin_check)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Content-Disposition"],
    )
    app.include_router(health_router)
    app.include_router(api_router, prefix="/v1")
    return app


app = create_app()
