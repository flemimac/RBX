import React, { useState, FormEvent, useEffect } from 'react';
import './CreateRouteWithFilesModal.css';

interface CreateRouteWithFilesModalProps {
  files: File[];
  onCreate: (name: string, description?: string) => Promise<void>;
  onCancel: () => void;
}

export const CreateRouteWithFilesModal: React.FC<CreateRouteWithFilesModalProps> = ({
  files,
  onCreate,
  onCancel,
}) => {
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      await onCreate(name.trim(), description.trim() || undefined);
    }
  };

  return (
    <div className="create-route-with-files-overlay" onClick={onCancel}>
      <div className="create-route-with-files-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="create-route-with-files-title">Создать маршрут для загружаемых файлов</h3>
        <p className="create-route-with-files-info">
          Вы загружаете {files.length} {files.length === 1 ? 'файл' : files.length < 5 ? 'файла' : 'файлов'}. 
          Создайте новый маршрут для этих файлов.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="create-route-with-files-form-group">
            <label htmlFor="create-route-name" className="create-route-with-files-label">
              Название маршрута
            </label>
            <input
              id="create-route-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите название маршрута"
              autoFocus
              className="create-route-with-files-input"
              required
            />
          </div>
          <div className="create-route-with-files-form-group">
            <label htmlFor="create-route-description" className="create-route-with-files-label">
              Описание маршрута
            </label>
            <textarea
              id="create-route-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Введите описание маршрута (необязательно)"
              className="create-route-with-files-textarea"
              rows={3}
            />
          </div>
          <div className="create-route-with-files-actions">
            <button type="button" onClick={onCancel} className="create-route-with-files-cancel">
              Отмена
            </button>
            <button type="submit" className="create-route-with-files-submit">
              Создать и загрузить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

