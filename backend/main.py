from __future__ import annotations

# FastAPI entry point: templates, scenes, finalize-stroke, export.

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import (
    boundary,
    export,
    hideout_maps,
    input_images,
    templates,
    tools,
    view_port,
)
from hideout_core.config.settings import settings


@asynccontextmanager
async def lifespan(_app: FastAPI):
    from backend.services import maps_repo

    maps_repo.init_db()
    yield


app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_allow_methods,
    allow_headers=settings.cors_allow_headers,
)
app.include_router(templates.router, prefix="/api")
app.include_router(boundary.router, prefix="/api")
app.include_router(hideout_maps.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(view_port.router, prefix="/api")
app.include_router(tools.router, prefix="/api")
app.include_router(input_images.router, prefix="/api")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
