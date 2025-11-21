import os
import uuid
import json
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_current_user_optional
from app.core.config import settings
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
from app.services.image_processor import get_image_processor

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
) -> dict:
    route = await get_route_by_id(session, route_id, current_user.id)
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Маршрут не найден",
        )

    uploaded_files = []
    processed_files = []
    
    # Создаем директорию для маршрута
    route_upload_dir = settings.upload_dir / route_id
    route_processed_dir = settings.processed_dir / route_id
    route_upload_dir.mkdir(parents=True, exist_ok=True)
    route_processed_dir.mkdir(parents=True, exist_ok=True)

    # Пытаемся получить процессор изображений
    processor = None
    try:
        processor = get_image_processor()
    except Exception as e:
        print(f"⚠️ Процессор изображений недоступен: {e}")
        print("⚠️ Изображения будут загружены без обработки ИИ")

    # Загружаем метаданные один раз перед циклом
    metadata_file = route_upload_dir / "metadata.json"
    metadata = {}
    if metadata_file.exists():
        try:
            with open(metadata_file, "r", encoding="utf-8") as f:
                metadata = json.load(f)
        except:
            metadata = {}

    for file in files:
        content = await file.read()
        filename = file.filename or "unknown"
        file_ext = Path(filename).suffix
        
        # Проверяем, есть ли уже файл с таким именем (дубликат)
        duplicate_file_id = None
        for existing_file_id, file_meta in list(metadata.items()):
            if file_meta.get("original_name") == filename:
                duplicate_file_id = existing_file_id
                break
        
        # Если найден дубликат, удаляем старый файл
        if duplicate_file_id:
            print(f"🔄 Найден дубликат файла '{filename}', удаляем старую версию")
            
            # Удаляем оригинальный файл
            original_files = list(route_upload_dir.glob(f"{duplicate_file_id}.*"))
            for original_file in original_files:
                if original_file.exists():
                    original_file.unlink()
            
            # Удаляем обработанное изображение
            processed_path = route_processed_dir / f"{duplicate_file_id}_processed.jpg"
            if processed_path.exists():
                processed_path.unlink()
            
            # Удаляем из метаданных
            if duplicate_file_id in metadata:
                del metadata[duplicate_file_id]
            
            # Сохраняем метаданные сразу после удаления дубликата
            with open(metadata_file, "w", encoding="utf-8") as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        # Сохраняем новый файл
        file_id = str(uuid.uuid4())
        original_path = route_upload_dir / f"{file_id}{file_ext}"
        
        with open(original_path, "wb") as f:
            f.write(content)
        
        uploaded_files.append(filename)
        
        # Сохраняем метаданные о файле
        metadata[file_id] = {
            "original_name": filename,
            "file_ext": file_ext,
        }
        
        # Если это изображение и процессор доступен, обрабатываем его
        if processor and processor.is_image_file(filename):
            try:
                # Обрабатываем изображение через ONNX модель
                result = processor.process_image(content)
                
                # Сохраняем обработанное изображение
                processed_path = route_processed_dir / f"{file_id}_processed.jpg"
                with open(processed_path, "wb") as f:
                    f.write(result['image_bytes'])
                
                # Сохраняем статистику дефектов в метаданных
                metadata[file_id]['red_detection_count'] = result['red_detection_count']
                metadata[file_id]['green_detection_count'] = result['green_detection_count']
                metadata[file_id]['has_red_detections'] = result['has_red_detections']
                metadata[file_id]['has_green_detections'] = result['has_green_detections']
                metadata[file_id]['total_detections'] = result['total_detections']
                
                processed_files.append({
                    "original": filename,
                    "processed_id": file_id,
                    "processed_path": f"/api/routes/{route_id}/files/{file_id}/processed"
                })
            except Exception as e:
                # Если обработка не удалась, все равно сохраняем оригинал
                print(f"Ошибка обработки изображения {filename}: {e}")
                processed_files.append({
                    "original": filename,
                    "processed_id": file_id,
                    "error": f"Ошибка обработки: {str(e)}"
                })
        elif processor and not processor.is_image_file(filename):
            # Для не-изображений просто сохраняем оригинал
            processed_files.append({
                "original": filename,
                "file_id": file_id,
                "note": "Файл не является изображением"
            })
        else:
            # Процессор недоступен - просто сохраняем информацию о файле
            processed_files.append({
                "original": filename,
                "file_id": file_id,
                "note": "Обработка ИИ недоступна" if processor is None else "Файл не является изображением"
            })
    
    # Сохраняем обновленные метаданные после обработки всех файлов
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    return {
        "message": f"Загружено файлов: {len(uploaded_files)}",
        "files": uploaded_files,
        "processed_files": processed_files,
    }


@router.get("/{route_id}/files/{file_id}/processed")
async def get_processed_file(
    route_id: str,
    file_id: str,
    current_user: User = Depends(get_current_user_optional),
    session: AsyncSession = Depends(get_db),
) -> Response:
    """Получить обработанное изображение"""
    route = await get_route_by_id(session, route_id, current_user.id)
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Маршрут не найден",
        )
    
    processed_path = settings.processed_dir / route_id / f"{file_id}_processed.jpg"
    
    if not processed_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Обработанное изображение не найдено",
        )
    
    with open(processed_path, "rb") as f:
        content = f.read()
    
    return Response(content=content, media_type="image/jpeg")


