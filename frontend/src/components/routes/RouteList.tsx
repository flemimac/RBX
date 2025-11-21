import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts';
import type { Route } from '../../types';
import './RouteList.css';

interface RouteListProps {
  routes: Route[];
  selectedRouteId: string | null;
  onSelectRoute: (route: Route) => void;
  onAddRoute: () => void;
  loading?: boolean;
}

export const RouteList: React.FC<RouteListProps> = ({
  routes,
  selectedRouteId,
  onSelectRoute,
  onAddRoute,
  loading,
}) => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const filteredRoutes = useMemo(() => {
    if (!searchQuery.trim()) {
      return routes;
    }
    const query = searchQuery.toLowerCase();
    return routes.filter(
      (route) =>
        route.name.toLowerCase().includes(query) ||
        (route.description && route.description.toLowerCase().includes(query))
    );
  }, [routes, searchQuery]);

  const truncateText = (text: string, maxLength: number = 50): string => {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div className="route-list-container">
      <div className="route-list-search">
        <div className="route-list-search-wrapper">
          <button
            className="route-list-menu-button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            title="Меню"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="search-input-wrapper">
            <svg
              className="search-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Поиск маршрутов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        {isMenuOpen && (
          <div className="route-list-menu-dropdown" ref={menuRef}>
            <div className="route-list-menu-user">
              <p className="route-list-menu-user-label">Логин:</p>
              <p className="route-list-menu-user-name">
                {user?.full_name || user?.email || 'Пользователь'}
              </p>
            </div>
            <button className="route-list-menu-logout" onClick={logout}>
              Выйти
            </button>
          </div>
        )}
      </div>

      <div className="route-list-items">
        {loading ? (
          <div className="route-list-loading">Загрузка маршрутов...</div>
        ) : filteredRoutes.length === 0 ? (
          <div className="route-list-empty">
            {searchQuery ? 'Маршруты не найдены' : 'Нет маршрутов'}
          </div>
        ) : (
          filteredRoutes.map((route) => (
            <div
              key={route.id}
              className={`route-list-item ${selectedRouteId === route.id ? 'active' : ''}`}
              onClick={() => onSelectRoute(route)}
            >
              <div className="route-list-item-header">
                <h3 className="route-list-item-name">{route.name}</h3>
              </div>
              {route.description && (
                <p className="route-list-item-description">
                  {truncateText(route.description)}
                </p>
              )}
              {route.fileCount !== undefined && route.fileCount > 0 && (
                <div className="route-list-item-meta">
                  <span className="route-list-item-files">{route.fileCount} файлов</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <button className="route-list-add-button" onClick={onAddRoute}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
};

