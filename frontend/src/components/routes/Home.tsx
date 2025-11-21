import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts';
import { apiService } from '../../services';
import { fileStorage } from '../../utils';
import type { Route } from '../../types';
import { RouteItem } from './RouteItem';
import { AddRouteForm } from './AddRouteForm';
import { RouteGalleryModal } from './RouteGalleryModal';
import { EditRouteModal } from './EditRouteModal';
import { ConfirmModal } from '../ui/ConfirmModal';
import './Home.css';

export const Home: React.FC = () => {
  const { user, logout } = useAuth();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [routeToDelete, setRouteToDelete] = useState<Route | null>(null);
  const [routeToEdit, setRouteToEdit] = useState<Route | null>(null);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const data = await apiService.getRoutes();
      const routesWithFileCounts = await Promise.all(
        data.map(async (route) => {
          const fileCount = await fileStorage.getFileCount(route.id);
          return { ...route, fileCount };
        })
      );
      setRoutes(routesWithFileCounts);
    } catch (error) {
      console.error('Не удалось загрузить маршруты:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fileStorage.init().then(() => {
      fetchRoutes();
    });
  }, []);

  const handleAddRoute = async (name: string, description?: string) => {
    try {
      const newRoute = await apiService.createRoute(name, description);
      setRoutes([...routes, newRoute]);
      setShowAddForm(false);
    } catch (error) {
      console.error('Не удалось создать маршрут:', error);
      alert('Не удалось создать маршрут');
    }
  };

  const handleDeleteRoute = (route: Route) => {
    setRouteToDelete(route);
  };

  const confirmDelete = async () => {
    if (!routeToDelete) return;

    const id = routeToDelete.id;
    setRouteToDelete(null);

    try {
      await apiService.deleteRoute(id);
      await fileStorage.deleteRouteFiles(id);
      setRoutes(routes.filter((route) => route.id !== id));
    } catch (error) {
      console.error('Не удалось удалить маршрут:', error);
      alert('Не удалось удалить маршрут');
    }
  };

  const handleRouteInfo = (route: Route) => {
    setSelectedRoute(route);
  };

  const handleEditRoute = (route: Route) => {
    setRouteToEdit(route);
  };

  const handleSaveRoute = async (id: string, name: string, description?: string) => {
    try {
      const updatedRoute = await apiService.updateRoute(id, name, description);
      setRoutes(
        routes.map((route) =>
          route.id === id
            ? { ...updatedRoute, fileCount: route.fileCount }
            : route
        )
      );
      setRouteToEdit(null);
    } catch (error) {
      console.error('Не удалось обновить маршрут:', error);
      alert('Не удалось обновить маршрут');
    }
  };

  const handleFilesUpload = async (routeId: string, files: File[]) => {
    try {
      await fileStorage.saveFiles(routeId, files);
      await fetchRoutes();
    } catch (error) {
      console.error('Не удалось сохранить файлы:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      throw new Error(`Не удалось сохранить файлы: ${errorMessage}`);
    }
  };

  return (
    <section className="home-wrapper">
      <div className="home-main-layout">
        <aside className="home-sidebar">
          <div className="home-sidebar-card">
            <p className="home-welcome-text">Добро пожаловать</p>
            <h2 className="home-user-display">
              {user?.full_name || user?.email || 'Пользователь'}
            </h2>
            <button className="home-logout-button" onClick={logout}>
              Выйти
            </button>
          </div>
        </aside>

        <div className="home-content-area">
          <div className="home-routes-container">
            {loading ? (
              <div className="home-loading-message">Загрузка маршрутов...</div>
            ) : routes.length === 0 ? (
              <div className="home-empty-message">
                <p>Нет маршрутов. Добавьте первый маршрут.</p>
              </div>
            ) : (
              routes.map((route) => (
                <RouteItem
                  key={route.id}
                  route={route}
                  onDelete={() => handleDeleteRoute(route)}
                  onInfo={handleRouteInfo}
                  onEdit={handleEditRoute}
                  onFilesUpload={handleFilesUpload}
                />
              ))
            )}

            {showAddForm ? (
              <AddRouteForm
                onAdd={handleAddRoute}
                onCancel={() => setShowAddForm(false)}
              />
            ) : (
              <button
                className="home-add-route-button"
                onClick={() => setShowAddForm(true)}
              >
                + Добавить маршрут
              </button>
            )}
          </div>
        </div>
      </div>

      {selectedRoute && (
        <RouteGalleryModal
          route={selectedRoute}
          onClose={() => setSelectedRoute(null)}
        />
      )}

      {routeToEdit && (
        <EditRouteModal
          isOpen={true}
          route={routeToEdit}
          onSave={handleSaveRoute}
          onCancel={() => setRouteToEdit(null)}
        />
      )}

      {routeToDelete && (
        <ConfirmModal
          isOpen={true}
          title="Удалить маршрут?"
          message={`Вы уверены, что хотите удалить маршрут "${routeToDelete.name}"? Все загруженные файлы также будут удалены. Это действие нельзя отменить.`}
          confirmText="Удалить"
          cancelText="Отмена"
          onConfirm={confirmDelete}
          onCancel={() => setRouteToDelete(null)}
        />
      )}
    </section>
  );
};
