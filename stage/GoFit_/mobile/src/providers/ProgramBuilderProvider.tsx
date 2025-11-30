// src/providers/ProgramBuilderProvider.tsx

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import {
  BuilderProgram,
  BuilderWeek,
  BuilderSession,
  BuilderBlock,
  BuilderActivity,
  BuilderPrescription,
  Exercise,
  ProgramFocus,
  ProgramDifficulty,
  createEmptyWeek,
  createEmptySession,
  createEmptyBlock,
  createActivityFromExercise,
  createEmptyPrescription,
  generateTempId,
} from '../lib/types/program';
import { SchemeType } from '../lib/types/session';

// Action types
type ProgramBuilderAction =
  | { type: 'SET_PROGRAM'; payload: BuilderProgram }
  | { type: 'RESET_PROGRAM' }
  | { type: 'UPDATE_PROGRAM_INFO'; payload: Partial<BuilderProgram> }
  // Week actions
  | { type: 'ADD_WEEK' }
  | { type: 'UPDATE_WEEK'; weekTempId: string; payload: Partial<BuilderWeek> }
  | { type: 'DELETE_WEEK'; weekTempId: string }
  | { type: 'TOGGLE_WEEK_COLLAPSE'; weekTempId: string }
  | { type: 'REORDER_WEEKS'; newOrder: string[] }
  | { type: 'DUPLICATE_WEEK'; weekTempId: string }
  // Session actions
  | { type: 'ADD_SESSION'; weekTempId: string }
  | { type: 'UPDATE_SESSION'; weekTempId: string; sessionTempId: string; payload: Partial<BuilderSession> }
  | { type: 'DELETE_SESSION'; weekTempId: string; sessionTempId: string }
  | { type: 'MOVE_SESSION'; fromWeekTempId: string; toWeekTempId: string; sessionTempId: string }
  | { type: 'DUPLICATE_SESSION'; weekTempId: string; sessionTempId: string }
  // Block actions
  | { type: 'ADD_BLOCK'; weekTempId: string; sessionTempId: string }
  | { type: 'UPDATE_BLOCK'; weekTempId: string; sessionTempId: string; blockTempId: string; payload: Partial<BuilderBlock> }
  | { type: 'DELETE_BLOCK'; weekTempId: string; sessionTempId: string; blockTempId: string }
  | { type: 'REORDER_BLOCKS'; weekTempId: string; sessionTempId: string; newOrder: string[] }
  // Activity actions
  | { type: 'ADD_ACTIVITY_FROM_EXERCISE'; weekTempId: string; sessionTempId: string; blockTempId: string; exercise: Exercise }
  | { type: 'ADD_MANUAL_ACTIVITY'; weekTempId: string; sessionTempId: string; blockTempId: string }
  | { type: 'UPDATE_ACTIVITY'; weekTempId: string; sessionTempId: string; blockTempId: string; activityTempId: string; payload: Partial<BuilderActivity> }
  | { type: 'DELETE_ACTIVITY'; weekTempId: string; sessionTempId: string; blockTempId: string; activityTempId: string }
  | { type: 'REORDER_ACTIVITIES'; weekTempId: string; sessionTempId: string; blockTempId: string; newOrder: string[] }
  | { type: 'DUPLICATE_ACTIVITY'; weekTempId: string; sessionTempId: string; blockTempId: string; activityTempId: string }
  // Prescription actions
  | { type: 'ADD_PRESCRIPTION'; weekTempId: string; sessionTempId: string; blockTempId: string; activityTempId: string }
  | { type: 'UPDATE_PRESCRIPTION'; weekTempId: string; sessionTempId: string; blockTempId: string; activityTempId: string; prescriptionTempId: string; payload: Partial<BuilderPrescription> }
  | { type: 'DELETE_PRESCRIPTION'; weekTempId: string; sessionTempId: string; blockTempId: string; activityTempId: string; prescriptionTempId: string }
  | { type: 'DUPLICATE_PRESCRIPTION'; weekTempId: string; sessionTempId: string; blockTempId: string; activityTempId: string; prescriptionTempId: string };

