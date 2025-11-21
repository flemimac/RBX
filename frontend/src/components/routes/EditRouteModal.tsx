import React, { useState, useEffect, FormEvent } from 'react';
import type { Route } from '../../types';
import './EditRouteModal.css';

interface EditRouteModalProps {
  isOpen: boolean;
  route: Route | null;
  onSave: (id: string, name: string, description?: string) => void;
  onCancel: () => void;
}

export const EditRouteModal: React.FC<EditRouteModalProps> = ({
  isOpen,
  route,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (route) {
      setName(route.name || '');
      setDescription(route.description || '');
    }
  }, [route]);

  if (!isOpen || !route) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(route.id, name.trim(), description.trim() || undefined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      className="edit-route-modal-overlay"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="edit-route-modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="edit-route-modal-title">Редактировать маршрут</h3>
        <form onSubmit={handleSubmit}>
          <div className="edit-route-form-group">
            <label htmlFor="route-name" className="edit-route-label">
              Название маршрута
            </label>
            <input
              id="route-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите название маршрута"
              className="edit-route-input"
              autoFocus
              required
            />
          </div>
          <div className="edit-route-form-group">
            <label htmlFor="route-description" className="edit-route-label">
              Описание маршрута
            </label>
            <textarea
              id="route-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Введите описание маршрута (необязательно)"
              className="edit-route-textarea"
              rows={4}
            />
          </div>
          <div className="edit-route-modal-actions">
            <button type="button" onClick={onCancel} className="edit-route-btn edit-route-btn-cancel">
              Отмена
            </button>
            <button type="submit" className="edit-route-btn edit-route-btn-save">
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

