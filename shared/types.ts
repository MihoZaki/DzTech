export interface User {
  id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ErrorResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors?: Record<string, any>;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_page: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  price_cents: number;
  stock_quantity: number;
  status: string;
  brand: string;
  image_urls: string[];
  spec_highlights: Record<string, any>;
  category_id: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  type: string;
  parent_id?: string;
}
