import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts';
import { ROUTES } from '../config/constants';

interface PublicRouteProps {
  children: React.ReactNode;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (user) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <>{children}</>;
};

