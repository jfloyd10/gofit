// src/lib/types/program.ts

import { Session, SessionBlock, Activity, ActivityPrescription, SchemeType } from './session';

/**
 * Program focus options
 */
export type ProgramFocus = 'Crossfit' | 'Yoga' | 'Hybrid' | 'Cardio' | 'Strength' | 'Triathalon';

/**
 * Program difficulty levels
 */
export type ProgramDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

/**
 * Program - the top level workout program
 */
export interface Program {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  focus: ProgramFocus;
  difficulty: ProgramDifficulty;
  image: string | null;
  video_url: string | null;
  price: number;
  is_public: boolean;
  is_template: boolean;
  weeks: Week[];
  created_at: string;
  updated_at: string;
}

/**
 * Week within a program
 */
export interface Week {
  id: number;
  program_id: number;
  week_number: number;
  week_name: string | null;
  notes: string | null;
  sessions: Session[];
  created_at: string;
  updated_at: string;
}

/**
 * Equipment definition
 */
export interface Equipment {
  id: number;
  name: string;
  description: string | null;
  image: string | null;
}

/**
 * Exercise from the master table
 */
export interface Exercise {
  id: number;
  user_id: number | null;
  name: string;
  description: string | null;
  category: string | null;
  equipment_needed: string | null;
  muscle_groups: string | null;
  image: string | null;
  video_url: string | null;
  default_sets: number;
  default_reps: number;
  default_rest: number;
  is_official: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Form state types for building programs
 */
export interface ProgramFormData {
  title: string;
  description: string;
  focus: ProgramFocus;
  difficulty: ProgramDifficulty;
  is_public: boolean;
}

export interface WeekFormData {
  week_number: number;
  week_name: string;
  notes: string;
}

export interface SessionFormData {
  title: string;
  description: string;
  focus: 'Lift' | 'Cardio' | 'Stretch';
  day_of_week: string;
  day_ordering: number;
}

export interface BlockFormData {
  block_order: number;
  scheme_type: SchemeType;
  block_name: string;
  block_notes: string;
  duration_target: number | null;
  rounds_target: number | null;
}

export interface ActivityFormData {
  order_in_block: number;
  exercise_id: number | null;
  manual_name: string;
  manual_video_url: string;
  notes: string;
}

export interface PrescriptionFormData {
  set_number: number;
  set_tag: 'N' | 'W' | 'D' | 'F' | 'C';
  primary_metric: 'reps' | 'time' | 'distance' | 'calories' | 'weight' | 'none';
  prescription_notes: string;
  reps: string;
  rest_seconds: number | null;
  tempo: string;
  weight: number | null;
  is_per_side: boolean;
  intensity_value: string;
  intensity_type: string | null;
  duration_seconds: number | null;
  distance: number | null;
  calories: number | null;
}

/**
 * Builder state types
 */
export interface BuilderProgram {
  id?: number;
  title: string;
  description: string;
  focus: ProgramFocus;
  difficulty: ProgramDifficulty;
  is_public: boolean;
  weeks: BuilderWeek[];
}

export interface BuilderWeek {
  id?: number;
  tempId: string;
  week_number: number;
  week_name: string;
  notes: string;
  sessions: BuilderSession[];
  isCollapsed?: boolean;
}

export interface BuilderSession {
  id?: number;
  tempId: string;
  title: string;
  description: string;
  focus: 'Lift' | 'Cardio' | 'Stretch';
  day_of_week: string;
  day_ordering: number;
  blocks: BuilderBlock[];
}

export interface BuilderBlock {
  id?: number;
  tempId: string;
  block_order: number;
  scheme_type: SchemeType;
  block_name: string;
  block_notes: string;
  duration_target: number | null;
  rounds_target: number | null;
  activities: BuilderActivity[];
}

export interface BuilderActivity {
  id?: number;
  tempId: string;
  order_in_block: number;
  exercise: Exercise | null;
  manual_name: string;
  manual_video_url: string;
  manual_image: string | null;
  notes: string;
  prescriptions: BuilderPrescription[];
}

export interface BuilderPrescription {
  id?: number;
  tempId: string;
  set_number: number;
  set_tag: 'N' | 'W' | 'D' | 'F' | 'C';
  primary_metric: 'reps' | 'time' | 'distance' | 'calories' | 'weight' | 'none';
  prescription_notes: string;
  reps: string;
  rest_seconds: number | null;
  tempo: string;
  weight: number | null;
  is_per_side: boolean;
  intensity_value: string;
  intensity_type: string | null;
  duration_seconds: number | null;
  distance: number | null;
  calories: number | null;
}

/**
 * Exercise Library types
 */
export interface ExerciseFilter {
  search: string;
  category: string | null;
  muscle_group: string | null;
  equipment: string | null;
}

export type ExerciseSortOption = 'name' | 'category' | 'muscle_groups' | 'recent';

/**
 * Exercise categories
 */
export const EXERCISE_CATEGORIES = [
  'Barbell',
  'Dumbbell',
  'Machine',
  'Bodyweight',
  'Cable',
  'Kettlebell',
  'Cardio',
  'Stretching',
  'Olympic',
  'Plyometric',
] as const;

/**
 * Muscle groups
 */
export const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Core',
  'Quadriceps',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Full Body',
] as const;

