from fastapi import APIRouter

from app.api.routes import auth, health, items

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router)
api_router.include_router(items.router, prefix="/items", tags=["items"])


