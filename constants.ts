
import { StepName } from './types';

export const DEFAULT_DURATIONS: Record<StepName, number> = {
  [StepName.PRE_WORK]: 2,
  [StepName.SITE_VISIT]: 2,
  [StepName.REPORT_WRITING]: 4,
  [StepName.FINAL_PRESENTATION]: 1,
  [StepName.REVISIT]: 1,
};

export const STEP_COLORS: Record<StepName, string> = {
  [StepName.PRE_WORK]: 'bg-blue-500',
  [StepName.SITE_VISIT]: 'bg-emerald-500',
  [StepName.REPORT_WRITING]: 'bg-amber-600',
  [StepName.FINAL_PRESENTATION]: 'bg-purple-600',
  [StepName.REVISIT]: 'bg-teal-600',
};

// Maximum concurrent tasks allowed per day of each type
export const MAX_CAPACITY: Record<StepName, number> = {
  [StepName.PRE_WORK]: 3,
  [StepName.SITE_VISIT]: 5, // Multiple visits per day allowed
  [StepName.REPORT_WRITING]: 3,
  [StepName.FINAL_PRESENTATION]: 2,
  [StepName.REVISIT]: 2,
};

export const ROW_HEIGHT = 56; // Fixed height for absolute alignment