/**
 * Program focus options with labels
 */
export const PROGRAM_FOCUS_OPTIONS: { value: ProgramFocus; label: string }[] = [
  { value: 'Strength', label: 'Strength Training' },
  { value: 'Cardio', label: 'Cardio' },
  { value: 'Crossfit', label: 'CrossFit' },
  { value: 'Yoga', label: 'Yoga' },
  { value: 'Hybrid', label: 'Hybrid' },
  { value: 'Triathalon', label: 'Triathlon' },
];

/**
 * Difficulty options with labels
 */
export const DIFFICULTY_OPTIONS: { value: ProgramDifficulty; label: string; color: string }[] = [
  { value: 'Beginner', label: 'Beginner', color: '#34C759' },
  { value: 'Intermediate', label: 'Intermediate', color: '#FF9500' },
  { value: 'Advanced', label: 'Advanced', color: '#FF3B30' },
];

/**
 * Session focus options
 */
export const SESSION_FOCUS_OPTIONS = [
  { value: 'Lift', label: 'Lift' },
  { value: 'Cardio', label: 'Cardio' },
  { value: 'Stretch', label: 'Stretch' },
] as const;

/**
 * Days of week options
 */
export const DAYS_OF_WEEK = [
  { value: 'Monday', label: 'Mon' },
  { value: 'Tuesday', label: 'Tue' },
  { value: 'Wednesday', label: 'Wed' },
  { value: 'Thursday', label: 'Thu' },
  { value: 'Friday', label: 'Fri' },
  { value: 'Saturday', label: 'Sat' },
  { value: 'Sunday', label: 'Sun' },
] as const;

/**
 * Block scheme types with labels and icons
 */
export const SCHEME_TYPE_OPTIONS: { value: SchemeType; label: string; description: string }[] = [
  { value: 'STANDARD', label: 'Standard', description: 'Regular exercise list' },
  { value: 'CIRCUIT', label: 'Circuit', description: 'Exercises performed back-to-back' },
  { value: 'INTERVAL', label: 'Interval', description: 'Work and rest intervals' },
  { value: 'EMOM', label: 'EMOM', description: 'Every Minute on the Minute' },
  { value: 'AMRAP', label: 'AMRAP', description: 'As Many Rounds as Possible' },
  { value: 'RFT', label: 'Rounds for Time', description: 'Complete X rounds for time' },
  { value: 'TABATA', label: 'Tabata', description: '20s work, 10s rest intervals' },
];

/**
 * Set tag options
 */
