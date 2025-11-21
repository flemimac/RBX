from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.crud.route import (
    create_route,
    get_routes_by_user,
    delete_route as delete_route_db,
    get_route_by_id,
    update_route,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.route import RouteCreate, RouteRead

router = APIRouter()


@router.get("/", response_model=list[RouteRead])
async def list_routes(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> list[RouteRead]:
    routes = await get_routes_by_user(session, current_user.id)
    return [
        RouteRead(
            id=route.id,
            name=route.name,
            description=route.description,
            user_id=route.user_id,
            files=[],
        )
        for route in routes
    ]


@router.post("/", response_model=RouteRead, status_code=status.HTTP_201_CREATED)
async def create_route_endpoint(
    route_data: RouteCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> RouteRead:
    route = await create_route(session, route_data.name, current_user.id, route_data.description)
    return RouteRead(
        id=route.id,
        name=route.name,
        description=route.description,
        user_id=route.user_id,
        files=[],
    )


@router.put("/{route_id}", response_model=RouteRead)
async def update_route_endpoint(
    route_id: str,
    route_data: RouteCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> RouteRead:
    route = await update_route(
        session,
        route_id,
        current_user.id,
        route_data.name,
        route_data.description,
    )
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Маршрут не найден",
        )
    return RouteRead(
        id=route.id,
        name=route.name,
        description=route.description,
        user_id=route.user_id,
        files=[],
    )


@router.delete("/{route_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_route_endpoint(
    route_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> None:
    success = await delete_route_db(session, route_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Маршрут не найден",
        )


@router.post("/{route_id}/files", status_code=status.HTTP_200_OK)
async def upload_files(
    route_id: str,
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    route = await get_route_by_id(session, route_id, current_user.id)
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Маршрут не найден",
        )

    uploaded_files = []
    for file in files:
        content = await file.read()
        uploaded_files.append(file.filename)

    return {
        "message": f"Загружено файлов: {len(uploaded_files)}",
        "files": ", ".join(uploaded_files),
    }

