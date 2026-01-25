
import * as XLSX from 'xlsx';
import { Site, Holiday, Step, SiteStatus, StepName } from '../types';
import { parseUKDate } from './dateUtils';

interface ImportResult {
  sites: Site[];
  holidays: Holiday[];
}

export const importFromExcel = async (file: File): Promise<ImportResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Parse Holidays
        const holidaySheet = workbook.Sheets['Holidays'];
        const holidays: Holiday[] = holidaySheet 
          ? XLSX.utils.sheet_to_json<any>(holidaySheet).map((row, idx) => ({
              id: `h-${idx}-${Date.now()}`,
              date: parseUKDate(row['Date'])?.toISOString() || new Date().toISOString(),
              description: row['Description'] || 'Imported Holiday'
            }))
          : [];

        // Parse Sites
        const siteSheet = workbook.Sheets['Project Plan'];
        if (!siteSheet) throw new Error('Could not find "Project Plan" sheet.');
        
        const siteRows = XLSX.utils.sheet_to_json<any>(siteSheet);
        const sitesMap = new Map<string, Site>();
        
        siteRows.forEach(row => {
          const siteId = row['_siteId'] || row['Site Name'];
          if (!sitesMap.has(siteId)) {
            sitesMap.set(siteId, {
              id: siteId,
              name: row['Site Name'],
              owner: row['Owner'] || 'Unknown',
              status: (row['Status'] as SiteStatus) || SiteStatus.TBC,
              bookedStartDate: parseUKDate(row['Start Date'])?.toISOString(),
              createdAt: Date.now(),
              notes: '',
              steps: [],
              order: row['_order'] || 0
            });
          }
          
          const site = sitesMap.get(siteId)!;
          const step: Step = {
            id: `${siteId}-${row['Task Name']}`,
            siteId: siteId,
            name: row['Task Name'] as StepName,
            durationWorkdays: parseInt(row['Duration (Workdays)']) || 1,
            startDate: parseUKDate(row['Start Date'])?.toISOString() || new Date().toISOString(),
            finishDate: parseUKDate(row['Finish Date'])?.toISOString() || new Date().toISOString(),
            done: row['Done'] === 'Yes',
            manualStartDate: row['Done'] === 'Yes' ? parseUKDate(row['Start Date'])?.toISOString() : undefined
          };
          site.steps.push(step);
        });

        resolve({ sites: Array.from(sitesMap.values()), holidays });
      } catch (err: any) {
        reject(new Error(err.message || 'Failed to parse Excel file.'));
      }
    };
    reader.onerror = () => reject(new Error('File reading failed.'));
    reader.readAsArrayBuffer(file);
  });
};
