// src/lib/api/programs.ts

import { API_BASE_URL, ApiError } from './auth';
import { Program, Exercise, BuilderProgram, Equipment } from '../types/program';

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(0, 'API base URL is not configured.');
  }

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Only set Content-Type for non-FormData requests
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

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
      } else if (data.error) {
        message = String(data.error);
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
  focus_display: string;
  difficulty: string;
  difficulty_display: string;
  image: string | null;
  is_public: boolean;
  is_template: boolean;
  week_count: number;
  session_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProgramListResponse {
  results: ProgramListItem[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface ExerciseListResponse {
  results: Exercise[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface ProgramStats {
  total_programs: number;
  total_weeks: number;
  total_sessions: number;
  total_exercises: number;
  programs_by_focus: { focus: string; count: number }[];
  programs_by_difficulty: { difficulty: string; count: number }[];
}

export const programsApi = {
  /**
   * Get all programs for the current user (paginated)
   */
  getPrograms: (
    accessToken: string,
    filters?: {
      is_public?: boolean;
      is_template?: boolean;
      focus?: string;
      difficulty?: string;
      page?: number;
      page_size?: number;
    }
  ) => {
    let path = '/core/programs/';
    const params: string[] = [];
    
    if (filters?.is_public !== undefined) {
      params.push(`is_public=${filters.is_public}`);
    }
    if (filters?.is_template !== undefined) {
      params.push(`is_template=${filters.is_template}`);
    }
    if (filters?.focus) {
      params.push(`focus=${encodeURIComponent(filters.focus)}`);
    }
    if (filters?.difficulty) {
      params.push(`difficulty=${encodeURIComponent(filters.difficulty)}`);
    }
    if (filters?.page) {
      params.push(`page=${filters.page}`);
    }
    if (filters?.page_size) {
      params.push(`page_size=${filters.page_size}`);
    }
    
    if (params.length > 0) {
      path += '?' + params.join('&');
    }
    
    return request<ProgramListResponse>(path, {}, accessToken);
  },

  /**
   * Get a single program with all nested data
   */
  getProgram: (programId: number, accessToken: string) =>
    request<Program>(`/core/programs/${programId}/`, {}, accessToken),

  /**
   * Create a new program (basic - without nested data)
   */
  createProgram: (program: Partial<BuilderProgram>, accessToken: string) =>
    request<Program>('/core/programs/', {
      method: 'POST',
      body: JSON.stringify(program),
    }, accessToken),

  /**
   * Update an existing program (basic - without nested data)
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
   * This is the main endpoint for the ProgramBuilder
   */
  saveFullProgram: (program: BuilderProgram, accessToken: string) => {
    // Transform the BuilderProgram to match backend expected format
    const payload = transformBuilderProgramForApi(program);
    return request<Program>('/core/programs/save-full/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, accessToken);
  },

  /**
   * Duplicate a program
   */
  duplicateProgram: (programId: number, accessToken: string) =>
    request<Program>(`/core/programs/${programId}/duplicate/`, {
      method: 'POST',
    }, accessToken),

  /**
   * Get sessions for a program organized by week
   */
  getProgramSessions: (programId: number, accessToken: string) =>
    request<any[]>(`/core/programs/${programId}/sessions/`, {}, accessToken),

  /**
   * Get user's program statistics
   */
  getStats: (accessToken: string) =>
    request<ProgramStats>('/core/stats/', {}, accessToken),

  /**
   * Get public programs (for discovery)
   */
  getPublicPrograms: (
    accessToken: string,
    filters?: {
      focus?: string;
      difficulty?: string;
      search?: string;
      page?: number;
      page_size?: number;
    }
  ) => {
    let path = '/core/public-programs/';
    const params: string[] = [];
    
    if (filters?.focus) {
      params.push(`focus=${encodeURIComponent(filters.focus)}`);
    }
    if (filters?.difficulty) {
      params.push(`difficulty=${encodeURIComponent(filters.difficulty)}`);
    }
    if (filters?.search) {
      params.push(`search=${encodeURIComponent(filters.search)}`);
    }
    if (filters?.page) {
      params.push(`page=${filters.page}`);
    }
    if (filters?.page_size) {
      params.push(`page_size=${filters.page_size}`);
    }
    
    if (params.length > 0) {
      path += '?' + params.join('&');
    }
    
    return request<ProgramListResponse>(path, {}, accessToken);
  },

  /**
   * Get template programs (starter templates)
   */
  getTemplatePrograms: (
    accessToken: string,
    filters?: {
      focus?: string;
      difficulty?: string;
    }
  ) => {
    let path = '/core/template-programs/';
    const params: string[] = [];
    
    if (filters?.focus) {
      params.push(`focus=${encodeURIComponent(filters.focus)}`);
    }
    if (filters?.difficulty) {
      params.push(`difficulty=${encodeURIComponent(filters.difficulty)}`);
    }
    
    if (params.length > 0) {
      path += '?' + params.join('&');
    }
    
    return request<ProgramListResponse>(path, {}, accessToken);
  },

  /**
   * Copy a public program to user's own programs
   */
  copyPublicProgram: (programId: number, accessToken: string) =>
    request<Program>(`/core/public-programs/${programId}/copy/`, {
      method: 'POST',
    }, accessToken),
};

/**
 * Transform BuilderProgram to API format
 * Converts tempIds and nested structure to backend expected format
 */
function transformBuilderProgramForApi(program: BuilderProgram): any {
  return {
    id: program.id || null,
    title: program.title,
    description: program.description,
    focus: program.focus,
    difficulty: program.difficulty,
    is_public: program.is_public,
    is_template: program.is_template || false,
    price: program.price || 0,
    weeks: program.weeks.map((week) => ({
      id: week.id || null,
      temp_id: week.tempId,
      week_number: week.week_number,
      week_name: week.week_name,
      notes: week.notes,
      sessions: week.sessions.map((session) => ({
        id: session.id || null,
        temp_id: session.tempId,
        title: session.title,
        description: session.description,
        focus: session.focus,
        day_of_week: session.day_of_week,
        day_ordering: session.day_ordering,
        blocks: session.blocks.map((block) => ({
          id: block.id || null,
          temp_id: block.tempId,
          block_order: block.block_order,
          scheme_type: block.scheme_type,
          block_name: block.block_name,
          block_notes: block.block_notes,
          duration_target: block.duration_target,
          rounds_target: block.rounds_target,
          activities: block.activities.map((activity) => ({
            id: activity.id || null,
            temp_id: activity.tempId,
            order_in_block: activity.order_in_block,
            exercise_id: activity.exercise?.id || null,
            manual_name: activity.manual_name,
            manual_video_url: activity.manual_video_url,
            manual_image: activity.manual_image,
            notes: activity.notes,
            prescriptions: activity.prescriptions.map((prescription) => ({
              id: prescription.id || null,
              temp_id: prescription.tempId,
              set_number: prescription.set_number,
              set_tag: prescription.set_tag,
              primary_metric: prescription.primary_metric,
              prescription_notes: prescription.prescription_notes,
              reps: prescription.reps,
              rest_seconds: prescription.rest_seconds,
              tempo: prescription.tempo,
              weight: prescription.weight,
              is_per_side: prescription.is_per_side,
              intensity_value: prescription.intensity_value,
              intensity_type: prescription.intensity_type,
              duration_seconds: prescription.duration_seconds,
              distance: prescription.distance,
              calories: prescription.calories,
              extra_data: prescription.extra_data,
            })),
          })),
        })),
      })),
    })),
  };
}

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

  /**
   * Get all equipment types used in exercises
   */
  getEquipmentList: (accessToken: string) =>
    request<string[]>('/core/exercises/equipment-list/', {}, accessToken),

  /**
   * Duplicate an exercise as a custom exercise
   */
  duplicateExercise: (exerciseId: number, accessToken: string) =>
    request<Exercise>(`/core/exercises/${exerciseId}/duplicate/`, {
      method: 'POST',
    }, accessToken),
};

export const equipmentApi = {
  /**
   * Get all equipment
   */
  getEquipment: (accessToken: string, search?: string) => {
    let path = '/core/equipment/';
    if (search) {
      path += `?search=${encodeURIComponent(search)}`;
    }
    return request<Equipment[]>(path, {}, accessToken);
  },

  /**
   * Get equipment names only (for dropdowns)
   */
  getEquipmentNames: (accessToken: string) =>
    request<string[]>('/core/equipment/names/', {}, accessToken),

  /**
   * Get single equipment
   */
  getEquipmentById: (equipmentId: number, accessToken: string) =>
    request<Equipment>(`/core/equipment/${equipmentId}/`, {}, accessToken),
};
