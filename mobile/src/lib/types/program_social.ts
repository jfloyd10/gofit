import { Exercise} from '../types/program';

export interface ProgramListItem {
  id: number;
  title: string;
  description: string | null;
  focus: string;
  focus_display: string;
  difficulty: string;
  difficulty_display: string;
  image_url: string | null;
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

export interface DiscoveryFeedResponse {
  new: ProgramListItem[];
  featured: ProgramListItem[];
  trending: ProgramListItem[];
}