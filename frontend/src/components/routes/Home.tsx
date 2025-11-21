import React, { useState, useEffect } from 'react';
import { apiService } from '../../services';
import { fileStorage } from '../../utils';
import type { Route } from '../../types';
import { RouteList } from './RouteList';
import { RouteView } from './RouteView';
import { AddRouteForm } from './AddRouteForm';
import { EditRouteModal } from './EditRouteModal';
import { ConfirmModal } from '../ui/ConfirmModal';
import './Home.css';

export const Home: React.FC = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<Route | null>(null);
  const [routeToEdit, setRouteToEdit] = useState<Route | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

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
      const fileCount = await fileStorage.getFileCount(newRoute.id);
      setRoutes([...routes, { ...newRoute, fileCount }]);
      setShowAddForm(false);
    } catch (error) {
      console.error('Не удалось создать маршрут:', error);
      alert('Не удалось создать маршрут');
    }
  };

  const handleCreateRouteWithFiles = async (name: string, description: string | undefined, files: File[]) => {
    try {
      // Создаем маршрут
      const newRoute = await apiService.createRoute(name, description);
      const fileCount = await fileStorage.getFileCount(newRoute.id);
      const routeWithFileCount = { ...newRoute, fileCount };

      // Добавляем маршрут в список
      setRoutes([...routes, routeWithFileCount]);

      // Выбираем созданный маршрут
      setSelectedRoute(routeWithFileCount);

      // Загружаем файлы по одному для отслеживания прогресса
      setUploadProgress({ current: 0, total: files.length });

      for (let i = 0; i < files.length; i++) {
        try {
          await apiService.uploadSingleFile(newRoute.id, files[i]);
          setUploadProgress({ current: i + 1, total: files.length });
        } catch (fileError) {
          console.error(`Ошибка загрузки файла ${files[i].name}:`, fileError);
          // Продолжаем загрузку остальных файлов
        }
      }

      // Обновляем список маршрутов после загрузки
      const data = await apiService.getRoutes();
      const routesWithFileCounts = await Promise.all(
        data.map(async (route) => {
          const fileCount = await fileStorage.getFileCount(route.id);
          return { ...route, fileCount };
        })
      );
      setRoutes(routesWithFileCounts);
      const updatedRoute = routesWithFileCounts.find((r) => r.id === newRoute.id);
      if (updatedRoute) {
        setSelectedRoute(updatedRoute);
      }
    } catch (error) {
      console.error('Не удалось создать маршрут с файлами:', error);
      alert('Не удалось создать маршрут с файлами');
      throw error;
    } finally {
      setUploadProgress(null);
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
      // Сбрасываем выбранный маршрут, если удалили выбранный
      if (selectedRoute?.id === id) {
        setSelectedRoute(null);
      }
    } catch (error) {
      console.error('Не удалось удалить маршрут:', error);
      alert('Не удалось удалить маршрут');
    }
  };

  const handleSelectRoute = (route: Route) => {
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
      if (selectedRoute?.id === id) {
        setSelectedRoute({ ...updatedRoute, fileCount: selectedRoute.fileCount });
      }
      setRouteToEdit(null);
    } catch (error) {
      console.error('Не удалось обновить маршрут:', error);
      alert('Не удалось обновить маршрут');
    }
  };

  const handleFilesUpload = async (routeId: string, files: File[]) => {
    try {
      // Загружаем файлы через API (обработка происходит на сервере)
      await apiService.uploadFiles(routeId, files);
      const data = await apiService.getRoutes();
      const routesWithFileCounts = await Promise.all(
        data.map(async (route) => {
          const fileCount = await fileStorage.getFileCount(route.id);
          return { ...route, fileCount };
        })
      );
      setRoutes(routesWithFileCounts);
      if (selectedRoute?.id === routeId) {
        const updatedRoute = routesWithFileCounts.find((r) => r.id === routeId);
        if (updatedRoute) {
          setSelectedRoute(updatedRoute);
        }
      }
    } catch (error) {
      console.error('Не удалось сохранить файлы:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      throw new Error(`Не удалось сохранить файлы: ${errorMessage}`);
    }
  };

  return (
    <div className="home-container">
      <div className="home-layout">
        <div className="home-sidebar">
          <RouteList
            routes={routes}
            selectedRouteId={selectedRoute?.id || null}
            onSelectRoute={handleSelectRoute}
            onAddRoute={() => setShowAddForm(true)}
            loading={loading}
          />
        </div>

        <div className="home-main">
          <RouteView
            route={selectedRoute}
            onFilesUpload={handleFilesUpload}
            onEdit={handleEditRoute}
            onDelete={handleDeleteRoute}
            onAddRoute={() => setShowAddForm(true)}
            onCreateRouteWithFiles={handleCreateRouteWithFiles}
            uploadProgress={uploadProgress}
          />
        </div>
      </div>

      {showAddForm && (
        <AddRouteForm
          onAdd={handleAddRoute}
          onCancel={() => setShowAddForm(false)}
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
    </div>
  );
};