export const SET_TAG_OPTIONS = [
  { value: 'N', label: 'Working', color: '#0A84FF' },
  { value: 'W', label: 'Warmup', color: '#FF9500' },
  { value: 'D', label: 'Drop Set', color: '#FF3B30' },
  { value: 'F', label: 'AMRAP', color: '#AF52DE' },
  { value: 'C', label: 'Cooldown', color: '#34C759' },
] as const;

/**
 * Primary metric options
 */
export const PRIMARY_METRIC_OPTIONS = [
  { value: 'reps', label: 'Reps' },
  { value: 'time', label: 'Time' },
  { value: 'distance', label: 'Distance' },
  { value: 'calories', label: 'Calories' },
  { value: 'weight', label: 'Weight' },
  { value: 'none', label: 'None' },
] as const;

/**
 * Intensity type options
 */
export const INTENSITY_TYPE_OPTIONS = [
  { value: 'weight', label: 'Weight' },
  { value: 'rpe', label: 'RPE' },
  { value: 'percent_1rm', label: '%1RM' },
  { value: 'heart_rate_zone', label: 'HR Zone' },
  { value: 'heart_rate', label: 'Heart Rate' },
  { value: 'pace', label: 'Pace' },
  { value: 'power', label: 'Power' },
  { value: 'perc_ftp', label: '%FTP' },
] as const;

/**
 * Helper to generate unique temp IDs
 */
export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new empty week
 */
export function createEmptyWeek(weekNumber: number): BuilderWeek {
  return {
    tempId: generateTempId(),
    week_number: weekNumber,
    week_name: `Week ${weekNumber}`,
    notes: '',
    sessions: [],
    isCollapsed: false,
  };
}

/**
 * Create a new empty session
 */
export function createEmptySession(dayOrdering: number = 0): BuilderSession {
  return {
    tempId: generateTempId(),
    title: 'New Session',
    description: '',
    focus: 'Lift',
    day_of_week: 'Monday',
    day_ordering: dayOrdering,
    blocks: [],
  };
}

/**
 * Create a new empty block
 */
export function createEmptyBlock(blockOrder: number = 0): BuilderBlock {
  return {
    tempId: generateTempId(),
    block_order: blockOrder,
    scheme_type: 'STANDARD',
    block_name: '',
    block_notes: '',
    duration_target: null,
    rounds_target: null,
    activities: [],
  };
}

/**
 * Create a new empty activity
 */
export function createEmptyActivity(orderInBlock: number = 0): BuilderActivity {
  return {
    tempId: generateTempId(),
    order_in_block: orderInBlock,
    exercise: null,
    manual_name: '',
    manual_video_url: '',
    manual_image: null,
    notes: '',
    prescriptions: [],
  };
}

/**
 * Create an activity from an exercise
 */
export function createActivityFromExercise(exercise: Exercise, orderInBlock: number = 0): BuilderActivity {
  const prescriptions: BuilderPrescription[] = [];
  
  // Add default prescriptions based on exercise defaults
  for (let i = 1; i <= exercise.default_sets; i++) {
    prescriptions.push(createEmptyPrescription(i, exercise.default_reps, exercise.default_rest));
  }
  
  return {
    tempId: generateTempId(),
    order_in_block: orderInBlock,
    exercise: exercise,
    manual_name: '',
    manual_video_url: '',
    manual_image: null,
    notes: '',
    prescriptions,
  };
}

/**
 * Create a new empty prescription
 */
export function createEmptyPrescription(
  setNumber: number = 1,
  defaultReps: number = 8,
  defaultRest: number = 60
): BuilderPrescription {
  return {
    tempId: generateTempId(),
    set_number: setNumber,
    set_tag: 'N',
    primary_metric: 'reps',
    prescription_notes: '',
    reps: defaultReps.toString(),
    rest_seconds: defaultRest,
    tempo: '',
    weight: null,
    is_per_side: false,
    intensity_value: '',
    intensity_type: null,
    duration_seconds: null,
    distance: null,
    calories: null,
  };
}