// Initial state
const initialProgram: BuilderProgram = {
  title: '',
  description: '',
  focus: 'Strength',
  difficulty: 'Beginner',
  is_public: false,
  weeks: [],
};

// Helper functions
function updateInArray<T extends { tempId: string }>(
  array: T[],
  tempId: string,
  updater: (item: T) => T
): T[] {
  return array.map(item => item.tempId === tempId ? updater(item) : item);
}

function removeFromArray<T extends { tempId: string }>(array: T[], tempId: string): T[] {
  return array.filter(item => item.tempId !== tempId);
}

function reorderArray<T extends { tempId: string }>(array: T[], newOrder: string[]): T[] {
  const orderMap = new Map(newOrder.map((id, index) => [id, index]));
  return [...array].sort((a, b) => {
    const aIndex = orderMap.get(a.tempId) ?? Infinity;
    const bIndex = orderMap.get(b.tempId) ?? Infinity;
    return aIndex - bIndex;
  });
}

// Reducer
function programBuilderReducer(state: BuilderProgram, action: ProgramBuilderAction): BuilderProgram {
  switch (action.type) {
    case 'SET_PROGRAM':
      return action.payload;

    case 'RESET_PROGRAM':
      return initialProgram;

    case 'UPDATE_PROGRAM_INFO':
      return { ...state, ...action.payload };

    // Week actions
    case 'ADD_WEEK': {
      const newWeek = createEmptyWeek(state.weeks.length + 1);
      return { ...state, weeks: [...state.weeks, newWeek] };
    }

    case 'UPDATE_WEEK':
      return {
        ...state,
        weeks: updateInArray(state.weeks, action.weekTempId, week => ({
          ...week,
          ...action.payload,
        })),
      };

    case 'DELETE_WEEK': {
      const filteredWeeks = removeFromArray(state.weeks, action.weekTempId);
      // Re-number weeks
      const renumberedWeeks = filteredWeeks.map((week, index) => ({
        ...week,
        week_number: index + 1,
        week_name: week.week_name || `Week ${index + 1}`,
      }));
      return { ...state, weeks: renumberedWeeks };
    }

    case 'TOGGLE_WEEK_COLLAPSE':
      return {
        ...state,
        weeks: updateInArray(state.weeks, action.weekTempId, week => ({
          ...week,
          isCollapsed: !week.isCollapsed,
        })),
      };

    case 'REORDER_WEEKS': {
      const reorderedWeeks = reorderArray(state.weeks, action.newOrder);
      const renumberedWeeks = reorderedWeeks.map((week, index) => ({
        ...week,
        week_number: index + 1,
      }));
      return { ...state, weeks: renumberedWeeks };
    }

    case 'DUPLICATE_WEEK': {
      const weekToDuplicate = state.weeks.find(w => w.tempId === action.weekTempId);
      if (!weekToDuplicate) return state;
      
      const duplicatedWeek: BuilderWeek = {
        ...weekToDuplicate,
        id: undefined,
        tempId: generateTempId(),
        week_number: state.weeks.length + 1,
        week_name: `${weekToDuplicate.week_name} (Copy)`,
        sessions: weekToDuplicate.sessions.map(session => ({
          ...session,
          id: undefined,
          tempId: generateTempId(),
          blocks: session.blocks.map(block => ({
            ...block,
            id: undefined,
            tempId: generateTempId(),
            activities: block.activities.map(activity => ({
              ...activity,
              id: undefined,
              tempId: generateTempId(),
              prescriptions: activity.prescriptions.map(p => ({
                ...p,
                id: undefined,
                tempId: generateTempId(),
              })),
            })),
          })),
        })),
      };
      
      return { ...state, weeks: [...state.weeks, duplicatedWeek] };
    }

    // Session actions
    case 'ADD_SESSION':
      return {
        ...state,
        weeks: updateInArray(state.weeks, action.weekTempId, week => {
          const newSession = createEmptySession(week.sessions.length);
          return { ...week, sessions: [...week.sessions, newSession] };
        }),
      };

    case 'UPDATE_SESSION':
      return {
        ...state,
        weeks: updateInArray(state.weeks, action.weekTempId, week => ({
          ...week,
          sessions: updateInArray(week.sessions, action.sessionTempId, session => ({
            ...session,
            ...action.payload,
          })),
        })),
      };

    case 'DELETE_SESSION':
      return {
        ...state,
        weeks: updateInArray(state.weeks, action.weekTempId, week => ({
          ...week,
          sessions: removeFromArray(week.sessions, action.sessionTempId),
        })),
      };

    case 'MOVE_SESSION': {
      let sessionToMove: BuilderSession | undefined;
      
      // Remove from source week
      const stateAfterRemove = {
        ...state,
        weeks: state.weeks.map(week => {
          if (week.tempId === action.fromWeekTempId) {
            sessionToMove = week.sessions.find(s => s.tempId === action.sessionTempId);
            return {
              ...week,
              sessions: week.sessions.filter(s => s.tempId !== action.sessionTempId),
            };
          }
          return week;
        }),
      };

      if (!sessionToMove) return state;

      // Add to target week
      return {
        ...stateAfterRemove,
        weeks: stateAfterRemove.weeks.map(week => {
          if (week.tempId === action.toWeekTempId) {
            return {
              ...week,
              sessions: [...week.sessions, sessionToMove!],
            };
          }
          return week;
        }),
      };
    }

    case 'DUPLICATE_SESSION':
      return {
        ...state,
        weeks: updateInArray(state.weeks, action.weekTempId, week => {
          const sessionToDuplicate = week.sessions.find(s => s.tempId === action.sessionTempId);
          if (!sessionToDuplicate) return week;
          
          const duplicatedSession: BuilderSession = {
            ...sessionToDuplicate,
            id: undefined,
            tempId: generateTempId(),
            title: `${sessionToDuplicate.title} (Copy)`,
            blocks: sessionToDuplicate.blocks.map(block => ({
              ...block,
              id: undefined,
              tempId: generateTempId(),
              activities: block.activities.map(activity => ({
                ...activity,
                id: undefined,
                tempId: generateTempId(),
                prescriptions: activity.prescriptions.map(p => ({
                  ...p,
                  id: undefined,
                  tempId: generateTempId(),
                })),
              })),
            })),
          };
          
          return { ...week, sessions: [...week.sessions, duplicatedSession] };
        }),
      };

    // Block actions
    case 'ADD_BLOCK':
      return {
        ...state,
        weeks: updateInArray(state.weeks, action.weekTempId, week => ({
          ...week,
          sessions: updateInArray(week.sessions, action.sessionTempId, session => {
            const newBlock = createEmptyBlock(session.blocks.length);
            return { ...session, blocks: [...session.blocks, newBlock] };
          }),
        })),
      };

    case 'UPDATE_BLOCK':
      return {
        ...state,
        weeks: updateInArray(state.weeks, action.weekTempId, week => ({
          ...week,
          sessions: updateInArray(week.sessions, action.sessionTempId, session => ({
            ...session,
            blocks: updateInArray(session.blocks, action.blockTempId, block => ({
              ...block,
              ...action.payload,
            })),
          })),
        })),
      };

    case 'DELETE_BLOCK':
      return {
        ...state,
        weeks: updateInArray(state.weeks, action.weekTempId, week => ({
          ...week,
          sessions: updateInArray(week.sessions, action.sessionTempId, session => ({
            ...session,
            blocks: removeFromArray(session.blocks, action.blockTempId)
              .map((block, index) => ({ ...block, block_order: index })),
          })),
        })),
      };

    case 'REORDER_BLOCKS':
      return {
        ...state,
        weeks: updateInArray(state.weeks, action.weekTempId, week => ({
          ...week,
          sessions: updateInArray(week.sessions, action.sessionTempId, session => ({
            ...session,
            blocks: reorderArray(session.blocks, action.newOrder)
              .map((block, index) => ({ ...block, block_order: index })),
          })),
        })),
      };

    // Activity actions
    case 'ADD_ACTIVITY_FROM_EXERCISE':
      return {
        ...state,
        weeks: updateInArray(state.weeks, action.weekTempId, week => ({
          ...week,
          sessions: updateInArray(week.sessions, action.sessionTempId, session => ({
            ...session,
            blocks: updateInArray(session.blocks, action.blockTempId, block => {
              const newActivity = createActivityFromExercise(action.exercise, block.activities.length);
              return { ...block, activities: [...block.activities, newActivity] };
            }),
          })),
        })),
      };

    case 'ADD_MANUAL_ACTIVITY':
      return {
        ...state,
        weeks: updateInArray(state.weeks, action.weekTempId, week => ({
          ...week,
          sessions: updateInArray(week.sessions, action.sessionTempId, session => ({
            ...session,
            blocks: updateInArray(session.blocks, action.blockTempId, block => {
              const newActivity: BuilderActivity = {
                tempId: generateTempId(),
                order_in_block: block.activities.length,
                exercise: null,
                manual_name: 'Custom Exercise',
                manual_video_url: '',
                manual_image: null,
                notes: '',
                prescriptions: [createEmptyPrescription(1)],
              };
              return { ...block, activities: [...block.activities, newActivity] };
            }),
          })),
        })),
      };

    case 'UPDATE_ACTIVITY':
      return {
        ...state,
        weeks: updateInArray(state.weeks, action.weekTempId, week => ({
          ...week,
          sessions: updateInArray(week.sessions, action.sessionTempId, session => ({
            ...session,
            blocks: updateInArray(session.blocks, action.blockTempId, block => ({
              ...block,
              activities: updateInArray(block.activities, action.activityTempId, activity => ({
                ...activity,
                ...action.payload,
              })),
            })),
          })),
        })),
      };

    case 'DELETE_ACTIVITY':
      return {
        ...state,
        weeks: updateInArray(state.weeks, action.weekTempId, week => ({
          ...week,
          sessions: updateInArray(week.sessions, action.sessionTempId, session => ({
            ...session,
            blocks: updateInArray(session.blocks, action.blockTempId, block => ({
              ...block,
              activities: removeFromArray(block.activities, action.activityTempId)
                .map((activity, index) => ({ ...activity, order_in_block: index })),
            })),
          })),
        })),
      };

    case 'REORDER_ACTIVITIES':
      return {
        ...state,
        weeks: updateInArray(state.weeks, action.weekTempId, week => ({
          ...week,
          sessions: updateInArray(week.sessions, action.sessionTempId, session => ({
            ...session,
            blocks: updateInArray(session.blocks, action.blockTempId, block => ({
              ...block,
              activities: reorderArray(block.activities, action.newOrder)
                .map((activity, index) => ({ ...activity, order_in_block: index })),
            })),
          })),
        })),
      };

    case 'DUPLICATE_ACTIVITY':
      return {
        ...state,
        weeks: updateInArray(state.weeks, action.weekTempId, week => ({
          ...week,
          sessions: updateInArray(week.sessions, action.sessionTempId, session => ({
            ...session,
            blocks: updateInArray(session.blocks, action.blockTempId, block => {
              const activityToDuplicate = block.activities.find(a => a.tempId === action.activityTempId);
              if (!activityToDuplicate) return block;
              
              const duplicatedActivity: BuilderActivity = {
                ...activityToDuplicate,
                id: undefined,
                tempId: generateTempId(),
                order_in_block: block.activities.length,
                prescriptions: activityToDuplicate.prescriptions.map(p => ({
                  ...p,
                  id: undefined,
                  tempId: generateTempId(),
                })),
              };
              
              return { ...block, activities: [...block.activities, duplicatedActivity] };
            }),
          })),
        })),
      };

    // Prescription actions
    case 'ADD_PRESCRIPTION':
      return {
        ...state,
        weeks: updateInArray(state.weeks, action.weekTempId, week => ({
          ...week,
          sessions: updateInArray(week.sessions, action.sessionTempId, session => ({
            ...session,
            blocks: updateInArray(session.blocks, action.blockTempId, block => ({
              ...block,
              activities: updateInArray(block.activities, action.activityTempId, activity => {
                const newPrescription = createEmptyPrescription(activity.prescriptions.length + 1);
                return { ...activity, prescriptions: [...activity.prescriptions, newPrescription] };
              }),
            })),
          })),
        })),
      };

    case 'UPDATE_PRESCRIPTION':
      return {
        ...state,
        weeks: updateInArray(state.weeks, action.weekTempId, week => ({
          ...week,
          sessions: updateInArray(week.sessions, action.sessionTempId, session => ({
            ...session,
            blocks: updateInArray(session.blocks, action.blockTempId, block => ({
              ...block,
              activities: updateInArray(block.activities, action.activityTempId, activity => ({
                ...activity,
                prescriptions: updateInArray(activity.prescriptions, action.prescriptionTempId, prescription => ({
                  ...prescription,
                  ...action.payload,
                })),
              })),
            })),
          })),
        })),
      };

    case 'DELETE_PRESCRIPTION':
      return {
        ...state,
        weeks: updateInArray(state.weeks, action.weekTempId, week => ({
          ...week,
          sessions: updateInArray(week.sessions, action.sessionTempId, session => ({
            ...session,
            blocks: updateInArray(session.blocks, action.blockTempId, block => ({
              ...block,
              activities: updateInArray(block.activities, action.activityTempId, activity => ({
                ...activity,
                prescriptions: removeFromArray(activity.prescriptions, action.prescriptionTempId)
                  .map((p, index) => ({ ...p, set_number: index + 1 })),
              })),
            })),
          })),
        })),
      };

    case 'DUPLICATE_PRESCRIPTION':
      return {
        ...state,
        weeks: updateInArray(state.weeks, action.weekTempId, week => ({
          ...week,
          sessions: updateInArray(week.sessions, action.sessionTempId, session => ({
            ...session,
            blocks: updateInArray(session.blocks, action.blockTempId, block => ({
              ...block,
              activities: updateInArray(block.activities, action.activityTempId, activity => {
                const prescriptionToDuplicate = activity.prescriptions.find(p => p.tempId === action.prescriptionTempId);
                if (!prescriptionToDuplicate) return activity;
                
                const duplicatedPrescription: BuilderPrescription = {
                  ...prescriptionToDuplicate,
                  id: undefined,
                  tempId: generateTempId(),
                  set_number: activity.prescriptions.length + 1,
                };
                
                return { ...activity, prescriptions: [...activity.prescriptions, duplicatedPrescription] };
              }),
            })),
          })),
        })),
      };

    default:
      return state;
  }
}

