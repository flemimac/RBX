export interface User {
  id: string;
  email: string;
  full_name: string | null;
}

export interface Token {
  access_token: string;
}

export interface Route {
  id: string;
  name: string;
  description?: string | null;
  user_id: string;
  files?: string[];
  fileCount?: number;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  full_name?: string;
}

