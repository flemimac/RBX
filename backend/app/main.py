from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401
from app.api.routes import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine

app = FastAPI(
    title=settings.project_name,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)


@app.on_event("startup")
async def on_startup() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/", summary="Root endpoint")
async def root() -> dict[str, str]:
    return {"message": f"Welcome to {settings.project_name}!"}


app.include_router(api_router, prefix=settings.api_v1_prefix)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


