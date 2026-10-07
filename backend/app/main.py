import logging
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, hosted_zones, records
from app.core.config import DEFAULT_DEMO_PASSWORD, get_settings
from app.core.errors import register_error_handlers
from app.db.base import Base
from app.db.seed import seed_if_empty
from app.db.session import SessionLocal, engine


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    if settings.cookie_secure and settings.demo_password == DEFAULT_DEMO_PASSWORD:
        logging.getLogger("app").warning("COOKIE_SECURE is on but DEMO_PASSWORD is still the public default; set DEMO_PASSWORD.")
    Base.metadata.create_all(engine)
    if settings.seed_on_startup:
        with SessionLocal() as db:
            seed_if_empty(db)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Route 53 Clone API", version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Content-Type"],
    )
    register_error_handlers(app)

    api = APIRouter(prefix="/api")
    api.include_router(auth.router)
    api.include_router(hosted_zones.router)
    api.include_router(records.router)

    @api.get("/health", tags=["health"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(api)
    return app


app = create_app()