@router.delete("/{route_id}/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    route_id: str,
    file_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> None:
    """Удалить файл и его обработанную версию"""
    route = await get_route_by_id(session, route_id, current_user.id)
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Маршрут не найден",
        )
    
    # Удаляем оригинальный файл
    route_upload_dir = settings.upload_dir / route_id
    original_files = list(route_upload_dir.glob(f"{file_id}.*"))
    for original_file in original_files:
        if original_file.exists():
            original_file.unlink()
    
    # Удаляем обработанное изображение
    processed_path = settings.processed_dir / route_id / f"{file_id}_processed.jpg"
    if processed_path.exists():
        processed_path.unlink()
    
    # Удаляем метаданные о файле
    metadata_file = route_upload_dir / "metadata.json"
    if metadata_file.exists():
        try:
            with open(metadata_file, "r", encoding="utf-8") as f:
                metadata = json.load(f)
            if file_id in metadata:
                del metadata[file_id]
            with open(metadata_file, "w", encoding="utf-8") as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
        except:
            pass
    
    return None


@router.get("/{route_id}/files")
async def list_route_files(
    route_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Получить список файлов маршрута"""
    route = await get_route_by_id(session, route_id, current_user.id)
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Маршрут не найден",
        )
    
    route_upload_dir = settings.upload_dir / route_id
    route_processed_dir = settings.processed_dir / route_id
    
    processed_files = []
    
    # Загружаем метаданные о файлах
    metadata_file = route_upload_dir / "metadata.json"
    metadata = {}
    if metadata_file.exists():
        try:
            with open(metadata_file, "r", encoding="utf-8") as f:
                metadata = json.load(f)
        except:
            metadata = {}
    
    # Сканируем директорию с обработанными изображениями
    if route_processed_dir.exists():
        for processed_file in route_processed_dir.glob("*_processed.jpg"):
            # Извлекаем file_id из имени файла (формат: {file_id}_processed.jpg)
            file_id = processed_file.stem.replace("_processed", "")
            
            # Проверяем, что обработанный файл действительно существует
            if not processed_file.exists():
                continue
            
            # Получаем оригинальное имя из метаданных
            original_name = f"image_{file_id}"  # Значение по умолчанию
            if file_id in metadata and "original_name" in metadata[file_id]:
                original_name = metadata[file_id]["original_name"]
            
            # Проверяем, существует ли оригинальный файл
            original_files = list(route_upload_dir.glob(f"{file_id}.*"))
            if original_files and any(f.exists() for f in original_files):
                processed_files.append({
                    "original": original_name,
                    "processed_id": file_id,
                    "processed_path": f"/api/routes/{route_id}/files/{file_id}/processed"
                })

    return {
        "files": processed_files,
    }


@router.get("/{route_id}/stats")
async def get_route_stats(
    route_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Получить статистику по маршруту"""
    route = await get_route_by_id(session, route_id, current_user.id)
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Маршрут не найден",
        )
    
    route_upload_dir = settings.upload_dir / route_id
    route_processed_dir = settings.processed_dir / route_id
    
    # Загружаем метаданные о файлах
    metadata_file = route_upload_dir / "metadata.json"
    metadata = {}
    if metadata_file.exists():
        try:
            with open(metadata_file, "r", encoding="utf-8") as f:
                metadata = json.load(f)
        except:
            metadata = {}
    
    # Подсчитываем статистику
    total_processed = 0
    with_green_detections = 0  # Изображения с зелеными детекциями (без красных)
    with_red_detections = 0    # Изображения с красными детекциями
    
    # Сканируем директорию с обработанными изображениями
    if route_processed_dir.exists():
        for processed_file in route_processed_dir.glob("*_processed.jpg"):
            file_id = processed_file.stem.replace("_processed", "")
            
            # Проверяем, что обработанный файл действительно существует
            if not processed_file.exists():
                continue
            
            # Проверяем, существует ли оригинальный файл
            original_files = list(route_upload_dir.glob(f"{file_id}.*"))
            if original_files and any(f.exists() for f in original_files):
                total_processed += 1
                
                # Проверяем метаданные на наличие информации о детекциях
                if file_id in metadata:
                    has_red = metadata[file_id].get('has_red_detections', False)
                    has_green = metadata[file_id].get('has_green_detections', False)
                    total_detections = metadata[file_id].get('total_detections', 0)
                    
                    # Если есть детекции (любые)
                    if total_detections > 0:
                        if has_red:
                            # Если есть красные детекции, считаем это изображение с дефектами
                            with_red_detections += 1
                        elif has_green:
                            # Если есть только зеленые детекции (без красных), считаем это изображение без дефектов
                            with_green_detections += 1
                    # Если нет детекций (total_detections == 0), не считаем ни в одну категорию
                # Если нет метаданных, не считаем ни в одну категорию
    
    return {
        "total_processed": total_processed,
        "with_green_detections": with_green_detections,
        "with_red_detections": with_red_detections,
    }