// Context interface
interface ProgramBuilderContextValue {
  program: BuilderProgram;
  dispatch: React.Dispatch<ProgramBuilderAction>;
  
  // Convenience methods
  setProgram: (program: BuilderProgram) => void;
  resetProgram: () => void;
  updateProgramInfo: (info: Partial<BuilderProgram>) => void;
  
  // Week methods
  addWeek: () => void;
  updateWeek: (weekTempId: string, payload: Partial<BuilderWeek>) => void;
  deleteWeek: (weekTempId: string) => void;
  toggleWeekCollapse: (weekTempId: string) => void;
  duplicateWeek: (weekTempId: string) => void;
  
  // Session methods
  addSession: (weekTempId: string) => void;
  updateSession: (weekTempId: string, sessionTempId: string, payload: Partial<BuilderSession>) => void;
  deleteSession: (weekTempId: string, sessionTempId: string) => void;
  duplicateSession: (weekTempId: string, sessionTempId: string) => void;
  
  // Block methods
  addBlock: (weekTempId: string, sessionTempId: string) => void;
  updateBlock: (weekTempId: string, sessionTempId: string, blockTempId: string, payload: Partial<BuilderBlock>) => void;
  deleteBlock: (weekTempId: string, sessionTempId: string, blockTempId: string) => void;
  
