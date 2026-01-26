import * as XLSX from 'xlsx';
import { Site, Holiday } from '../types';
import { formatDateUK } from './dateUtils';

export const exportToExcel = (sites: Site[], holidays: Holiday[]) => {
  const wb = XLSX.utils.book_new();

  // Project Plan Sheet
  const siteData = sites.flatMap(site => 
    site.steps.map(step => ({
      'Site Name': site.name,
      'Owner': site.owner,
      'Status': site.status,
      'Task Name': step.name,
      'Start Date': formatDateUK(step.startDate),
      'Finish Date': formatDateUK(step.finishDate),
      'Duration (Workdays)': step.durationWorkdays,
      'Confirmed': step.isConfirmed ? 'Yes' : 'No',
      'Done': step.done ? 'Yes' : 'No',
      '_siteId': site.id,
      '_order': site.order
    }))
  );

  const wsSites = XLSX.utils.json_to_sheet(siteData);
  XLSX.utils.book_append_sheet(wb, wsSites, 'Project Plan');

  // Holidays Sheet
  const holidayData = holidays.map(h => ({
    'Date': formatDateUK(h.date),
    'Description': h.description
  }));
  const wsHolidays = XLSX.utils.json_to_sheet(holidayData);
  XLSX.utils.book_append_sheet(wb, wsHolidays, 'Holidays');

  XLSX.writeFile(wb, `SiteWork_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
};