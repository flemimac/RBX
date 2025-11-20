import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts';
import { ROUTES } from '../config/constants';
import './Header.css';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const getTitle = () => {
    if (location.pathname === ROUTES.REGISTER) {
      return 'Создать аккаунт';
    }
    return 'RBX';
  };

  return (
    <header className="app-header">
      <h1>{getTitle()}</h1>
      {user ? (
        <button onClick={logout} className="secondary">
          Выйти
        </button>
      ) : location.pathname === ROUTES.REGISTER ? (
        <Link to={ROUTES.LOGIN} className="secondary button-link">
          Назад ко входу
        </Link>
      ) : null}
    </header>
  );
};