  // Activity methods
  addActivityFromExercise: (weekTempId: string, sessionTempId: string, blockTempId: string, exercise: Exercise) => void;
  addManualActivity: (weekTempId: string, sessionTempId: string, blockTempId: string) => void;
  updateActivity: (weekTempId: string, sessionTempId: string, blockTempId: string, activityTempId: string, payload: Partial<BuilderActivity>) => void;
  deleteActivity: (weekTempId: string, sessionTempId: string, blockTempId: string, activityTempId: string) => void;
  duplicateActivity: (weekTempId: string, sessionTempId: string, blockTempId: string, activityTempId: string) => void;
  
  // Prescription methods
  addPrescription: (weekTempId: string, sessionTempId: string, blockTempId: string, activityTempId: string) => void;
  updatePrescription: (weekTempId: string, sessionTempId: string, blockTempId: string, activityTempId: string, prescriptionTempId: string, payload: Partial<BuilderPrescription>) => void;
  deletePrescription: (weekTempId: string, sessionTempId: string, blockTempId: string, activityTempId: string, prescriptionTempId: string) => void;
  duplicatePrescription: (weekTempId: string, sessionTempId: string, blockTempId: string, activityTempId: string, prescriptionTempId: string) => void;
  
  // Validation
  isValid: boolean;
  validationErrors: string[];
}

