// src/lib/types/session.ts

/**
 * Exercise - the canonical definition of an exercise
 */
export interface Exercise {
  id: number;
  name: string;
  image: string | null;
  video_url: string | null;
  muscle_groups: string | null;
  equipment_needed: string | null;
}

/**
 * ActivityPrescription - the sets/reps/weight/time details for an activity
 */
export interface ActivityPrescription {
  id: number;
  set_number: number;
  set_tag: 'N' | 'W' | 'D' | 'F' | 'C';
  set_tag_display: string;
  primary_metric: 'reps' | 'time' | 'distance' | 'calories' | 'weight' | 'none';
  primary_metric_display: string;
  prescription_notes: string | null;
  
  // Weightlifting fields
  reps: string | null;
  rest_seconds: number | null;
  tempo: string | null;
  weight: number | null; // stored in kg
  is_per_side: boolean;
  
  // Intensity fields
  intensity_value: string | null;
  intensity_type: 'weight' | 'rpe' | 'power' | 'perc_ftp' | 'percent_1rm' | 'heart_rate_zone' | 'heart_rate' | 'pace' | null;
  intensity_type_display: string | null;
  
  // Cardio fields
  duration_seconds: number | null;
  distance: number | null; // stored in meters
  calories: number | null;
  
  // Extra data
  extra_data: Record<string, any> | null;
  display_label: string;
}

/**
 * Activity - a single exercise within a session block
 */
export interface Activity {
  id: number;
  order_in_block: number;
  exercise: Exercise | null;
  manual_name: string | null;
  manual_video_url: string | null;
  manual_image: string | null;
  notes: string | null;
  display_name: string;
  prescriptions: ActivityPrescription[];
}

/**
 * SessionBlock - groups activities together (e.g., Warmup, Main Set, etc.)
 */
export type SchemeType = 'STANDARD' | 'CIRCUIT' | 'INTERVAL' | 'EMOM' | 'AMRAP' | 'RFT' | 'TABATA';

export interface SessionBlock {
  id: number;
  block_order: number;
  scheme_type: SchemeType;
  scheme_type_display: string;
  block_name: string | null;
  block_notes: string | null;
  duration_target: number | null; // seconds for AMRAP/EMOM
  rounds_target: number | null; // for RFT
  activities: Activity[];
}

/**
 * Session - a full workout session
 */
export type SessionFocus = 'Lift' | 'Cardio' | 'Stretch';
export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface Session {
  id: number;
  title: string;
  description: string | null;
  focus: SessionFocus;
  focus_display: string;
  day_of_week: DayOfWeek;
  day_of_week_display: string;
  day_ordering: number;
  preview_image: string | null;
  estimated_session_time: string;
  has_program: boolean;
  
  // Week/Program context
  week_number: number | null;
  week_name: string | null;
  program_id: number | null;
  program_title: string | null;
  
  // Nested data
  blocks: SessionBlock[];
  
  created_at: string;
  updated_at: string;
}

/**
 * SessionListItem - minimal session data for list views
 */
export interface SessionListItem {
  id: number;
  title: string;
  description: string | null;
  focus: SessionFocus;
  focus_display: string;
  day_of_week: DayOfWeek;
  day_of_week_display: string;
  preview_image: string | null;
  estimated_session_time: string;
  activity_count: number;
}

/**
 * Helper types for set tags
 */
export const SET_TAG_LABELS: Record<ActivityPrescription['set_tag'], string> = {
  'N': 'Working',
  'W': 'Warmup',
  'D': 'Drop',
  'F': 'AMRAP',
  'C': 'Cooldown',
};

export const SET_TAG_COLORS: Record<ActivityPrescription['set_tag'], string> = {
  'N': '#0A84FF', // blue
  'W': '#FF9500', // orange
  'D': '#FF3B30', // red
  'F': '#AF52DE', // purple
  'C': '#34C759', // green
};

/**
 * Helper to format duration in seconds to readable string
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins} min`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Helper to format distance in meters to readable string
 */
export function formatDistance(meters: number, useMetric: boolean = true): string {
  if (useMetric) {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  } else {
    const miles = meters / 1609.34;
    if (miles >= 0.5) {
      return `${miles.toFixed(2)} mi`;
    }
    const yards = meters * 1.09361;
    return `${Math.round(yards)} yd`;
  }
}

/**
 * Helper to format weight in kg to readable string
 */
export function formatWeight(kg: number, useMetric: boolean = true): string {
  if (useMetric) {
    return `${kg} kg`;
  } else {
    const lbs = kg * 2.20462;
    return `${Math.round(lbs)} lbs`;
  }
}
