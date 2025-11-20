export interface User {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
}

export interface Token {
  access_token: string;
}

export interface Item {
  id: number;
  name: string | null;
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

