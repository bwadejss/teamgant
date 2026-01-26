import * as XLSX from 'xlsx';
import { Site, Holiday, Step, SiteStatus, StepName } from '../types';
import { parseUKDate } from './dateUtils';

interface ImportResult {
  sites: Site[];
  holidays: Holiday[];
}

export const importFromExcel = async (file: File): Promise<ImportResult> => {
  console.log('[ExcelImport] Starting file process:', file.name, 'Size:', file.size);
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        console.log('[ExcelImport] FileReader successful. Converting to array...');
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        
        console.log('[ExcelImport] Reading workbook with cellDates: true...');
        const workbook = XLSX.read(data, { 
          type: 'array', 
          cellDates: true,
          dateNF: 'yyyy-mm-dd'
        });
        
        console.log('[ExcelImport] Workbook sheets:', workbook.SheetNames);

        // 1. Parse Holidays
        const holidaySheet = workbook.Sheets['Holidays'];
        const holidays: Holiday[] = [];
        if (holidaySheet) {
          const holidayRows = XLSX.utils.sheet_to_json<any>(holidaySheet);
          console.log(`[ExcelImport] Found ${holidayRows.length} potential holiday rows.`);
          holidayRows.forEach((row, idx) => {
            const rawDate = row['Date'];
            let parsedDate: Date | null = null;
            
            if (rawDate instanceof Date) {
              parsedDate = rawDate;
            } else if (typeof rawDate === 'string') {
              parsedDate = parseUKDate(rawDate);
            }

            if (parsedDate && !isNaN(parsedDate.getTime())) {
              holidays.push({
                id: `h-import-${idx}-${Date.now()}`,
                date: parsedDate.toISOString(),
                description: row['Description'] || 'Imported Holiday'
              });
            }
          });
        }

        // 2. Parse Project Plan
        const siteSheet = workbook.Sheets['Project Plan'];
        if (!siteSheet) {
          throw new Error('Could not find "Project Plan" sheet. Please ensure you are importing a file exported from this app.');
        }
        
        const siteRows = XLSX.utils.sheet_to_json<any>(siteSheet);
        console.log(`[ExcelImport] Found ${siteRows.length} project plan rows.`);
        
        const sitesMap = new Map<string, Site>();
        
        siteRows.forEach((row, idx) => {
          const siteName = row['Site Name'] || 'Unnamed Site';
          const siteId = String(row['_siteId'] || siteName);
          
          if (!sitesMap.has(siteId)) {
            sitesMap.set(siteId, {
              id: siteId,
              name: String(siteName),
              owner: String(row['Owner'] || 'TBC'),
              status: (row['Status'] as SiteStatus) || SiteStatus.TBC,
              bookedStartDate: undefined,
              createdAt: Date.now(),
              notes: '',
              steps: [],
              order: Number(row['_order']) || idx
            });
          }
          
          const site = sitesMap.get(siteId)!;
          const stepName = row['Task Name'] as StepName;
          
          if (stepName) {
            const rawStart = row['Start Date'];
            let stepStart: Date | null = null;
            if (rawStart instanceof Date) stepStart = rawStart;
            else if (typeof rawStart === 'string') stepStart = parseUKDate(rawStart);

            const rawFinish = row['Finish Date'];
            let stepFinish: Date | null = null;
            if (rawFinish instanceof Date) stepFinish = rawFinish;
            else if (typeof rawFinish === 'string') stepFinish = parseUKDate(rawFinish);

            const isDone = String(row['Done'] || '').toLowerCase() === 'yes' || row['Done'] === true;
            const isConfirmed = String(row['Confirmed'] || '').toLowerCase() === 'yes';

            const step: Step = {
              id: `${siteId}-${stepName}`,
              siteId: siteId,
              name: stepName,
              durationWorkdays: parseInt(row['Duration (Workdays)']) || 1,
              startDate: stepStart?.toISOString() || new Date().toISOString(),
              finishDate: stepFinish?.toISOString() || new Date().toISOString(),
              done: isDone,
              isConfirmed: isConfirmed,
              // Crucial: Restore manualStartDate for pinned tasks so the SchedulingEngine locks them
              manualStartDate: (isDone || isConfirmed) ? (stepStart?.toISOString()) : undefined
            };
            site.steps.push(step);
            
            // Set initial booked start date if this is the first step and site is BOOKED
            if (site.status === SiteStatus.BOOKED && !site.bookedStartDate) {
              site.bookedStartDate = step.startDate;
            }
          }
        });

        const finalSites = Array.from(sitesMap.values()).sort((a, b) => a.order - b.order);
        console.log('[ExcelImport] Final reconstructed sites count:', finalSites.length);
        
        resolve({ sites: finalSites, holidays });
      } catch (err: any) {
        console.error('[ExcelImport] Critical error during parsing:', err);
        reject(new Error(err.message || 'Excel parsing failed. Is this a valid SiteWork file?'));
      }
    };

    reader.onerror = (err) => {
      console.error('[ExcelImport] FileReader error:', err);
      reject(new Error('File could not be read. Please try again.'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};