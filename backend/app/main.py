from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import pb
from app.routers import configs, opportunities, scans
from app.routers import settings as settings_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: authenticate with PocketBase
    try:
        await pb.connect()
    except Exception as exc:
        logger.warning("PocketBase connection failed at startup: %s", exc)
    yield
    # Shutdown
    await pb.disconnect()


app = FastAPI(
    title="AlcSaaS API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(scans.router)
app.include_router(opportunities.router)
app.include_router(configs.router)
app.include_router(settings_router.router)


@app.get("/health", tags=["health"])
def health():
    pb_ok = pb._token is not None
    return {"status": "ok", "pocketbase": "connected" if pb_ok else "disconnected"}
