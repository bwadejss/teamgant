import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Site, Holiday, ViewMode, SiteStatus, StepName, UserConfig, Step, ZoomLevel } from './types';
import SiteTable from './components/SiteTable';
import GanttChart from './components/GanttChart';
import AddSiteForm from './components/AddSiteForm';
import HolidayManager from './components/HolidayManager';
import ConfigModal from './components/ConfigModal';
import ReadmeModal from './components/ReadmeModal';
import ConfirmModal from './components/ConfirmModal';
import { SchedulingEngine } from './engine/scheduling';
import { exportToExcel } from './utils/excelExport';
import { importFromExcel } from './utils/excelImport';
import { DEFAULT_DURATIONS, DEFAULT_STEP_COLOURS } from './constants';
import { addMonths, parseISO } from 'date-fns';
import { getWorkingDayBefore, subtractWorkdays } from './utils/dateUtils';
import { LayoutGrid, Calendar, Plus, Download, Upload, Moon, Sun, Info, Maximize2, Minimize2, AlertTriangle, Loader2, X, Trash2, Bug, Settings, CalendarDays } from 'lucide-react';

const APP_VERSION = "v1.8.6";

const SEED_HOLIDAYS: Holiday[] = [
  { id: '1', date: '2026-01-01T00:00:00.000Z', description: "New Year's Day" },
  { id: '2', date: '2026-04-03T00:00:00.000Z', description: 'Good Friday' },
  { id: '3', date: '2026-04-06T00:00:00.000Z', description: 'Easter Monday' },
  { id: '4', date: '2026-05-04T00:00:00.000Z', description: 'Early May Bank Holiday' },
  { id: '5', date: '2026-05-25T00:00:00.000Z', description: 'Spring Bank Holiday' },
  { id: '6', date: '2026-08-31T00:00:00.000Z', description: 'Summer Bank Holiday' },
  { id: '7', date: '2026-12-25T00:00:00.000Z', description: 'Christmas Day' },
  { id: '8', date: '2026-12-28T00:00:00.000Z', description: 'Boxing Day (Substitute Day)' },
];

const INITIAL_CONFIG: UserConfig = {
  stepColours: DEFAULT_STEP_COLOURS,
  defaultDurations: DEFAULT_DURATIONS,
  keepColourOnDone: false,
  revisitOffsetMonths: 3,
  sortMode: 'Creation',
  autoRegenerateVisit: true,
  colourCompleteSitesGrey: true,
  completeSiteColour: '#475569',
  confirmedSummaryColour: '#10b981',
  tbcSummaryColour: '#94a3b8',
  completedSummaryColour: '#000000'
};

const VIEW_MODE_ZOOMS: Record<string, number> = {
  'Day': 40,
  'Week': 12,
  'Month': 3,
  'Year': 0.6
};

