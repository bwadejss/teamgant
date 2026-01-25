import { StepName, ZoomLevel } from './types';

export const DEFAULT_DURATIONS: Record<StepName, number> = {
  [StepName.PRE_WORK]: 2,
  [StepName.SITE_VISIT]: 2,
  [StepName.REPORT_WRITING]: 4,
  [StepName.FINAL_PRESENTATION]: 1,
  [StepName.REVISIT]: 1,
};

export const DEFAULT_STEP_COLORS: Record<StepName, string> = {
  [StepName.PRE_WORK]: '#3b82f6', // blue-500
  [StepName.SITE_VISIT]: '#10b981', // emerald-500
  [StepName.REPORT_WRITING]: '#d97706', // amber-600
  [StepName.FINAL_PRESENTATION]: '#9333ea', // purple-600
  [StepName.REVISIT]: '#ef4444', // red-500
};

export const MAX_CAPACITY: Record<StepName, number> = {
  [StepName.PRE_WORK]: 3,
  [StepName.SITE_VISIT]: 5, 
  [StepName.REPORT_WRITING]: 3,
  [StepName.FINAL_PRESENTATION]: 2,
  [StepName.REVISIT]: 2,
};

export const ROW_HEIGHTS: Record<ZoomLevel, number> = {
  Normal: 56,
  Compact: 40,
  Tight: 28
};