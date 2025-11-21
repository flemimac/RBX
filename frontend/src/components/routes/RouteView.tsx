import React, { useState, useEffect } from 'react';
import { DragDropZone } from '../ui/DragDropZone';
import { validateFiles } from '../../utils';
import { fileStorage } from '../../utils';
import type { Route } from '../../types';
import './RouteView.css';

interface RouteViewProps {
  route: Route | null;
  onFilesUpload: (routeId: string, files: File[]) => void;
  onEdit: (route: Route) => void;
  onDelete: (route: Route) => void;
}

export const RouteView: React.FC<RouteViewProps> = ({
  route,
  onFilesUpload,
  onEdit,
  onDelete,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (route) {
      loadFiles();
    } else {
      setFiles([]);
    }
  }, [route]);

  const loadFiles = async () => {
    if (!route) return;
    setLoading(true);
    try {
      const routeFiles = await fileStorage.getFiles(route.id);
      setFiles(routeFiles);
    } catch (error) {
      console.error('Ошибка загрузки файлов:', error);
    } finally {
      setLoading(false);
    }
  };

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
          await onFilesUpload(route.id, valid);
          await loadFiles();
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

  if (!route) {
    return (
      <div className="route-view-empty">
        <p>Выберите маршрут для просмотра</p>
      </div>
    );
  }

  const imageFiles = files.filter((file) => file.type.startsWith('image/'));

  return (
    <div className="route-view-container">
      <div className="route-view-header">
        <div className="route-view-header-info">
          <h2 className="route-view-title">{route.name}</h2>
          {route.description && (
            <p className="route-view-description">{route.description}</p>
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
        ) : imageFiles.length === 0 ? (
          <div className="route-view-no-images">
            <p>Нет загруженных изображений</p>
          </div>
        ) : (
          <div className="route-view-gallery">
            {imageFiles.map((file, index) => (
              <div key={index} className="route-view-gallery-item">
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="route-view-gallery-image"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="route-view-footer">
        <DragDropZone onFilesDropped={handleFilesDropped} />
        {uploading && (
          <div className="route-view-upload-status">Загрузка файлов...</div>
        )}
        {error && (
          <div className="route-view-upload-error">{error}</div>
        )}
      </div>
    </div>
  );
};

