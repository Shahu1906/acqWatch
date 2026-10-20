"""
AcqWatch FastAPI Application Factory.
Entry point: uvicorn acqwatch.main:app --host 127.0.0.1 --port 8080 --reload
"""

from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from acqwatch.config import get_settings
from acqwatch.api.deps import get_adapter, get_repository
from acqwatch.api.routers import (
    explain,
    filters,
    health,
    map,
    model_status,
    overview,
    predict,
    projects,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("acqwatch")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model and dataset once at startup."""
    cfg = get_settings()
    logger.info("AcqWatch backend starting — loading model and dataset…")
    try:
        adapter = get_adapter()
        repo = get_repository()   # triggers load() on first call
        logger.info(
            "Startup complete. Dataset: %d projects | Model: %s",
            repo.total_projects,
            adapter.model_id if adapter.is_available else "UNAVAILABLE"
        )
    except Exception:
        logger.exception("Startup error — server will continue but may be degraded")
    yield
    logger.info("AcqWatch backend shutting down.")


def create_app() -> FastAPI:
    cfg = get_settings()

    app = FastAPI(
        title="AcqWatch — Land Acquisition Risk Intelligence API",
        description=(
            "Evidence-oriented backend for infrastructure project risk analysis. "
            "Serves 1,477 verified MoSPI projects with existing Gradient Boosting delay-risk model."
        ),
        version="2.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # CORS — restricted to configured origins
    origins = cfg.origins_list
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    # Global exception handler — never exposes internal traces
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error. Please contact the system administrator."},
        )

    # Root info
    @app.get("/", tags=["Root"])
    def root():
        return {
            "system": "AcqWatch — Land Acquisition Risk Intelligence",
            "version": "2.0.0",
            "dataset": "MoSPI Central Sector Projects — 1,477 verified records",
            "docs": "/docs",
            "health": "/api/health",
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        }

    # Register all routers
    app.include_router(health.router)
    app.include_router(overview.router)
    app.include_router(projects.router)
    app.include_router(map.router)
    app.include_router(predict.router)
    app.include_router(explain.router)
    app.include_router(filters.router)
    app.include_router(model_status.router)

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    cfg = get_settings()
    uvicorn.run("acqwatch.main:app", host=cfg.host, port=cfg.port, reload=True, log_level=cfg.log_level.lower())
