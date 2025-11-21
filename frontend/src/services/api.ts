import type { User, Token, LoginFormData, RegisterFormData, Route } from '../types';
import { API_BASE_URL } from '../config/constants';
import { storage } from '../utils/storage';

export interface ProcessedFile {
  original: string;
  processed_id?: string;
  processed_path?: string;
  file_id?: string;
  error?: string;
  note?: string;
}

export interface UploadFilesResponse {
  message: string;
  files: string[];
  processed_files: ProcessedFile[];
}

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

  async getRoutes(): Promise<Route[]> {
    return this.request<Route[]>('/routes');
  }

  async createRoute(name: string, description?: string | null): Promise<Route> {
    return this.request<Route>('/routes', {
      method: 'POST',
      body: JSON.stringify({ name, description: description || null }),
    });
  }

  private async requestWithoutBody(
    endpoint: string,
    method: string = 'DELETE'
  ): Promise<void> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
    });

    if (!response.ok && response.status !== 204) {
      const error = await response.json().catch(() => ({ detail: 'Неизвестная ошибка' }));
      throw new Error(error.detail || `Ошибка HTTP! Статус: ${response.status}`);
    }
  }

  private async requestWithFormData<T>(
    endpoint: string,
    formData: FormData
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Неизвестная ошибка' }));
      throw new Error(error.detail || `Ошибка HTTP! Статус: ${response.status}`);
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T;
    }

    return response.json();
  }

  async updateRoute(id: string, name: string, description?: string | null): Promise<Route> {
    return this.request<Route>(`/routes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description: description || null }),
    });
  }

  async deleteRoute(id: string): Promise<void> {
    return this.requestWithoutBody(`/routes/${id}`, 'DELETE');
  }

  async uploadFiles(routeId: string, files: File[]): Promise<UploadFilesResponse> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    return this.requestWithFormData<UploadFilesResponse>(`/routes/${routeId}/files`, formData);
  }

  getProcessedImageUrl(routeId: string, fileId: string): string {
    const token = this.getToken();
    const url = `${API_BASE_URL}/routes/${routeId}/files/${fileId}/processed`;
    // Добавляем токен как query параметр
    return token ? `${url}?token=${encodeURIComponent(token)}` : url;
  }

  async deleteFile(routeId: string, fileId: string): Promise<void> {
    return this.requestWithoutBody(`/routes/${routeId}/files/${fileId}`, 'DELETE');
  }

  async getRouteFiles(routeId: string): Promise<{ files: ProcessedFile[] }> {
    return this.request<{ files: ProcessedFile[] }>(`/routes/${routeId}/files`);
  }

  async getRouteStats(routeId: string): Promise<{
    total_processed: number;
    with_green_detections: number;
    with_red_detections: number;
  }> {
    return this.request<{
      total_processed: number;
      with_green_detections: number;
      with_red_detections: number;
    }>(`/routes/${routeId}/stats`);
  }
}

export const apiService = new ApiService();