const App: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('Day');
  const [config, setConfig] = useState<UserConfig>(INITIAL_CONFIG);
  const [showAddSite, setShowAddSite] = useState(false);
  const [showHolidays, setShowHolidays] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showReadme, setShowReadme] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rowHeight, setRowHeight] = useState(48);
  const [dayWidth, setDayWidth] = useState(40);

  const tableScrollRef = useRef<HTMLDivElement>(null);

  const handleVerticalScrollSync = useCallback((scrollTop: number) => {
    if (tableScrollRef.current) tableScrollRef.current.scrollTop = scrollTop;
  }, []);

  const addLog = useCallback((msg: string) => {
    console.log(`[APP DEBUG] ${msg}`);
    setDebugLog(prev => [msg, ...prev].slice(0, 10));
  }, []);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    const savedSites = localStorage.getItem('sitework_sites');
    const savedHolidays = localStorage.getItem('sitework_holidays');
    const savedTheme = localStorage.getItem('sitework_theme');
    const savedConfig = localStorage.getItem('sitework_config');
    const savedVZoom = localStorage.getItem('sitework_vzoom');
    const savedHZoom = localStorage.getItem('sitework_hzoom');
    
    if (savedSites) {
      try {
        const initialSites = JSON.parse(savedSites);
        setSites(initialSites);
        setExpandedSites(new Set(initialSites.map((s: Site) => s.id)));
      } catch (e) { console.error("Error loading saved sites", e); }
    }
    
    if (savedHolidays) {
      try { setHolidays(JSON.parse(savedHolidays)); } catch (e) { setHolidays(SEED_HOLIDAYS); }
    } else {
      setHolidays(SEED_HOLIDAYS);
    }

    if (savedConfig) {
      try { 
        const parsed = JSON.parse(savedConfig);
        setConfig({ ...INITIAL_CONFIG, ...parsed }); 
      } catch (e) { setConfig(INITIAL_CONFIG); }
    }

    if (savedVZoom) setRowHeight(parseInt(savedVZoom));
    if (savedHZoom) setDayWidth(parseFloat(savedHZoom));
    
    if (savedTheme === 'light') setIsDarkMode(false);
    else setIsDarkMode(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('sitework_vzoom', rowHeight.toString());
    localStorage.setItem('sitework_hzoom', dayWidth.toString());
    
    const foundMode = Object.entries(VIEW_MODE_ZOOMS).find(([_, val]) => Math.abs(val - dayWidth) < (val * 0.1));
    if (foundMode) {
      setViewMode(foundMode[0] as ViewMode);
    } else {
      setViewMode('' as any);
    }
  }, [rowHeight, dayWidth]);

  const scheduledSites = useMemo(() => {
    const engine = new SchedulingEngine(holidays, config);
    return engine.scheduleAll(sites);
  }, [sites, holidays, config]);

  const flattenedRows = useMemo(() => {
    const rows: { site: Site; step?: any; rowIndex: number }[] = [];
    let count = 0;
    scheduledSites.forEach(site => {
      rows.push({ site, rowIndex: count++ });
      if (expandedSites.has(site.id)) {
        site.steps.forEach(step => {
          rows.push({ site, step, rowIndex: count++ });
        });
      }
    });
    return rows;
  }, [scheduledSites, expandedSites]);

  const saveSites = useCallback((newSites: Site[]) => {
    setSites(newSites);
    localStorage.setItem('sitework_sites', JSON.stringify(newSites));
  }, []);

  const handleToggleSiteStatus = (siteId: string) => {
    const scheduled = scheduledSites.find(s => s.id === siteId);
    if (!scheduled) return;

    const newSites = sites.map(site => {
      if (site.id === siteId) {
        const currentlyAllConfirmed = site.steps.length > 0 && site.steps.every(s => !!s.isConfirmed);
        const newSiteStatus = currentlyAllConfirmed ? SiteStatus.TBC : SiteStatus.BOOKED;
        
        const updatedSteps = scheduled.steps.map(s => {
          const originalStep = site.steps.find(os => os.name === s.name);
          return {
            ...(originalStep || s),
            isConfirmed: !currentlyAllConfirmed,
            // Pin the date (manualStartDate) to current scheduled date even when unconfirming
            // so it does not move or change when toggling status.
            manualStartDate: originalStep?.manualStartDate || s.startDate
          };
        });

        return { 
          ...site, 
          status: newSiteStatus, 
          steps: updatedSteps,
          bookedStartDate: site.bookedStartDate || (scheduled.steps[0]?.startDate)
        };
      }
      return site;
    });
    saveSites(newSites);
  };

  const handleToggleStepConfirmation = (siteId: string, stepName: StepName) => {
    const newSites = sites.map(site => {
      if (site.id === siteId) {
        const stepIdx = site.steps.findIndex(s => s.name === stepName);
        let newSteps = [...site.steps];
        const currentScheduled = scheduledSites.find(s => s.id === siteId)?.steps.find(st => st.name === stepName);
        
        if (stepIdx > -1) {
          const step = newSteps[stepIdx];
          const newConfirmedState = !step.isConfirmed;
          newSteps[stepIdx] = { 
            ...step, 
            isConfirmed: newConfirmedState,
            // Keep manualStartDate to preserve the date even if unconfirmed
            manualStartDate: step.manualStartDate || currentScheduled?.startDate
          };
        } else {
          newSteps.push({
            id: `${siteId}-${stepName}`,
            siteId,
            name: stepName,
            done: false,
            isConfirmed: true,
            durationWorkdays: config.defaultDurations[stepName],
            startDate: currentScheduled?.startDate || '',
            finishDate: currentScheduled?.finishDate || '',
            manualStartDate: currentScheduled?.startDate || new Date().toISOString()
          });
        }
        return { ...site, steps: newSteps };
      }
      return site;
    });
    saveSites(newSites);
  };

  const handleToggleStepDone = (siteId: string, stepName: StepName) => {
    const currentScheduledSite = scheduledSites.find(s => s.id === siteId);
    const currentScheduledStep = currentScheduledSite?.steps.find(st => st.name === stepName);
    if (!currentScheduledSite || !currentScheduledStep) return;

    let sitesToSave = sites.map(site => {
      if (site.id === siteId) {
        const stepIdx = site.steps.findIndex(s => s.name === stepName);
        let newSteps = [...site.steps];
        
        if (stepIdx > -1) {
          const isMarkingDone = !newSteps[stepIdx].done;
          newSteps[stepIdx] = { 
            ...newSteps[stepIdx], 
            done: isMarkingDone,
            manualStartDate: isMarkingDone ? (currentScheduledStep.startDate || newSteps[stepIdx].manualStartDate) : newSteps[stepIdx].manualStartDate,
            durationWorkdays: isMarkingDone ? (currentScheduledStep.durationWorkdays || newSteps[stepIdx].durationWorkdays) : newSteps[stepIdx].durationWorkdays
          };
        } else {
          newSteps.push({ 
            id: `${siteId}-${stepName}`, 
            siteId, 
            name: stepName, 
            done: true, 
            isConfirmed: true,
            durationWorkdays: currentScheduledStep.durationWorkdays || 1, 
            startDate: currentScheduledStep.startDate || new Date().toISOString(), 
            finishDate: currentScheduledStep.finishDate || new Date().toISOString(),
            manualStartDate: currentScheduledStep.startDate
          });
        }
        return { ...site, steps: newSteps };
      }
      return site;
    });

    if (stepName === StepName.REVISIT && config.autoRegenerateVisit) {
      const site = sitesToSave.find(s => s.id === siteId);
      const revisitStep = site?.steps.find(st => st.name === StepName.REVISIT);
      
      if (site && revisitStep?.done) {
        addLog(`Final step complete for ${site.name}. Generating next visit...`);
        let baseName = site.name;
        let versionNumber = 2;
        const vMatch = site.name.match(/\s*\(V(\d+)\)$/);
        if (vMatch) {
          versionNumber = parseInt(vMatch[1]) + 1;
          baseName = site.name.replace(/\s*\(V\d+\)$/, "");
        }
        const newSiteName = `${baseName} (V${versionNumber})`;
        const nextVisitStartDate = addMonths(parseISO(revisitStep.finishDate), 12);
        const nextSiteId = Math.random().toString(36).substr(2, 9);
        const newSite: Site = {
          id: nextSiteId,
          name: newSiteName,
          owner: site.owner,
          status: SiteStatus.TBC,
          bookedStartDate: nextVisitStartDate.toISOString(),
          createdAt: Date.now(),
          notes: '',
          steps: [],
          order: sites.length,
          customDurations: site.customDurations
        };
        sitesToSave = [...sitesToSave, newSite];
      }
    }

    saveSites(sitesToSave);
  };

  const handleUpdateStepDate = (siteId: string, stepName: StepName, newDate: string) => {
    const newSites = sites.map(site => {
      if (site.id === siteId) {
        const stepIdx = site.steps.findIndex(s => s.name === stepName);
        let newSteps = [...site.steps];
        if (stepIdx > -1) {
          newSteps[stepIdx] = { ...newSteps[stepIdx], manualStartDate: newDate };
        } else {
          newSteps.push({ 
            id: `${siteId}-${stepName}`, 
            siteId, 
            name: stepName, 
            done: false, 
            isConfirmed: false,
            durationWorkdays: config.defaultDurations[stepName], 
            startDate: '', 
            finishDate: '', 
            manualStartDate: newDate 
          });
        }
        return { ...site, steps: newSteps };
      }
      return site;
    });
    saveSites(newSites);
  };

  const saveConfig = useCallback((newConfig: UserConfig) => {
    setConfig(newConfig);
    localStorage.setItem('sitework_config', JSON.stringify(newConfig));
  }, []);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImportFile(file);
    e.target.value = ''; 
  };

  const processImport = async () => {
    if (!pendingImportFile) return;
    setIsImporting(true);
    setImportStatus(null);
    try {
      const result = await importFromExcel(pendingImportFile);
      setHolidays(result.holidays);
      localStorage.setItem('sitework_holidays', JSON.stringify(result.holidays));
      setSites(result.sites);
      localStorage.setItem('sitework_sites', JSON.stringify(result.sites));
      setExpandedSites(new Set(result.sites.map(s => s.id)));
      setImportStatus({ message: `Successfully imported ${result.sites.length} sites.`, type: 'success' });
    } catch (err: any) {
      setImportStatus({ message: err.message || 'Import failed.', type: 'error' });
    } finally {
      setIsImporting(false);
      setPendingImportFile(null);
    }
  };

  const handleClearAll = () => {
    setSites([]);
    setHolidays(SEED_HOLIDAYS);
    setExpandedSites(new Set());
    localStorage.removeItem('sitework_sites');
    localStorage.setItem('sitework_holidays', JSON.stringify(SEED_HOLIDAYS));
    setShowClearConfirm(false);
  };

  const handleAddSite = (siteData: Partial<Site>) => {
    const newId = Math.random().toString(36).substr(2, 9);
    let initialSteps: Step[] = [];
    
    // The user wants bookedStartDate to be the SITE VISIT date.
    // If BOOKED, we'll manually pin the SITE VISIT to that date.
    // We also need to calculate the PRE_WORK start date backwards so it ends before site visit.
    if (siteData.status === SiteStatus.BOOKED && siteData.bookedStartDate) {
        const visitDate = parseISO(siteData.bookedStartDate);
        const preWorkDuration = siteData.customDurations?.[StepName.PRE_WORK] ?? config.defaultDurations[StepName.PRE_WORK];
        
        // Finish Pre-work the working day before site visit starts
        const preWorkFinish = getWorkingDayBefore(visitDate, holidays);
        const preWorkStart = subtractWorkdays(preWorkFinish, preWorkDuration, holidays);

        initialSteps = [
            {
                id: `${newId}-${StepName.PRE_WORK}`,
                siteId: newId,
                name: StepName.PRE_WORK,
                durationWorkdays: preWorkDuration,
                startDate: preWorkStart.toISOString(),
                finishDate: preWorkFinish.toISOString(),
                done: false,
                isConfirmed: true,
                manualStartDate: preWorkStart.toISOString()
            },
            {
                id: `${newId}-${StepName.SITE_VISIT}`,
                siteId: newId,
                name: StepName.SITE_VISIT,
                durationWorkdays: siteData.customDurations?.[StepName.SITE_VISIT] ?? config.defaultDurations[StepName.SITE_VISIT],
                startDate: visitDate.toISOString(),
                finishDate: visitDate.toISOString(), // Engine will re-calculate finish based on duration
                done: false,
                isConfirmed: true,
                manualStartDate: visitDate.toISOString()
            }
        ];
    }

    const newSite: Site = {
      ...siteData as Site,
      id: newId,
      order: sites.length,
      steps: initialSteps
    };
    saveSites([...sites, newSite]);
    setExpandedSites(prev => new Set([...Array.from(prev), newSite.id]));
    setShowAddSite(false);
  };

  const performDeletion = () => {
    if (!siteToDelete) return;
    const nextSites = sites.filter(s => s.id !== siteToDelete.id);
    saveSites(nextSites);
    setExpandedSites(prev => {
      const next = new Set(prev);
      next.delete(siteToDelete.id);
      return next;
    });
    setSiteToDelete(null);
  };

  const handleUpdateStepDuration = (siteId: string, stepName: StepName, duration: number) => {
    const d = Math.max(1, duration);
    const newSites = sites.map(site => {
      if (site.id === siteId) {
        const stepIdx = site.steps.findIndex(s => s.name === stepName);
        let newSteps = [...site.steps];
        if (stepIdx > -1) {
          newSteps[stepIdx] = { ...newSteps[stepIdx], durationWorkdays: d };
        } else {
          const currentStep = scheduledSites.find(s => s.id === siteId)?.steps.find(st => st.name === stepName);
          newSteps.push({ 
            id: `${siteId}-${stepName}`, 
            siteId, 
            name: stepName, 
            done: false, 
            durationWorkdays: d, 
            startDate: currentStep?.startDate || '', 
            finishDate: currentStep?.finishDate || '' 
          });
        }
        const newCustomDurations = { ...(site.customDurations || {}), [stepName]: d };
        return { ...site, steps: newSteps, customDurations: newCustomDurations };
      }
      return site;
    });
    saveSites(newSites);
  };

  const handleExpandAll = () => {
    if (expandedSites.size === sites.length) setExpandedSites(new Set());
    else setExpandedSites(new Set(sites.map(s => s.id)));
  };

  const snapToViewMode = (mode: string) => {
    if (VIEW_MODE_ZOOMS[mode]) {
        setDayWidth(VIEW_MODE_ZOOMS[mode]);
    }
  };

  return (
    <div className={`flex flex-col h-screen w-full overflow-hidden transition-colors ${isDarkMode ? 'dark bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}`}>
      <header className={`flex-none ${isDarkMode ? 'bg-slate-950 border-b border-slate-800' : 'bg-slate-900'} text-white p-4 flex items-center justify-between shadow-lg z-20`}>
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-lg shadow-inner"><LayoutGrid size={24} /></div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold leading-tight">SiteWork Planner</h1>
              <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-400 font-mono">{APP_VERSION}</span>
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Project Workflow Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showDebug && (
             <div className="fixed top-20 left-1/2 -translate-x-1/2 w-96 bg-black/90 border border-blue-500/50 p-3 rounded-lg z-[500] text-[10px] font-mono text-blue-400 shadow-2xl">
               <div className="flex justify-between mb-2"><span>SYSTEM EVENT LOG</span><button onClick={() => setDebugLog([])}>Clear</button></div>
               {debugLog.map((log, i) => <div key={i} className="truncate border-b border-white/5 py-1">{'>>'} {log}</div>)}
             </div>
          )}
          
          <button onClick={() => setShowDebug(!showDebug)} className={`p-2 rounded-lg transition-colors ${showDebug ? 'bg-blue-600' : 'bg-slate-800'}`} title="Toggle Debug Mode">
            <Bug size={18} />
          </button>

          <button onClick={handleExpandAll} className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-xs font-medium border border-slate-700 mr-2">
            {expandedSites.size === sites.length ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {expandedSites.size === sites.length ? "Collapse All" : "Expand All"}
          </button>
          
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 mr-2 border border-slate-700">
            {['Day', 'Week', 'Month', 'Year'].map((m) => (
              <button key={m} onClick={() => snapToViewMode(m)} className={`px-2 py-1 text-[10px] font-bold rounded ${viewMode === m ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>
                {m.toUpperCase()}
              </button>
            ))}
          </div>

          <button onClick={() => setShowHolidays(true)} className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-xs font-medium border border-slate-700 mr-2">
            <Calendar size={14} /> Holidays
          </button>

          <button onClick={() => setShowConfig(true)} className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-xs font-medium border border-slate-700 mr-2">
            <Settings size={14} /> Config
          </button>
          
          <div className="flex items-center gap-1 mr-2">
            <button disabled={isImporting} onClick={handleImportClick} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-xs font-medium border ${isImporting ? 'bg-slate-900 text-slate-600 border-slate-800' : 'bg-slate-800 hover:bg-slate-700 border-slate-700'}`}>
              {isImporting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} 
              {isImporting ? 'Importing...' : 'Import'}
            </button>
            <button onClick={() => exportToExcel(scheduledSites, holidays)} className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-xs font-medium border border-slate-700">
              <Download size={14} /> Export
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls" className="hidden" />
          </div>

          <button onClick={() => setShowClearConfirm(true)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors mr-1 border border-transparent hover:border-red-500/20" title="Clear All Data">
            <Trash2 size={18} />
          </button>

          <button onClick={() => setShowReadme(true)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors ml-1"><Info size={18} /></button>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors ml-1">{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
          <div className="w-[1px] h-6 bg-slate-700 mx-2" />
          <button onClick={() => setShowAddSite(true)} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all text-xs font-bold shadow-xl shadow-blue-500/20 active:scale-95">
            <Plus size={16} /> Add Site
          </button>
        </div>
      </header>

      <main className="flex-grow flex flex-col overflow-hidden bg-inherit relative">
        {importStatus && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-[400] px-6 py-3 rounded-full shadow-2xl animate-in slide-in-from-top-4 duration-300 flex items-center gap-3 ${
            importStatus.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}>
            <AlertTriangle size={18} />
            <span className="text-sm font-bold">{importStatus.message}</span>
            <button onClick={() => setImportStatus(null)} className="hover:bg-black/10 rounded-full p-1"><X size={16}/></button>
          </div>
        )}

        <div className="flex-grow overflow-hidden flex flex-col">
          <div className="flex-grow flex overflow-hidden">
            <SiteTable 
              scrollRef={tableScrollRef}
              rows={flattenedRows}
              onToggleStepDone={handleToggleStepDone}
              onRemoveSite={(id) => {
                const s = sites.find(x => x.id === id);
                if (s) setSiteToDelete(s);
              }}
              expandedSites={expandedSites}
              setExpandedSites={setExpandedSites}
              hoveredRowIndex={hoveredRowIndex}
              setHoveredRowIndex={setHoveredRowIndex}
              onUpdateStepDate={handleUpdateStepDate}
              onUpdateStepDuration={handleUpdateStepDuration}
              onToggleSiteStatus={handleToggleSiteStatus}
              onToggleStepConfirmation={handleToggleStepConfirmation}
              isDarkMode={isDarkMode}
              rowHeight={rowHeight}
              zoomLevel="Normal"
            />
            <div className="flex-grow overflow-hidden">
              <GanttChart 
                rows={flattenedRows}
                holidays={holidays}
                hoveredRowIndex={hoveredRowIndex}
                setHoveredRowIndex={setHoveredRowIndex}
                onToggleStepDone={handleToggleStepDone}
                isDarkMode={isDarkMode}
                viewMode={viewMode as any}
                userConfig={config}
                rowHeight={rowHeight}
                setRowHeight={setRowHeight}
                dayWidth={dayWidth}
                setDayWidth={setDayWidth}
                expandedSites={expandedSites}
                onVerticalScroll={handleVerticalScrollSync}
              />
            </div>
          </div>
        </div>

        {siteToDelete && (
          <ConfirmModal 
            title="Delete Site?"
            message={`Are you sure you want to delete "${siteToDelete.name}"? This cannot be undone.`}
            confirmText="Delete"
            type="danger"
            onConfirm={performDeletion}
            onCancel={() => setSiteToDelete(null)}
            isDarkMode={isDarkMode}
          />
        )}

        {showClearConfirm && (
          <ConfirmModal 
            title="Clear All Data?"
            message="This will permanently delete all your projects. Make sure you have a backup!"
            confirmText="Clear All"
            type="danger"
            onConfirm={handleClearAll}
            onCancel={() => setShowClearConfirm(false)}
            isDarkMode={isDarkMode}
          />
        )}

        {pendingImportFile && (
          <ConfirmModal 
            title="Import Project Plan?"
            message={`This will overwrite your current schedule with "${pendingImportFile.name}". Continue?`}
            confirmText="Overwrite"
            onConfirm={processImport}
            onCancel={() => setPendingImportFile(null)}
            isDarkMode={isDarkMode}
          />
        )}
      </main>

      <footer className={`flex-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500'} border-t px-4 py-1.5 flex items-center justify-between text-[10px] font-medium`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active Sites: {sites.length}</div>
          <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Holidays: {holidays.length}</div>
          <div className="flex items-center gap-1 text-slate-400">Sort: {config.sortMode}</div>
        </div>
        <div className="flex items-center gap-3 italic text-slate-400">
          <span>Wheel: Pan Horiz • Shift+Wheel: Pan Vert • Ctrl+Wheel: Zoom Vert • Alt+Wheel: Zoom Horiz</span>
        </div>
      </footer>

      {showAddSite && (
        <AddSiteForm onClose={() => setShowAddSite(false)} onSubmit={handleAddSite} existingSiteNames={sites.map(s => s.name)} isDarkMode={isDarkMode} />
      )}
      {showHolidays && <HolidayManager holidays={holidays} onAdd={(h) => {
        const nextHolidays = [...holidays, { ...h, id: Math.random().toString(36).substr(2, 9) }];
        setHolidays(nextHolidays);
        localStorage.setItem('sitework_holidays', JSON.stringify(nextHolidays));
      }} onRemove={(id) => {
        const nextHolidays = holidays.filter(h => h.id !== id);
        setHolidays(nextHolidays);
        localStorage.setItem('sitework_holidays', JSON.stringify(nextHolidays));
      }} onClose={() => setShowHolidays(false)} isDarkMode={isDarkMode} />}
      {showConfig && <ConfigModal config={config} onUpdate={saveConfig} onClose={() => setShowConfig(false)} isDarkMode={isDarkMode} />}
      {showReadme && <ReadmeModal onClose={() => setShowReadme(false)} isDarkMode={isDarkMode} />}
    </div>
  );
};

export default App;
