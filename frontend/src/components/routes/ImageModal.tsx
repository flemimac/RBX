import React, { useEffect, useCallback } from 'react';
import { ConfirmModal } from '../ui/ConfirmModal';
import './ImageModal.css';

interface ProcessedImage {
  id: string;
  originalName: string;
  processedUrl: string;
  error?: string;
}

interface ImageModalProps {
  isOpen: boolean;
  images: ProcessedImage[];
  currentIndex: number;
  onClose: () => void;
  onDelete: (image: ProcessedImage) => void;
  onIndexChange?: (index: number) => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  images,
  currentIndex,
  onClose,
  onDelete,
  onIndexChange,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [internalIndex, setInternalIndex] = React.useState(currentIndex);

  useEffect(() => {
    setInternalIndex(currentIndex);
  }, [currentIndex]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[internalIndex];
  if (!currentImage || currentImage.error) return null;

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete(currentImage);
    if (images.length === 1) {
      onClose();
    } else {
      const nextIndex = internalIndex >= images.length - 1 ? internalIndex - 1 : internalIndex;
      setInternalIndex(Math.max(0, nextIndex));
      if (onIndexChange) {
        onIndexChange(Math.max(0, nextIndex));
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(currentImage.processedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = currentImage.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка скачивания изображения:', error);
    }
  };

  const goToPrevious = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setInternalIndex((prevIndex) => {
      const validImages = images.filter(img => !img.error && img.processedUrl);
      const newIndex = prevIndex > 0 ? prevIndex - 1 : validImages.length - 1;
      if (onIndexChange) {
        onIndexChange(newIndex);
      }
      return newIndex;
    });
  }, [images, onIndexChange]);

  const goToNext = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setInternalIndex((prevIndex) => {
      const validImages = images.filter(img => !img.error && img.processedUrl);
      const newIndex = prevIndex < validImages.length - 1 ? prevIndex + 1 : 0;
      if (onIndexChange) {
        onIndexChange(newIndex);
      }
      return newIndex;
    });
  }, [images, onIndexChange]);

  const goToImage = useCallback((index: number) => {
    setInternalIndex(index);
    if (onIndexChange) {
      onIndexChange(index);
    }
  }, [onIndexChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToPrevious, goToNext, onClose]);

  const validImages = images.filter(img => !img.error && img.processedUrl);

  return (
    <>
      <div className="image-modal-overlay" onClick={handleBackdropClick}>
        <div className="image-modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="image-modal-header">
            <h3 className="image-modal-title">
              {currentImage.originalName} ({internalIndex + 1} / {validImages.length})
            </h3>
            <div className="image-modal-actions">
              <button
                className="image-modal-btn image-modal-download-btn"
                onClick={handleDownload}
                title="Скачать"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              <button
                className="image-modal-btn image-modal-delete-btn"
                onClick={handleDelete}
                title="Удалить"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
              <button
                className="image-modal-btn image-modal-close-btn"
                onClick={onClose}
                title="Закрыть"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
          <div className="image-modal-content">
            {validImages.length > 1 && (
              <button
                className="image-modal-nav-btn image-modal-nav-left"
                onClick={goToPrevious}
                title="Предыдущее (←)"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
            <img
              src={currentImage.processedUrl}
              alt={currentImage.originalName}
              className="image-modal-image"
            />
            {validImages.length > 1 && (
              <button
                className="image-modal-nav-btn image-modal-nav-right"
                onClick={goToNext}
                title="Следующее (→)"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>
          {validImages.length > 1 && (
            <div className="image-modal-thumbnails">
              <div className="image-modal-thumbnails-container">
                {validImages.map((image, index) => (
                  <div
                    key={image.id}
                    className={`image-modal-thumbnail ${index === internalIndex ? 'active' : ''}`}
                    onClick={() => goToImage(index)}
                  >
                    <img
                      src={image.processedUrl}
                      alt={image.originalName}
                      className="image-modal-thumbnail-image"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={true}
          title="Удалить изображение?"
          message={`Вы уверены, что хотите удалить изображение "${currentImage.originalName}"? Это действие нельзя отменить.`}
          confirmText="Удалить"
          cancelText="Отмена"
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
};

