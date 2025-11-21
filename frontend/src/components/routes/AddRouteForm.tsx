import React, { useState, FormEvent } from 'react';
import './AddRouteForm.css';

interface AddRouteFormProps {
  onAdd: (name: string, description?: string) => void;
  onCancel: () => void;
}

export const AddRouteForm: React.FC<AddRouteFormProps> = ({ onAdd, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), description.trim() || undefined);
      setName('');
      setDescription('');
    }
  };

  return (
    <div className="add-route-form">
      <form onSubmit={handleSubmit}>
        <div className="add-route-form-group">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Введите название маршрута"
            autoFocus
            className="route-name-input"
          />
        </div>
        <div className="add-route-form-group">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Введите описание маршрута (необязательно)"
            className="route-description-input"
            rows={3}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-add">Добавить</button>
          <button type="button" onClick={onCancel} className="btn-cancel">
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
};

