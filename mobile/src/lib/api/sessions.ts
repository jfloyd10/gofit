// src/lib/api/sessions.ts
import { API_BASE_URL, ApiError } from './auth';
import { Session, SessionListItem } from '../types/session';

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(0, 'API base URL is not configured.');
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

export const sessionsApi = {
  /**
   * Get a single session with all nested blocks, activities, and prescriptions
   */
  getSession: (sessionId: number, accessToken: string) =>
    request<Session>(`/core/sessions/${sessionId}/`, {}, accessToken),

  /**
   * Get a list of all sessions (minimal data)
   */
  getSessions: (accessToken: string, filters?: { week?: number; program?: number }) => {
    let path = '/core/sessions/';
    const params = new URLSearchParams();
    
    if (filters?.week) {
      params.append('week', filters.week.toString());
    }
    if (filters?.program) {
      params.append('program', filters.program.toString());
    }
    
    const queryString = params.toString();
    if (queryString) {
      path += `?${queryString}`;
    }
    
    return request<SessionListItem[]>(path, {}, accessToken);
  },

  /**
   * Get all sessions for a program, organized by week
   */
  getSessionsByProgram: (programId: number, accessToken: string) =>
    request<{
      week_id: number;
      week_number: number;
      week_name: string | null;
      notes: string | null;
      sessions: SessionListItem[];
    }[]>(`/core/programs/${programId}/sessions/`, {}, accessToken),
};