const ProgramBuilderContext = createContext<ProgramBuilderContextValue | undefined>(undefined);

export const ProgramBuilderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [program, dispatch] = useReducer(programBuilderReducer, initialProgram);

  // Convenience methods
  const setProgram = useCallback((p: BuilderProgram) => dispatch({ type: 'SET_PROGRAM', payload: p }), []);
  const resetProgram = useCallback(() => dispatch({ type: 'RESET_PROGRAM' }), []);
  const updateProgramInfo = useCallback((info: Partial<BuilderProgram>) => dispatch({ type: 'UPDATE_PROGRAM_INFO', payload: info }), []);

  // Week methods
  const addWeek = useCallback(() => dispatch({ type: 'ADD_WEEK' }), []);
  const updateWeek = useCallback((weekTempId: string, payload: Partial<BuilderWeek>) => dispatch({ type: 'UPDATE_WEEK', weekTempId, payload }), []);
  const deleteWeek = useCallback((weekTempId: string) => dispatch({ type: 'DELETE_WEEK', weekTempId }), []);
  const toggleWeekCollapse = useCallback((weekTempId: string) => dispatch({ type: 'TOGGLE_WEEK_COLLAPSE', weekTempId }), []);
  const duplicateWeek = useCallback((weekTempId: string) => dispatch({ type: 'DUPLICATE_WEEK', weekTempId }), []);

  // Session methods
  const addSession = useCallback((weekTempId: string) => dispatch({ type: 'ADD_SESSION', weekTempId }), []);
  const updateSession = useCallback((weekTempId: string, sessionTempId: string, payload: Partial<BuilderSession>) => dispatch({ type: 'UPDATE_SESSION', weekTempId, sessionTempId, payload }), []);
  const deleteSession = useCallback((weekTempId: string, sessionTempId: string) => dispatch({ type: 'DELETE_SESSION', weekTempId, sessionTempId }), []);
  const duplicateSession = useCallback((weekTempId: string, sessionTempId: string) => dispatch({ type: 'DUPLICATE_SESSION', weekTempId, sessionTempId }), []);

  // Block methods
  const addBlock = useCallback((weekTempId: string, sessionTempId: string) => dispatch({ type: 'ADD_BLOCK', weekTempId, sessionTempId }), []);
  const updateBlock = useCallback((weekTempId: string, sessionTempId: string, blockTempId: string, payload: Partial<BuilderBlock>) => dispatch({ type: 'UPDATE_BLOCK', weekTempId, sessionTempId, blockTempId, payload }), []);
  const deleteBlock = useCallback((weekTempId: string, sessionTempId: string, blockTempId: string) => dispatch({ type: 'DELETE_BLOCK', weekTempId, sessionTempId, blockTempId }), []);

  // Activity methods
  const addActivityFromExercise = useCallback((weekTempId: string, sessionTempId: string, blockTempId: string, exercise: Exercise) => dispatch({ type: 'ADD_ACTIVITY_FROM_EXERCISE', weekTempId, sessionTempId, blockTempId, exercise }), []);
  const addManualActivity = useCallback((weekTempId: string, sessionTempId: string, blockTempId: string) => dispatch({ type: 'ADD_MANUAL_ACTIVITY', weekTempId, sessionTempId, blockTempId }), []);
  const updateActivity = useCallback((weekTempId: string, sessionTempId: string, blockTempId: string, activityTempId: string, payload: Partial<BuilderActivity>) => dispatch({ type: 'UPDATE_ACTIVITY', weekTempId, sessionTempId, blockTempId, activityTempId, payload }), []);
  const deleteActivity = useCallback((weekTempId: string, sessionTempId: string, blockTempId: string, activityTempId: string) => dispatch({ type: 'DELETE_ACTIVITY', weekTempId, sessionTempId, blockTempId, activityTempId }), []);
  const duplicateActivity = useCallback((weekTempId: string, sessionTempId: string, blockTempId: string, activityTempId: string) => dispatch({ type: 'DUPLICATE_ACTIVITY', weekTempId, sessionTempId, blockTempId, activityTempId }), []);

  // Prescription methods
  const addPrescription = useCallback((weekTempId: string, sessionTempId: string, blockTempId: string, activityTempId: string) => dispatch({ type: 'ADD_PRESCRIPTION', weekTempId, sessionTempId, blockTempId, activityTempId }), []);
  const updatePrescription = useCallback((weekTempId: string, sessionTempId: string, blockTempId: string, activityTempId: string, prescriptionTempId: string, payload: Partial<BuilderPrescription>) => dispatch({ type: 'UPDATE_PRESCRIPTION', weekTempId, sessionTempId, blockTempId, activityTempId, prescriptionTempId, payload }), []);
  const deletePrescription = useCallback((weekTempId: string, sessionTempId: string, blockTempId: string, activityTempId: string, prescriptionTempId: string) => dispatch({ type: 'DELETE_PRESCRIPTION', weekTempId, sessionTempId, blockTempId, activityTempId, prescriptionTempId }), []);
  const duplicatePrescription = useCallback((weekTempId: string, sessionTempId: string, blockTempId: string, activityTempId: string, prescriptionTempId: string) => dispatch({ type: 'DUPLICATE_PRESCRIPTION', weekTempId, sessionTempId, blockTempId, activityTempId, prescriptionTempId }), []);

  // Validation
  const { isValid, validationErrors } = useMemo(() => {
    const errors: string[] = [];
    
    if (!program.title.trim()) {
      errors.push('Program title is required');
    }
    
    if (program.weeks.length === 0) {
      errors.push('At least one week is required');
    }
    
    program.weeks.forEach((week, weekIndex) => {
      if (week.sessions.length === 0) {
        errors.push(`Week ${weekIndex + 1} needs at least one session`);
      }
      
      week.sessions.forEach((session, sessionIndex) => {
        if (!session.title.trim()) {
          errors.push(`Session ${sessionIndex + 1} in Week ${weekIndex + 1} needs a title`);
        }
      });
    });
    
    return {
      isValid: errors.length === 0,
      validationErrors: errors,
    };
  }, [program]);

  const value: ProgramBuilderContextValue = {
    program,
    dispatch,
    setProgram,
    resetProgram,
    updateProgramInfo,
    addWeek,
    updateWeek,
    deleteWeek,
    toggleWeekCollapse,
    duplicateWeek,
    addSession,
    updateSession,
    deleteSession,
    duplicateSession,
    addBlock,
    updateBlock,
    deleteBlock,
    addActivityFromExercise,
    addManualActivity,
    updateActivity,
    deleteActivity,
    duplicateActivity,
    addPrescription,
    updatePrescription,
    deletePrescription,
    duplicatePrescription,
    isValid,
    validationErrors,
  };

  return (
    <ProgramBuilderContext.Provider value={value}>
      {children}
    </ProgramBuilderContext.Provider>
  );
};

export const useProgramBuilder = (): ProgramBuilderContextValue => {
  const context = useContext(ProgramBuilderContext);
  if (!context) {
    throw new Error('useProgramBuilder must be used within ProgramBuilderProvider');
  }
  return context;
};
