import React, { useState, useEffect } from 'react';
import { DragDropZone } from '../ui/DragDropZone';
import { validateFiles } from '../../utils';
import { apiService, type ProcessedFile } from '../../services';
import type { Route } from '../../types';
import { ImageModal } from './ImageModal';
import { CreateRouteWithFilesModal } from './CreateRouteWithFilesModal';
import { FilterModal, type PriorityMode, type SortMode } from './FilterModal';
import { ConfirmModal } from '../ui/ConfirmModal';
import './RouteView.css';

interface RouteViewProps {
  route: Route | null;
  onFilesUpload: (routeId: string, files: File[]) => Promise<void>;
  onEdit: (route: Route) => void;
  onDelete: (route: Route) => void;
  onAddRoute?: () => void;
  onCreateRouteWithFiles?: (name: string, description: string | undefined, files: File[]) => Promise<void>;
  uploadProgress?: { current: number; total: number } | null;
}

interface ProcessedImage {
  id: string;
  originalName: string;
  processedUrl: string;
  error?: string;
  greenDetectionCount?: number;
  redDetectionCount?: number;
  hasGreenDetections?: boolean;
  hasRedDetections?: boolean;
  totalDetections?: number;
}

export const RouteView: React.FC<RouteViewProps> = ({
  route,
  onFilesUpload,
  onEdit,
  onDelete,
  onAddRoute,
  onCreateRouteWithFiles,
  uploadProgress: externalUploadProgress,
}) => {
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [stats, setStats] = useState<{
    total_processed: number;
    with_green_detections: number;
    with_red_detections: number;
  } | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [showCreateRouteModal, setShowCreateRouteModal] = useState(false);
  const [uploadStarted, setUploadStarted] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [usePriority, setUsePriority] = useState(false);
  const [priorityMode, setPriorityMode] = useState<PriorityMode>('green-first');
  const [sortMode, setSortMode] = useState<SortMode>('none');
  const [imageToDelete, setImageToDelete] = useState<ProcessedImage | null>(null);

  const mapFileToProcessedImage = (file: ProcessedFile, routeId: string): ProcessedImage | null => {
    if (file.processed_id) {
      return {
        id: file.processed_id,
        originalName: file.original,
        processedUrl: apiService.getProcessedImageUrl(routeId, file.processed_id),
        error: file.error,
        greenDetectionCount: file.green_detection_count,
        redDetectionCount: file.red_detection_count,
        hasGreenDetections: file.has_green_detections,
        hasRedDetections: file.has_red_detections,
        totalDetections: file.total_detections,
      };
    } else if (file.error) {
      return {
        id: file.file_id || `error-${Date.now()}-${Math.random()}`,
        originalName: file.original,
        processedUrl: '',
        error: file.error,
      };
    }
    return null;
  };

  const processFilesToImages = (files: ProcessedFile[], routeId: string): ProcessedImage[] => {
    return files
      .map((file) => mapFileToProcessedImage(file, routeId))
      .filter((img): img is ProcessedImage => img !== null);
  };

  const updateStats = async (routeId: string) => {
    try {
      const statsData = await apiService.getRouteStats(routeId);
      setStats(statsData);
    } catch (err) {
      console.error('Ошибка обновления статистики:', err);
      setStats({
        total_processed: 0,
        with_green_detections: 0,
        with_red_detections: 0,
      });
    }
  };

  const loadFilesAndUpdateImages = async (routeId: string) => {
    try {
      const response = await apiService.getRouteFiles(routeId);
      const images = processFilesToImages(response.files, routeId);
      setProcessedImages(images);
    } catch (err) {
      console.error('Ошибка загрузки файлов маршрута:', err);
      if (err instanceof Error && !err.message.includes('404')) {
        setError('Не удалось загрузить файлы маршрута');
      }
      setProcessedImages([]);
    }
  };

  useEffect(() => {
    if (!route) {
      setProcessedImages([]);
      setStats(null);
      return;
    }

    setLoading(true);
    setError(null);

    const loadData = async () => {
      await Promise.all([
        loadFilesAndUpdateImages(route.id),
        updateStats(route.id),
      ]);
      setLoading(false);
    };

    loadData();
  }, [route]);

  // Закрываем модальное окно после завершения загрузки
  useEffect(() => {
    // Если загрузка была начата и теперь завершена (externalUploadProgress стал null)
    if (uploadStarted && externalUploadProgress === null && showCreateRouteModal && pendingFiles) {
      // Загрузка завершена, закрываем модальное окно
      setShowCreateRouteModal(false);
      setPendingFiles(null);
      setUploadStarted(false);
    }
  }, [externalUploadProgress, showCreateRouteModal, pendingFiles, uploadStarted]);

  const handleFilesDropped = async (files: File[]) => {
    if (!route) return;

    setError(null);
    setUploading(true);

    try {
      const { valid, errors } = await validateFiles(files);

      if (errors.length > 0) {
        setError(errors.join('\n'));
      }

      if (valid.length > 0) {
        try {
          // Загружаем файлы по одному для отслеживания прогресса
          setUploadProgress({ current: 0, total: valid.length });

          for (let i = 0; i < valid.length; i++) {
            try {
              await apiService.uploadSingleFile(route.id, valid[i]);
              setUploadProgress({ current: i + 1, total: valid.length });
            } catch (fileError) {
              console.error(`Ошибка загрузки файла ${valid[i].name}:`, fileError);
              // Продолжаем загрузку остальных файлов
            }
          }

          await new Promise(resolve => setTimeout(resolve, 800));

          let filesResponse;
          let retries = 3;
          while (retries > 0) {
            try {
              filesResponse = await apiService.getRouteFiles(route.id);
              break;
            } catch (err) {
              console.error('Ошибка загрузки списка файлов:', err);
              retries--;
              if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 300));
              }
            }
          }

          if (filesResponse) {
            const allImages = processFilesToImages(filesResponse.files, route.id);
            setProcessedImages([]);
            await new Promise(resolve => setTimeout(resolve, 50));
            setProcessedImages(allImages);
          }

          await new Promise(resolve => setTimeout(resolve, 1500));
          await updateStats(route.id);
          await onFilesUpload(route.id, valid);
        } catch (uploadError) {
          const errorMsg =
            uploadError instanceof Error
              ? uploadError.message
              : 'Не удалось сохранить файлы';
          setError(errorMsg);
          throw uploadError;
        }
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Ошибка при обработке файлов';
      if (!error) {
        setError(errorMsg);
      }
      console.error('Ошибка загрузки файлов:', err);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleImageClick = (image: ProcessedImage) => {
    if (!image.error && image.processedUrl) {
      const filteredImages = getFilteredAndSortedImages(processedImages);
      const validImages = filteredImages.filter(img => !img.error && img.processedUrl);
      const index = validImages.findIndex(img => img.id === image.id);
      if (index !== -1) {
        setSelectedImageIndex(index);
      }
    }
  };

  const handleDeleteImageClick = (image: ProcessedImage) => {
    setImageToDelete(image);
  };

  const handleSaveImage = async (image: ProcessedImage) => {
    try {
      const response = await fetch(image.processedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = image.originalName || `image-${image.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка сохранения изображения:', error);
      const errorMsg = error instanceof Error ? error.message : 'Не удалось сохранить изображение';
      setError(errorMsg);
    }
  };

  const confirmDeleteImage = async () => {
    if (!route || !imageToDelete) return;

    const image = imageToDelete;
    setImageToDelete(null);

    try {
      await apiService.deleteFile(route.id, image.id);
      const filesResponse = await apiService.getRouteFiles(route.id);
      const allImages = processFilesToImages(filesResponse.files, route.id);
      setProcessedImages(allImages);
      await updateStats(route.id);

      const validImages = allImages.filter(img => !img.error && img.processedUrl);
      if (validImages.length === 0) {
        setSelectedImageIndex(null);
      } else if (selectedImageIndex !== null && selectedImageIndex >= validImages.length) {
        setSelectedImageIndex(validImages.length - 1);
      }
    } catch (error) {
      console.error('Ошибка удаления изображения:', error);
      const errorMsg = error instanceof Error ? error.message : 'Не удалось удалить изображение';
      setError(errorMsg);
    }
  };

  const handleDeleteImage = async (image: ProcessedImage) => {
    if (!route) return;

    try {
      await apiService.deleteFile(route.id, image.id);
      const filesResponse = await apiService.getRouteFiles(route.id);
      const allImages = processFilesToImages(filesResponse.files, route.id);
      setProcessedImages(allImages);
      await updateStats(route.id);

      const validImages = allImages.filter(img => !img.error && img.processedUrl);
      if (validImages.length === 0) {
        setSelectedImageIndex(null);
      } else if (selectedImageIndex !== null && selectedImageIndex >= validImages.length) {
        setSelectedImageIndex(validImages.length - 1);
      }
    } catch (error) {
      console.error('Ошибка удаления изображения:', error);
      const errorMsg = error instanceof Error ? error.message : 'Не удалось удалить изображение';
      setError(errorMsg);
    }
  };

  const handleEmptyDrop = async (files: File[]) => {
    if (!onCreateRouteWithFiles) {
      if (onAddRoute) {
        onAddRoute();
      }
      return;
    }

    try {
      const { valid } = await validateFiles(files);
      if (valid.length > 0) {
        setPendingFiles(valid);
        setShowCreateRouteModal(true);
        setUploadStarted(false); // Сбрасываем флаг при открытии модального окна
      }
    } catch (err) {
      console.error('Ошибка валидации файлов:', err);
    }
  };

  const handleCreateRouteWithFiles = async (name: string, description?: string) => {
    if (!pendingFiles || !onCreateRouteWithFiles) return;

    try {
      setUploadStarted(true);
      await onCreateRouteWithFiles(name, description, pendingFiles);
      // Модальное окно закроется автоматически, когда uploadProgress станет null
      // Это происходит в useEffect ниже
    } catch (err) {
      console.error('Ошибка создания маршрута с файлами:', err);
      // Закрываем модальное окно только в случае ошибки
      setShowCreateRouteModal(false);
      setPendingFiles(null);
      setUploadStarted(false);
    }
  };

  const handleClearFilters = () => {
    setUsePriority(false);
    setSortMode('none');
  };

  const getFilteredAndSortedImages = (images: ProcessedImage[]): ProcessedImage[] => {
    const validImages = images.filter(img => !img.error && img.processedUrl);

    // Если ничего не выбрано, возвращаем исходный порядок
    if (!usePriority && sortMode === 'none') {
      return validImages;
    }

    // Разделяем на группы
    const greenImages: ProcessedImage[] = [];
    const redImages: ProcessedImage[] = [];
    const noDetectionsImages: ProcessedImage[] = [];

    validImages.forEach(img => {
      if (img.hasRedDetections) {
        redImages.push(img);
      } else if (img.hasGreenDetections) {
        greenImages.push(img);
      } else {
        noDetectionsImages.push(img);
      }
    });

    // Сортируем внутри каждой группы по количеству детекций (от большего к меньшему)
    greenImages.sort((a, b) => (b.greenDetectionCount || 0) - (a.greenDetectionCount || 0));
    redImages.sort((a, b) => (b.redDetectionCount || 0) - (a.redDetectionCount || 0));

    // Применяем приоритетность или сортировку
    if (usePriority) {
      // Приоритетность определяет порядок групп
      if (priorityMode === 'green-first') {
        // Сначала зеленые (от большего к меньшему), потом красные (от большего к меньшему)
        return [...greenImages, ...redImages, ...noDetectionsImages];
      } else {
        // Сначала красные (от большего к меньшему), потом зеленые (от большего к меньшему)
        return [...redImages, ...greenImages, ...noDetectionsImages];
      }
    } else {
      // Сортировка определяет порядок групп
      if (sortMode === 'green-first') {
        // Сначала все зеленые, потом все красные
        return [...greenImages, ...redImages, ...noDetectionsImages];
      } else if (sortMode === 'red-first') {
        // Сначала все красные, потом все зеленые
        return [...redImages, ...greenImages, ...noDetectionsImages];
      }
    }

    return validImages;
  };

  if (!route) {
    return (
      <>
        <div className="route-view-empty">
          <div className="route-view-empty-card">
            <div className="route-view-empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z" />
                <circle cx="12" cy="13" r="2" />
              </svg>
              <div className="route-view-empty-icon-overlay">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
            </div>
            <h3 className="route-view-empty-title">Маршрутов пока нет</h3>
            <p className="route-view-empty-description">
              Вы не создали еще ни одного маршрута. Загрузите фото и создайте первый маршрут
            </p>
          </div>
          <div className="route-view-empty-footer">
            <DragDropZone onFilesDropped={handleEmptyDrop} />
          </div>
        </div>
        {showCreateRouteModal && pendingFiles && (
          <CreateRouteWithFilesModal
            files={pendingFiles}
            onCreate={handleCreateRouteWithFiles}
            onCancel={() => {
              setShowCreateRouteModal(false);
              setPendingFiles(null);
              setUploadStarted(false);
            }}
            uploadProgress={externalUploadProgress}
          />
        )}
      </>
    );
  }

  return (
    <div className="route-view-container">
      <div className="route-view-header">
        <div className="route-view-header-info">
          <h2 className="route-view-title">{route.name}</h2>
          {route.description && (
            <p className="route-view-description">{route.description}</p>
          )}
          {stats !== null && (
            <div className="route-view-stats">
              <div className="route-view-stats-item">
                <span className="route-view-stats-label">Обработано:</span>
                <span className="route-view-stats-value">{stats.total_processed}</span>
              </div>
              <div className="route-view-stats-item route-view-stats-green">
                <span className="route-view-stats-icon"></span>
                <span className="route-view-stats-value">{stats.with_green_detections}</span>
              </div>
              <div className="route-view-stats-item route-view-stats-red">
                <span className="route-view-stats-icon"></span>
                <span className="route-view-stats-value">{stats.with_red_detections}</span>
              </div>
              <button
                className="route-view-filter-btn"
                onClick={() => setShowFilterModal(true)}
                title="Фильтр"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
              </button>
            </div>
          )}
        </div>
        <div className="route-view-header-actions">
          <button
            className="route-view-action-btn route-view-edit-btn"
            onClick={() => onEdit(route)}
            title="Редактировать"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            className="route-view-action-btn route-view-delete-btn"
            onClick={() => onDelete(route)}
            title="Удалить"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      <div className="route-view-content">
        {loading ? (
          <div className="route-view-loading">Загрузка файлов...</div>
        ) : uploading && uploadProgress ? (
          <div className="route-view-loading">
            Загрузка файлов... ({uploadProgress.current}/{uploadProgress.total})
          </div>
        ) : uploading ? (
          <div className="route-view-loading">Загрузка файлов...</div>
        ) : processedImages.length === 0 ? (
          <div className="route-view-no-images">
            <p>Загрузите изображения</p>
          </div>
        ) : (
          <div className="route-view-gallery">
            {getFilteredAndSortedImages(processedImages).map((image) => (
              <div key={image.id} className="route-view-gallery-item">
                {image.error ? (
                  <div className="route-view-image-error">
                    <p>Ошибка обработки: {image.error}</p>
                    <p className="route-view-image-name">{image.originalName}</p>
                    <div className="route-view-image-actions">
                      <button
                        className="route-view-save-image-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (image.processedUrl) {
                            handleSaveImage(image);
                          }
                        }}
                        title="Сохранить изображение"
                        disabled={!image.processedUrl}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </button>
                      <button
                        className="route-view-delete-image-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImageClick(image);
                        }}
                        title="Удалить изображение"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <img
                      src={image.processedUrl}
                      alt={image.originalName}
                      className="route-view-gallery-image"
                      onClick={() => handleImageClick(image)}
                      style={{ cursor: 'pointer' }}
                      onError={(e) => {
                        console.error('Ошибка загрузки обработанного изображения:', image.processedUrl);
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          e.currentTarget.style.display = 'none';
                          const errorDiv = document.createElement('div');
                          errorDiv.className = 'route-view-image-error';
                          errorDiv.innerHTML = `
                            <p>Ошибка загрузки изображения</p>
                            <p className="route-view-image-name">${image.originalName}</p>
                          `;
                          parent.appendChild(errorDiv);
                        }
                      }}
                    />
                    <div className="route-view-image-actions">
                      <button
                        className="route-view-save-image-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveImage(image);
                        }}
                        title="Сохранить изображение"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </button>
                      <button
                        className="route-view-delete-image-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImageClick(image);
                        }}
                        title="Удалить изображение"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                    <div className="route-view-image-label">{image.originalName}</div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="route-view-footer">
        <DragDropZone onFilesDropped={handleFilesDropped} />
        {uploading && (
          <div className="route-view-upload-status">
            <span>Загрузка и обработка изображений ИИ...</span>
          </div>
        )}
        {error && (
          <div className="route-view-upload-error">{error}</div>
        )}
      </div>

      {selectedImageIndex !== null && (
        <ImageModal
          isOpen={selectedImageIndex !== null}
          images={getFilteredAndSortedImages(processedImages).filter(img => !img.error && img.processedUrl)}
          currentIndex={selectedImageIndex}
          onClose={() => setSelectedImageIndex(null)}
          onDelete={(image) => handleDeleteImage(image)}
          onIndexChange={(index) => setSelectedImageIndex(index)}
        />
      )}

      <FilterModal
        isOpen={showFilterModal}
        usePriority={usePriority}
        priorityMode={priorityMode}
        sortMode={sortMode}
        onUsePriorityChange={setUsePriority}
        onPriorityChange={setPriorityMode}
        onSortChange={setSortMode}
        onClearFilters={handleClearFilters}
        onClose={() => setShowFilterModal(false)}
      />

      {imageToDelete && (
        <ConfirmModal
          isOpen={true}
          title="Удалить изображение?"
          message={`Вы уверены, что хотите удалить изображение "${imageToDelete.originalName}"? Это действие нельзя отменить.`}
          confirmText="Удалить"
          cancelText="Отмена"
          onConfirm={confirmDeleteImage}
          onCancel={() => setImageToDelete(null)}
        />
      )}
    </div>
  );
};

