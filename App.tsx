
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Site, Holiday, ViewMode, SiteStatus, StepName } from './types';
import SiteTable from './components/SiteTable';
import GanttChart from './components/GanttChart';
import AddSiteForm from './components/AddSiteForm';
import HolidayManager from './components/HolidayManager';
import ReadmeModal from './components/ReadmeModal';
import { SchedulingEngine } from './engine/scheduling';
import { exportToExcel } from './utils/excelExport';
import { LayoutGrid, Calendar, Plus, Download, Moon, Sun, Info, Maximize2, Minimize2, AlertTriangle, X } from 'lucide-react';

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

const SEED_SITES: Site[] = [
  {
    id: 'site-1',
    name: 'Example Site (WTW)',
    owner: 'Alpha Team',
    status: SiteStatus.BOOKED,
    bookedStartDate: '2026-01-05T00:00:00.000Z',
    createdAt: Date.now() - 100000,
    notes: 'Initial example',
    steps: [],
    order: 0
  }
];

const App: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('Day');
  const [showAddSite, setShowAddSite] = useState(false);
  const [showHolidays, setShowHolidays] = useState(false);
  const [showReadme, setShowReadme] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);

  useEffect(() => {
    const savedSites = localStorage.getItem('sitework_sites');
    const savedHolidays = localStorage.getItem('sitework_holidays');
    const savedTheme = localStorage.getItem('sitework_theme');
    
    const initialSites = savedSites ? JSON.parse(savedSites) : SEED_SITES;
    setSites(initialSites);
    setExpandedSites(new Set(initialSites.map((s: Site) => s.id)));
    
    if (savedHolidays) setHolidays(JSON.parse(savedHolidays));
    else setHolidays(SEED_HOLIDAYS);
    
    if (savedTheme === 'light') setIsDarkMode(false);
    else setIsDarkMode(true);
  }, []);

  const scheduledSites = useMemo(() => {
    const engine = new SchedulingEngine(holidays);
    return engine.scheduleAll(sites);
  }, [sites, holidays]);

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

  const handleAddSite = (siteData: Partial<Site>) => {
    const newSite: Site = {
      ...siteData as Site,
      id: Math.random().toString(36).substr(2, 9),
      order: sites.length,
      steps: []
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

  const handleToggleStepDone = (siteId: string, stepName: StepName) => {
    const currentScheduledSite = scheduledSites.find(s => s.id === siteId);
    const currentScheduledStep = currentScheduledSite?.steps.find(st => st.name === stepName);

    const newSites = sites.map(site => {
      if (site.id === siteId) {
        const stepIdx = site.steps.findIndex(s => s.name === stepName);
        let newSteps = [...site.steps];
        
        if (stepIdx > -1) {
          const isMarkingDone = !newSteps[stepIdx].done;
          newSteps[stepIdx] = { 
            ...newSteps[stepIdx], 
            done: isMarkingDone,
            manualStartDate: isMarkingDone ? (currentScheduledStep?.startDate || newSteps[stepIdx].manualStartDate) : newSteps[stepIdx].manualStartDate,
            durationWorkdays: isMarkingDone ? (currentScheduledStep?.durationWorkdays || newSteps[stepIdx].durationWorkdays) : newSteps[stepIdx].durationWorkdays
          };
        } else {
          newSteps.push({ 
            id: `${siteId}-${stepName}`, 
            siteId, 
            name: stepName, 
            done: true, 
            durationWorkdays: currentScheduledStep?.durationWorkdays || 1, 
            startDate: currentScheduledStep?.startDate || new Date().toISOString(), 
            finishDate: currentScheduledStep?.finishDate || new Date().toISOString(),
            manualStartDate: currentScheduledStep?.startDate
          });
        }
        return { ...site, steps: newSteps };
      }
      return site;
    });
    saveSites(newSites);
  };

  const handleConfirmSite = (siteId: string, startDate: string) => {
    const newSites = sites.map(site => {
      if (site.id === siteId) {
        return { ...site, status: SiteStatus.BOOKED, bookedStartDate: startDate };
      }
      return site;
    });
    saveSites(newSites);
  };

  const handleUpdateStepDate = (siteId: string, stepName: StepName, newDate: string) => {
    const newSites = sites.map(site => {
      if (site.id === siteId) {
        const stepIdx = site.steps.findIndex(s => s.name === stepName);
        let newSteps = [...site.steps];
        if (stepIdx > -1) {
          newSteps[stepIdx] = { ...newSteps[stepIdx], manualStartDate: newDate };
        } else {
          newSteps.push({ id: `${siteId}-${stepName}`, siteId, name: stepName, done: false, durationWorkdays: 1, startDate: '', finishDate: '', manualStartDate: newDate });
        }
        return { ...site, steps: newSteps };
      }
      return site;
    });
    saveSites(newSites);
  };

  const handleUpdateStepDuration = (siteId: string, stepName: StepName, duration: number) => {
    const newSites = sites.map(site => {
      if (site.id === siteId) {
        const stepIdx = site.steps.findIndex(s => s.name === stepName);
        let newSteps = [...site.steps];
        if (stepIdx > -1) {
          newSteps[stepIdx] = { ...newSteps[stepIdx], durationWorkdays: duration };
        } else {
          const currentStep = scheduledSites.find(s => s.id === siteId)?.steps.find(st => st.name === stepName);
          newSteps.push({ id: `${siteId}-${stepName}`, siteId, name: stepName, done: false, durationWorkdays: duration, startDate: currentStep?.startDate || '', finishDate: currentStep?.finishDate || '' });
        }
        return { ...site, steps: newSteps };
      }
      return site;
    });
    saveSites(newSites);
  };

  const handleExpandAll = () => {
    if (expandedSites.size === sites.length) {
      setExpandedSites(new Set());
    } else {
      setExpandedSites(new Set(sites.map(s => s.id)));
    }
  };

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem('sitework_theme', next ? 'dark' : 'light');
  };

  return (
    <div className={`flex flex-col h-screen w-full overflow-hidden transition-colors ${isDarkMode ? 'dark bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}`}>
      <header className={`flex-none ${isDarkMode ? 'bg-slate-950 border-b border-slate-800' : 'bg-slate-900'} text-white p-4 flex items-center justify-between shadow-lg z-20`}>
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-lg shadow-inner"><LayoutGrid size={24} /></div>
          <div>
            <h1 className="text-lg font-bold leading-tight">SiteWork Planner</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Project Workflow Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExpandAll} className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-xs font-medium border border-slate-700 mr-2">
            {expandedSites.size === sites.length ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {expandedSites.size === sites.length ? "Collapse All" : "Expand All"}
          </button>
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 mr-2 border border-slate-700">
            {['Day', 'Week', 'Month'].map((m) => (
              <button key={m} onClick={() => setViewMode(m as ViewMode)} className={`px-2 py-1 text-[10px] font-bold rounded ${viewMode === m ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>
                {m.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={() => setShowHolidays(true)} className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-xs font-medium border border-slate-700">
            <Calendar size={14} /> Holidays
          </button>
          <button onClick={() => exportToExcel(scheduledSites, holidays)} className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-xs font-medium border border-slate-700">
            <Download size={14} /> Export
          </button>
          <button onClick={() => setShowReadme(true)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"><Info size={18} /></button>
          <button onClick={toggleDarkMode} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors">{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
          <div className="w-[1px] h-6 bg-slate-700 mx-1" />
          <button onClick={() => setShowAddSite(true)} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all text-xs font-bold shadow-xl shadow-blue-500/20 active:scale-95">
            <Plus size={16} /> Add Site
          </button>
        </div>
      </header>

      <main className="flex-grow flex flex-col overflow-hidden bg-inherit relative">
        <div className="flex-grow overflow-y-auto scrollbar-hide">
          <div className="flex min-h-full">
            <SiteTable 
              rows={flattenedRows}
              onToggleStepDone={handleToggleStepDone}
              onRemoveSite={(id) => {
                const s = sites.find(x => x.id === id);
                if (s) setSiteToDelete(s);
              }}
              onConfirmSite={handleConfirmSite}
              expandedSites={expandedSites}
              setExpandedSites={setExpandedSites}
              hoveredRowIndex={hoveredRowIndex}
              setHoveredRowIndex={setHoveredRowIndex}
              onUpdateStepDate={handleUpdateStepDate}
              onUpdateStepDuration={handleUpdateStepDuration}
              isDarkMode={isDarkMode}
            />
            <GanttChart 
              rows={flattenedRows}
              holidays={holidays}
              hoveredRowIndex={hoveredRowIndex}
              setHoveredRowIndex={setHoveredRowIndex}
              onToggleStepDone={handleToggleStepDone}
              isDarkMode={isDarkMode}
              viewMode={viewMode}
            />
          </div>
        </div>

        {siteToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 transform animate-in zoom-in-95 duration-200">
              <div className="p-6 text-center">
                <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Site?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  Are you sure you want to delete <span className="font-bold text-slate-700 dark:text-slate-200">"{siteToDelete.name}"</span>? 
                  All task progress and schedules for this site will be lost.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setSiteToDelete(null)} className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all">Cancel</button>
                  <button onClick={performDeletion} className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20">Confirm Delete</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className={`flex-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500'} border-t px-4 py-1.5 flex items-center justify-between text-[10px] font-medium`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active Sites: {sites.length}</div>
          <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Holidays: {holidays.length}</div>
        </div>
        <div className="flex items-center gap-3 italic text-slate-400">
          <span>Shift + Scroll for Horizontal Panning • Click Row to Toggle Workflow</span>
        </div>
      </footer>

      {showAddSite && <AddSiteForm onClose={() => setShowAddSite(false)} onSubmit={handleAddSite} />}
      {showHolidays && <HolidayManager holidays={holidays} onAdd={(h) => {
        const nextHolidays = [...holidays, { ...h, id: Math.random().toString(36).substr(2, 9) }];
        setHolidays(nextHolidays);
        localStorage.setItem('sitework_holidays', JSON.stringify(nextHolidays));
      }} onRemove={(id) => {
        const nextHolidays = holidays.filter(h => h.id !== id);
        setHolidays(nextHolidays);
        localStorage.setItem('sitework_holidays', JSON.stringify(nextHolidays));
      }} onClose={() => setShowHolidays(false)} />}
      {showReadme && <ReadmeModal onClose={() => setShowReadme(false)} />}
    </div>
  );
};

export default App;
