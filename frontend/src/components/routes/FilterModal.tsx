import React from 'react';
import './FilterModal.css';

export type PriorityMode = 'green-first' | 'red-first';
export type SortMode = 'green-first' | 'red-first' | 'none';

interface FilterModalProps {
  isOpen: boolean;
  usePriority: boolean;
  priorityMode: PriorityMode;
  sortMode: SortMode;
  onUsePriorityChange: (usePriority: boolean) => void;
  onPriorityChange: (mode: PriorityMode) => void;
  onSortChange: (mode: SortMode) => void;
  onClearFilters: () => void;
  onClose: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  usePriority,
  priorityMode,
  sortMode,
  onUsePriorityChange,
  onPriorityChange,
  onSortChange,
  onClearFilters,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="filter-modal-overlay" onClick={handleBackdropClick}>
      <div className="filter-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="filter-modal-header">
          <h3 className="filter-modal-title">Настройки фильтрации</h3>
          <button
            className="filter-modal-close-btn"
            onClick={onClose}
            title="Закрыть"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="filter-modal-content">
          <div className="filter-modal-section">
            <div className="filter-modal-toggle">
              <div className="filter-modal-toggle-header">
                <span className="filter-modal-toggle-label-text">Режим фильтрации</span>
                <div className="filter-modal-toggle-controls">
                  <label className="filter-modal-toggle-switch">
                    <input
                      type="checkbox"
                      checked={usePriority}
                      onChange={(e) => onUsePriorityChange(e.target.checked)}
                    />
                    <span className="filter-modal-toggle-slider">
                      <span className="filter-modal-toggle-slider-text filter-modal-toggle-text-left">Сортировка</span>
                      <span className="filter-modal-toggle-slider-text filter-modal-toggle-text-right">Приоритетность</span>
                    </span>
                  </label>
                  <button
                    className="filter-modal-clear-btn"
                    onClick={onClearFilters}
                    title="Очистить фильтры"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span>Очистить</span>
                  </button>
                </div>
              </div>
              <p className="filter-modal-toggle-description">
                {usePriority 
                  ? 'Приоритетность определяет порядок групп по количеству детекций (от большего к меньшему)'
                  : 'Сортировка определяет порядок групп изображений'}
              </p>
            </div>
          </div>
          
          {usePriority ? (
            <div className="filter-modal-section">
              <h4 className="filter-modal-section-title">Приоритетность</h4>
              <p className="filter-modal-section-description">
                Порядок сортировки: сначала одна группа (от большего к меньшему), потом другая (от большего к меньшему)
              </p>
              <div className="filter-modal-options">
                <label className="filter-modal-option">
                  <input
                    type="radio"
                    name="priority"
                    value="green-first"
                    checked={priorityMode === 'green-first'}
                    onChange={() => onPriorityChange('green-first')}
                  />
                  <span>Сначала зеленые (от большего к меньшему), потом красные (от большего к меньшему)</span>
                </label>
                <label className="filter-modal-option">
                  <input
                    type="radio"
                    name="priority"
                    value="red-first"
                    checked={priorityMode === 'red-first'}
                    onChange={() => onPriorityChange('red-first')}
                  />
                  <span>Сначала красные (от большего к меньшему), потом зеленые (от большего к меньшему)</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="filter-modal-section">
              <h4 className="filter-modal-section-title">Сортировка</h4>
              <p className="filter-modal-section-description">
                Порядок отображения групп изображений
              </p>
              <div className="filter-modal-options">
                <label className="filter-modal-option">
                  <input
                    type="radio"
                    name="sort"
                    value="green-first"
                    checked={sortMode === 'green-first'}
                    onChange={() => onSortChange('green-first')}
                  />
                  <span>Сначала все зеленые, потом все красные</span>
                </label>
                <label className="filter-modal-option">
                  <input
                    type="radio"
                    name="sort"
                    value="red-first"
                    checked={sortMode === 'red-first'}
                    onChange={() => onSortChange('red-first')}
                  />
                  <span>Сначала все красные, потом все зеленые</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

