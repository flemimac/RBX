import React, { useState, FormEvent, useEffect } from 'react';
import './AddRouteForm.css';

interface AddRouteFormProps {
  onAdd: (name: string, description?: string) => void;
  onCancel: () => void;
}

export const AddRouteForm: React.FC<AddRouteFormProps> = ({ onAdd, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), description.trim() || undefined);
      setName('');
      setDescription('');
    }
  };

  return (
    <div className="add-route-form-overlay" onClick={onCancel}>
      <div className="add-route-form" onClick={(e) => e.stopPropagation()}>
        <h3 className="add-route-form-title">Добавить маршрут</h3>
        <form onSubmit={handleSubmit}>
          <div className="add-route-form-group">
            <label htmlFor="add-route-name" className="add-route-label">
              Название маршрута
            </label>
            <input
              id="add-route-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите название маршрута"
              autoFocus
              className="route-name-input"
              required
            />
          </div>
          <div className="add-route-form-group">
            <label htmlFor="add-route-description" className="add-route-label">
              Описание маршрута
            </label>
            <textarea
              id="add-route-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Введите описание маршрута (необязательно)"
              className="route-description-input"
              rows={3}
            />
          </div>
          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-cancel">
              Отмена
            </button>
            <button type="submit" className="btn-add">Добавить</button>
          </div>
        </form>
      </div>
    </div>
  );
};

