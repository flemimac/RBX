import React from 'react';
import { ConfirmModal } from '../ui/ConfirmModal';
import './ImageModal.css';

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string;
  imageName: string;
  onClose: () => void;
  onDelete: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  imageUrl,
  imageName,
  onClose,
  onDelete,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  if (!isOpen) return null;

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete();
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <div className="image-modal-overlay" onClick={handleBackdropClick}>
        <div className="image-modal-container">
          <div className="image-modal-header">
            <h3 className="image-modal-title">{imageName}</h3>
            <div className="image-modal-actions">
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
            <img
              src={imageUrl}
              alt={imageName}
              className="image-modal-image"
            />
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={true}
          title="Удалить изображение?"
          message={`Вы уверены, что хотите удалить изображение "${imageName}"? Это действие нельзя отменить.`}
          confirmText="Удалить"
          cancelText="Отмена"
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
};

