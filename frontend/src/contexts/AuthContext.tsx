import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User, LoginFormData, RegisterFormData } from '../types';
import { apiService } from '../services';
import { storage } from '../utils/storage';
import { ROUTES } from '../config/constants';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: LoginFormData) => Promise<void>;
  register: (data: RegisterFormData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const refreshUser = async () => {
    try {
      const token = storage.getToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const userData = await apiService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Не удалось получить данные пользователя:', error);
      storage.removeToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (data: LoginFormData) => {
    const tokenData = await apiService.login(data);
    storage.setToken(tokenData.access_token);
    await refreshUser();
    navigate(ROUTES.HOME);
  };

  const register = async (data: RegisterFormData) => {
    const tokenData = await apiService.register(data);
    storage.setToken(tokenData.access_token);
    await refreshUser();
    navigate(ROUTES.HOME);
  };

  const logout = () => {
    storage.removeToken();
    setUser(null);
    navigate(ROUTES.LOGIN);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

