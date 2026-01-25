export enum SiteStatus {
  BOOKED = 'Booked',
  TBC = 'TBC'
}

export enum StepName {
  PRE_WORK = 'Pre-work',
  SITE_VISIT = 'Site visit',
  REPORT_WRITING = 'Report writing',
  FINAL_PRESENTATION = 'Final presentation',
  REVISIT = 'Revisit'
}

export type ZoomLevel = 'Normal' | 'Compact' | 'Tight';

export interface Step {
  id: string;
  siteId: string;
  name: StepName;
  durationWorkdays: number;
  startDate: string; // ISO String
  finishDate: string; // ISO String
  done: boolean;
  locked?: boolean;
  isTentative?: boolean;
  isConfirmed?: boolean; 
  manualStartDate?: string; // ISO String override
}

export interface Site {
  id: string;
  name: string;
  owner: string;
  status: SiteStatus;
  bookedStartDate?: string; // ISO String
  createdAt: number;
  notes: string;
  steps: Step[];
  order: number;
  customDurations?: Record<string, number>;
}

export interface Holiday {
  id: string;
  date: string; // ISO String
  description: string;
}

export type ViewMode = 'Day' | 'Week' | 'Month';
export type SortMode = 'Creation' | 'Name' | 'Date';

export interface UserConfig {
  stepColors: Record<StepName, string>;
  defaultDurations: Record<StepName, number>;
  keepColorOnDone: boolean;
  revisitOffsetMonths: number;
  sortMode: SortMode;
  autoRegenerateVisit: boolean;
  colorCompleteSitesGrey: boolean;
  completeSiteColor: string;
}

export interface CalendarSlot {
  date: string;
  siteId: string;
  stepId: string;
}