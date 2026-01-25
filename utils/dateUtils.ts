
import { addDays, format, isSaturday, isSunday, parseISO, startOfDay, addMonths, differenceInCalendarDays, isSameDay, parse } from 'date-fns';
import { Holiday } from '../types';

export const isWorkingDay = (date: Date, holidays: Holiday[]): boolean => {
  const day = date.getDay();
  if (day === 0 || day === 6) return false; // Sunday or Saturday
  
  const dateStr = startOfDay(date).toISOString();
  return !holidays.some(h => isSameDay(parseISO(h.date), date));
};

export const getNextWorkingDay = (date: Date, holidays: Holiday[], excludeFridays = false): Date => {
  let current = addDays(date, 1);
  while (!isWorkingDay(current, holidays) || (excludeFridays && current.getDay() === 5)) {
    current = addDays(current, 1);
  }
  return current;
};

export const getWorkingDayOnOrAfter = (date: Date, holidays: Holiday[], excludeFridays = false): Date => {
  let current = date;
  while (!isWorkingDay(current, holidays) || (excludeFridays && current.getDay() === 5)) {
    current = addDays(current, 1);
  }
  return current;
};

export const addWorkdays = (startDate: Date, duration: number, holidays: Holiday[]): Date => {
  if (duration <= 0) return startDate;
  
  let current = startDate;
  let workdaysRemaining = duration - 1; // Count start date as day 1
  
  while (workdaysRemaining > 0) {
    current = addDays(current, 1);
    if (isWorkingDay(current, holidays)) {
      workdaysRemaining--;
    }
  }
  return current;
};

export const formatDateUK = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy');
};

export const parseUKDate = (input: string): Date | null => {
  if (!input) return null;
  const formats = ['dd/MM/yyyy', 'd/M/yyyy', 'dd/MM/yy', 'd/M/yy', 'yyyy-MM-dd'];
  
  for (const f of formats) {
    const parsed = parse(input, f, new Date());
    if (!isNaN(parsed.getTime())) {
      let year = parsed.getFullYear();
      if (year < 100) {
        parsed.setFullYear(2000 + year);
      }
      return parsed;
    }
  }
  
  const isoParsed = parseISO(input);
  return isNaN(isoParsed.getTime()) ? null : isoParsed;
};

export const calculateRevisitDate = (finalFinishDate: string, holidays: Holiday[], offsetMonths: number): Date => {
  const base = addMonths(parseISO(finalFinishDate), offsetMonths);
  return getWorkingDayOnOrAfter(base, holidays);
};
