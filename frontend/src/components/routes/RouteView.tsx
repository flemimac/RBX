import React, { useState, useEffect } from 'react';
import { DragDropZone } from '../ui/DragDropZone';
import { validateFiles } from '../../utils';
import { apiService, type ProcessedFile } from '../../services';
import type { Route } from '../../types';
import { ImageModal } from './ImageModal';
import { CreateRouteWithFilesModal } from './CreateRouteWithFilesModal';
import './RouteView.css';

interface RouteViewProps {
  route: Route | null;
  onFilesUpload: (routeId: string, files: File[]) => Promise<void>;
  onEdit: (route: Route) => void;
  onDelete: (route: Route) => void;
  onAddRoute?: () => void;
  onCreateRouteWithFiles?: (name: string, description: string | undefined, files: File[]) => Promise<void>;
}

interface ProcessedImage {
  id: string;
  originalName: string;
  processedUrl: string;
  error?: string;
}

export const RouteView: React.FC<RouteViewProps> = ({
  route,
  onFilesUpload,
  onEdit,
  onDelete,
  onAddRoute,
  onCreateRouteWithFiles,
}) => {
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ProcessedImage | null>(null);
  const [stats, setStats] = useState<{
    total_processed: number;
    with_green_detections: number;
    with_red_detections: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [showCreateRouteModal, setShowCreateRouteModal] = useState(false);

  useEffect(() => {
    const loadRouteFiles = async () => {
      if (!route) {
        setProcessedImages([]);
        setStats(null);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        // Загружаем сохраненные обработанные изображения для маршрута
        const response = await apiService.getRouteFiles(route.id);
        
        // Формируем список обработанных изображений для отображения
        const images: ProcessedImage[] = response.files
          .map((file: ProcessedFile) => {
            if (file.processed_id) {
              return {
                id: file.processed_id,
                originalName: file.original,
                processedUrl: apiService.getProcessedImageUrl(route.id, file.processed_id),
                error: file.error,
              };
            } else if (file.error) {
              // Файл с ошибкой обработки
              return {
                id: file.file_id || `error-${Date.now()}-${Math.random()}`,
                originalName: file.original,
                processedUrl: '',
                error: file.error,
              };
            } else {
              // Не изображение или обработка недоступна
              return null;
            }
          })
          .filter((img): img is ProcessedImage => img !== null);
        
        setProcessedImages(images);
      } catch (err) {
        console.error('Ошибка загрузки файлов маршрута:', err);
        // Не показываем ошибку, если просто нет файлов
        if (err instanceof Error && !err.message.includes('404')) {
          setError('Не удалось загрузить файлы маршрута');
        }
        setProcessedImages([]);
      } finally {
        setLoading(false);
      }
    };

    const loadStats = async () => {
      if (!route) {
        setStats(null);
        return;
      }

      setStatsLoading(true);
      try {
        const statsData = await apiService.getRouteStats(route.id);
        setStats(statsData);
      } catch (err) {
        console.error('Ошибка загрузки статистики маршрута:', err);
        setStats({
          total_processed: 0,
          with_green_detections: 0,
          with_red_detections: 0,
        });
      } finally {
        setStatsLoading(false);
      }
    };

    loadRouteFiles();
    loadStats();
  }, [route]);

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
          // Загружаем файлы через API и получаем обработанные изображения
          const response = await apiService.uploadFiles(route.id, valid);
          
          // Формируем список обработанных изображений для отображения
          const images: ProcessedImage[] = response.processed_files
            .map((file: ProcessedFile) => {
              if (file.processed_id) {
                return {
                  id: file.processed_id,
                  originalName: file.original,
                  processedUrl: apiService.getProcessedImageUrl(route.id, file.processed_id),
                  error: file.error,
                };
              } else if (file.error) {
                // Файл с ошибкой обработки
                return {
                  id: file.file_id || `error-${Date.now()}-${Math.random()}`,
                  originalName: file.original,
                  processedUrl: '',
                  error: file.error,
                };
              } else {
                // Не изображение или обработка недоступна
                return null;
              }
            })
            .filter((img): img is ProcessedImage => img !== null);
          
          // После загрузки и обработки, перезагружаем список файлов с сервера
          // Это гарантирует, что мы получим актуальный список после обработки и удаления дубликатов
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Используем retry механизм на случай, если файлы еще не готовы
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
            const allImages: ProcessedImage[] = filesResponse.files
              .map((file: ProcessedFile) => {
                if (file.processed_id) {
                  return {
                    id: file.processed_id,
                    originalName: file.original,
                    processedUrl: apiService.getProcessedImageUrl(route.id, file.processed_id),
                    error: file.error,
                  };
                } else if (file.error) {
                  return {
                    id: file.file_id || `error-${Date.now()}-${Math.random()}`,
                    originalName: file.original,
                    processedUrl: '',
                    error: file.error,
                  };
                } else {
                  return null;
                }
              })
              .filter((img): img is ProcessedImage => img !== null);
            
            // Полностью заменяем список изображений
            setProcessedImages([]);
            await new Promise(resolve => setTimeout(resolve, 50));
            setProcessedImages(allImages);
          }
          
          // Обновляем статистику после загрузки файлов
          try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const statsData = await apiService.getRouteStats(route.id);
            setStats(statsData);
          } catch (err) {
            console.error('Ошибка обновления статистики:', err);
          }
          
          // Вызываем callback для обновления состояния в родительском компоненте
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
    }
  };

  const handleImageClick = (image: ProcessedImage) => {
    if (!image.error && image.processedUrl) {
      setSelectedImage(image);
    }
  };

  const handleDeleteImage = async (image: ProcessedImage) => {
    if (!route) return;

    try {
      await apiService.deleteFile(route.id, image.id);
      
      // Перезагружаем список файлов после удаления
      const filesResponse = await apiService.getRouteFiles(route.id);
      const allImages: ProcessedImage[] = filesResponse.files
        .map((file: ProcessedFile) => {
          if (file.processed_id) {
            return {
              id: file.processed_id,
              originalName: file.original,
              processedUrl: apiService.getProcessedImageUrl(route.id, file.processed_id),
              error: file.error,
            };
          } else if (file.error) {
            return {
              id: file.file_id || `error-${Date.now()}-${Math.random()}`,
              originalName: file.original,
              processedUrl: '',
              error: file.error,
            };
          } else {
            return null;
          }
        })
        .filter((img): img is ProcessedImage => img !== null);
      
      setProcessedImages(allImages);
      
      // Обновляем статистику после удаления
      try {
        const statsData = await apiService.getRouteStats(route.id);
        setStats(statsData);
      } catch (err) {
        console.error('Ошибка обновления статистики:', err);
      }
      
      // Закрываем модалку если удалили текущее изображение
      if (selectedImage && selectedImage.id === image.id) {
        setSelectedImage(null);
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
      }
    } catch (err) {
      console.error('Ошибка валидации файлов:', err);
    }
  };

  const handleCreateRouteWithFiles = async (name: string, description?: string) => {
    if (!pendingFiles || !onCreateRouteWithFiles) return;

    try {
      await onCreateRouteWithFiles(name, description, pendingFiles);
      setShowCreateRouteModal(false);
      setPendingFiles(null);
    } catch (err) {
      console.error('Ошибка создания маршрута с файлами:', err);
    }
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
            {onAddRoute && (
              <button className="route-view-empty-button" onClick={onAddRoute}>
                Загрузить фото
              </button>
            )}
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
            }}
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
        ) : processedImages.length === 0 ? (
          <div className="route-view-no-images">
            <p>Нет обработанных изображений</p>
            <p className="route-view-hint">Загрузите изображения для автоматической обработки ИИ</p>
          </div>
        ) : (
          <div className="route-view-gallery">
            {processedImages.map((image) => (
              <div key={image.id} className="route-view-gallery-item">
                {image.error ? (
                  <div className="route-view-image-error">
                    <p>Ошибка обработки: {image.error}</p>
                    <p className="route-view-image-name">{image.originalName}</p>
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
                        // Показываем сообщение об ошибке вместо скрытия изображения
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

      {selectedImage && (
        <ImageModal
          isOpen={!!selectedImage}
          imageUrl={selectedImage.processedUrl}
          imageName={selectedImage.originalName}
          onClose={() => setSelectedImage(null)}
          onDelete={() => handleDeleteImage(selectedImage)}
        />
      )}
    </div>
  );
};

