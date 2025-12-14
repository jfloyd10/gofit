import { AuthUser } from '../types/user'; 
export const API_BASE_URL = 'https://rural-zulma-unhued.ngrok-free.dev/api/v1';
export const API_BASE_URL_1 = 'http://192.168.1.199:8000/api/v1';

export interface AuthTokens {
  access: string;
  refresh: string;
}

export class ApiError extends Error {
  status: number;
  body: any;

  constructor(status: number, message: string, body?: any) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(0, 'API base URL is not configured (EXPO_PUBLIC_API_BASE_URL).');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (err) {
    throw new ApiError(0, 'Network error. Please check your internet connection and try again.');
  }

  const text = await response.text();
  let data: any = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    let message = 'Something went wrong. Please try again.';
    if (data && typeof data === 'object') {
      if (data.detail) {
        message = String(data.detail);
      } else if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
        message = String(data.non_field_errors[0]);
      }
    } else if (typeof data === 'string') {
      message = data;
    }

    throw new ApiError(response.status, message, data);
  }

  return data as T;
}

export const authApi = {
  login: (username: string, password: string) =>
    request<AuthTokens>('/accounts/token/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getCurrentUser: (accessToken: string) =>
    request<AuthUser>('/accounts/me/', {}, accessToken),
};