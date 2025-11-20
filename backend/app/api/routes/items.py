from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter()


@router.get("/", summary="List sample items")
async def list_items(current_user: User = Depends(get_current_user)) -> list[dict[str, str]]:
    return [{"id": "demo-1", "name": "Sample item"}]


@router.post("/", summary="Create a sample item")
async def create_item(
    item: dict[str, str],
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    return {"message": "Item created", "item": item}


