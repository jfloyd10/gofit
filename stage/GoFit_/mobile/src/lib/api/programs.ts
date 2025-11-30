// src/lib/api/programs.ts

import { API_BASE_URL, ApiError } from './auth';
import { Program, Exercise, BuilderProgram } from '../types/program';

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

export interface ProgramListItem {
  id: number;
  title: string;
  description: string | null;
  focus: string;
  difficulty: string;
  image: string | null;
  is_public: boolean;
  week_count: number;
  created_at: string;
}

export interface ExerciseListResponse {
  results: Exercise[];
  count: number;
  next: string | null;
  previous: string | null;
}

export const programsApi = {
  /**
   * Get all programs for the current user
   */
  getPrograms: (accessToken: string) =>
    request<ProgramListItem[]>('/core/programs/', {}, accessToken),

  /**
   * Get a single program with all nested data
   */
  getProgram: (programId: number, accessToken: string) =>
    request<Program>(`/core/programs/${programId}/`, {}, accessToken),

  /**
   * Create a new program
   */
  createProgram: (program: Partial<BuilderProgram>, accessToken: string) =>
    request<Program>('/core/programs/', {
      method: 'POST',
      body: JSON.stringify(program),
    }, accessToken),

  /**
   * Update an existing program
   */
  updateProgram: (programId: number, program: Partial<BuilderProgram>, accessToken: string) =>
    request<Program>(`/core/programs/${programId}/`, {
      method: 'PATCH',
      body: JSON.stringify(program),
    }, accessToken),

  /**
   * Delete a program
   */
  deleteProgram: (programId: number, accessToken: string) =>
    request<void>(`/core/programs/${programId}/`, {
      method: 'DELETE',
    }, accessToken),

  /**
   * Save full program with all nested data (bulk create/update)
   */
  saveFullProgram: (program: BuilderProgram, accessToken: string) =>
    request<Program>('/core/programs/save-full/', {
      method: 'POST',
      body: JSON.stringify(program),
    }, accessToken),
};

export const exercisesApi = {
  /**
   * Get official exercises with filtering
   */
  getOfficialExercises: (
    accessToken: string,
    filters?: {
      search?: string;
      category?: string;
      muscle_groups?: string;
      equipment?: string;
      page?: number;
      page_size?: number;
    }
  ) => {
    let path = '/core/exercises/?is_official=true';
    
    if (filters?.search) {
      path += `&search=${encodeURIComponent(filters.search)}`;
    }
    if (filters?.category) {
      path += `&category=${encodeURIComponent(filters.category)}`;
    }
    if (filters?.muscle_groups) {
      path += `&muscle_groups=${encodeURIComponent(filters.muscle_groups)}`;
    }
    if (filters?.equipment) {
      path += `&equipment_needed=${encodeURIComponent(filters.equipment)}`;
    }
    if (filters?.page) {
      path += `&page=${filters.page}`;
    }
    if (filters?.page_size) {
      path += `&page_size=${filters.page_size}`;
    }
    
    return request<ExerciseListResponse>(path, {}, accessToken);
  },

  /**
   * Get user's custom exercises
   */
  getCustomExercises: (
    accessToken: string,
    filters?: {
      search?: string;
      category?: string;
      muscle_groups?: string;
      page?: number;
      page_size?: number;
    }
  ) => {
    let path = '/core/exercises/?is_official=false';
    
    if (filters?.search) {
      path += `&search=${encodeURIComponent(filters.search)}`;
    }
    if (filters?.category) {
      path += `&category=${encodeURIComponent(filters.category)}`;
    }
    if (filters?.muscle_groups) {
      path += `&muscle_groups=${encodeURIComponent(filters.muscle_groups)}`;
    }
    if (filters?.page) {
      path += `&page=${filters.page}`;
    }
    if (filters?.page_size) {
      path += `&page_size=${filters.page_size}`;
    }
    
    return request<ExerciseListResponse>(path, {}, accessToken);
  },

  /**
   * Create a custom exercise
   */
  createExercise: (exercise: Partial<Exercise>, accessToken: string) =>
    request<Exercise>('/core/exercises/', {
      method: 'POST',
      body: JSON.stringify({ ...exercise, is_official: false }),
    }, accessToken),

  /**
   * Update a custom exercise
   */
  updateExercise: (exerciseId: number, exercise: Partial<Exercise>, accessToken: string) =>
    request<Exercise>(`/core/exercises/${exerciseId}/`, {
      method: 'PATCH',
      body: JSON.stringify(exercise),
    }, accessToken),

  /**
   * Delete a custom exercise
   */
  deleteExercise: (exerciseId: number, accessToken: string) =>
    request<void>(`/core/exercises/${exerciseId}/`, {
      method: 'DELETE',
    }, accessToken),

  /**
   * Get all exercise categories
   */
  getCategories: (accessToken: string) =>
    request<string[]>('/core/exercises/categories/', {}, accessToken),

  /**
   * Get all muscle groups
   */
  getMuscleGroups: (accessToken: string) =>
    request<string[]>('/core/exercises/muscle-groups/', {}, accessToken),
};
