
import { addDays, format, isSaturday, isSunday, parseISO, startOfDay, addMonths, differenceInCalendarDays, isSameDay, parse, subDays, isValid } from 'date-fns';
import { Holiday } from '../types';

export const isWorkingDay = (date: Date, holidays: Holiday[]): boolean => {
  if (!isValid(date)) return false;
  const day = date.getDay();
  if (day === 0 || day === 6) return false; // Sunday or Saturday
  
  return !holidays.some(h => {
    const hDate = parseISO(h.date);
    return isValid(hDate) && isSameDay(hDate, date);
  });
};

export const getNextWorkingDay = (date: Date, holidays: Holiday[], excludeFridays = false): Date => {
  if (!isValid(date)) return new Date();
  let current = addDays(date, 1);
  while (!isWorkingDay(current, holidays) || (excludeFridays && current.getDay() === 5)) {
    current = addDays(current, 1);
  }
  return current;
};

export const getWorkingDayBefore = (date: Date, holidays: Holiday[]): Date => {
  if (!isValid(date)) return new Date();
  let current = subDays(date, 1);
  while (!isWorkingDay(current, holidays)) {
    current = subDays(current, 1);
  }
  return current;
};

export const getWorkingDayOnOrAfter = (date: Date, holidays: Holiday[], excludeFridays = false): Date => {
  if (!isValid(date)) return new Date();
  let current = date;
  while (!isWorkingDay(current, holidays) || (excludeFridays && current.getDay() === 5)) {
    current = addDays(current, 1);
  }
  return current;
};

export const addWorkdays = (startDate: Date, duration: number, holidays: Holiday[]): Date => {
  if (!isValid(startDate)) return new Date();
  if (duration <= 1) return startDate;
  
  let current = startDate;
  let workdaysRemaining = duration - 1;
  
  while (workdaysRemaining > 0) {
    current = addDays(current, 1);
    if (isWorkingDay(current, holidays)) {
      workdaysRemaining--;
    }
  }
  return current;
};

export const subtractWorkdays = (finishDate: Date, duration: number, holidays: Holiday[]): Date => {
  if (!isValid(finishDate)) return new Date();
  if (duration <= 1) return finishDate;
  
  let current = finishDate;
  let workdaysRemaining = duration - 1;
  
  while (workdaysRemaining > 0) {
    current = subDays(current, 1);
    if (isWorkingDay(current, holidays)) {
      workdaysRemaining--;
    }
  }
  return current;
};

export const formatDateUK = (date: string | Date): string => {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return 'Invalid Date';
  return format(d, 'dd/MM/yyyy');
};

export const parseUKDate = (input: string): Date | null => {
  if (!input) return null;
  const formats = ['dd/MM/yyyy', 'd/M/yyyy', 'dd/MM/yy', 'd/M/yy', 'yyyy-MM-dd'];
  
  for (const f of formats) {
    const parsedDate = parse(input, f, new Date());
    if (isValid(parsedDate)) {
      let year = parsedDate.getFullYear();
      if (year < 100) {
        parsedDate.setFullYear(2000 + year);
      }
      return parsedDate;
    }
  }
  
  const isoParsed = parseISO(input);
  return isValid(isoParsed) ? isoParsed : null;
};

export const calculateRevisitDate = (finalFinishDate: string, holidays: Holiday[], offsetMonths: number): Date => {
  const baseDate = parseISO(finalFinishDate);
  if (!isValid(baseDate)) return new Date();
  const base = addMonths(baseDate, offsetMonths);
  return getWorkingDayOnOrAfter(base, holidays);
};
