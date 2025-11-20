import type { User, Token, Item, LoginFormData, RegisterFormData } from '../types';
import { API_BASE_URL } from '../config/constants';
import { storage } from '../utils/storage';

class ApiService {
  private getToken(): string | null {
    return storage.getToken();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Неизвестная ошибка' }));
      throw new Error(error.detail || `Ошибка HTTP! Статус: ${response.status}`);
    }

    return response.json();
  }

  async login(data: LoginFormData): Promise<Token> {
    const formData = new URLSearchParams({
      username: data.email,
      password: data.password,
    });

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Неверный email или пароль' }));
      throw new Error(error.detail || 'Ошибка входа');
    }

    return response.json();
  }

  async register(data: RegisterFormData): Promise<Token> {
    return this.request<Token>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async getItems(): Promise<Item[]> {
    return this.request<Item[]>('/items');
  }
}

export const apiService = new ApiService();

