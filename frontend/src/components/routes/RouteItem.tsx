import React, { useState } from 'react';
import { DragDropZone } from '../ui/DragDropZone';
import { validateFiles } from '../../utils';
import type { Route } from '../../types';
import './RouteItem.css';

interface RouteItemProps {
  route: Route;
  onDelete: (id: string) => void;
  onInfo: (route: Route) => void;
  onEdit: (route: Route) => void;
  onFilesUpload: (routeId: string, files: File[]) => void;
}

export const RouteItem: React.FC<RouteItemProps> = ({
  route,
  onDelete,
  onInfo,
  onEdit,
  onFilesUpload,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const truncateDescription = (text: string, maxLength: number = 150): string => {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength) + '...';
  };

  const handleFilesDropped = async (files: File[]) => {
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
        } catch (uploadError) {
          const errorMsg = uploadError instanceof Error ? uploadError.message : 'Не удалось сохранить файлы';
          setError(errorMsg);
          throw uploadError;
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ошибка при обработке файлов';
      if (!error) {
        setError(errorMsg);
      }
      console.error('Ошибка загрузки файлов:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="route-item">
      <div className="route-main-content">
        <div className="route-info-section">
          <h3 className="route-name">{route.name}</h3>
          {route.description && (
            <p className="route-description">
              {truncateDescription(route.description)}
            </p>
          )}
        </div>
        <div className="route-dragdrop-section">
          <DragDropZone onFilesDropped={handleFilesDropped} />
          {uploading && (
            <div className="upload-status">Загрузка файлов...</div>
          )}
          {error && (
            <div className="upload-error">{error}</div>
          )}
          {route.fileCount !== undefined && route.fileCount > 0 && (
            <div className="file-count">Файлов: {route.fileCount}</div>
          )}
        </div>
        <div className="route-actions">
          <button
            className="btn-edit"
            onClick={() => onEdit(route)}
            title="Редактировать маршрут"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            className="btn-info"
            onClick={() => onInfo(route)}
            title="Информация о данных"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </button>
          <button
            className="btn-delete"
            onClick={() => onDelete(route.id)}
            title="Удалить маршрут"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

