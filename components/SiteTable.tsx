
import React from 'react';
import { Site, Step, StepName, SiteStatus } from '../types';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Trash2, Calendar, Hash } from 'lucide-react';
import { parseISO, setYear } from 'date-fns';
import { ROW_HEIGHT } from '../constants';

interface SiteTableProps {
  rows: { site: Site; step?: Step; rowIndex: number }[];
  onToggleStepDone: (siteId: string, stepName: StepName) => void;
  onRemoveSite: (siteId: string) => void;
  onConfirmSite: (siteId: string, startDate: string) => void;
  expandedSites: Set<string>;
  setExpandedSites: React.Dispatch<Set<string>> | ((next: Set<string>) => void);
  hoveredRowIndex: number | null;
  setHoveredRowIndex: (idx: number | null) => void;
  onUpdateStepDate: (siteId: string, stepName: StepName, newDate: string) => void;
  onUpdateStepDuration: (siteId: string, stepName: StepName, duration: number) => void;
  isDarkMode: boolean;
}

const SiteTable: React.FC<SiteTableProps> = ({ 
  rows, 
  onToggleStepDone, 
  onRemoveSite, 
  expandedSites, 
  setExpandedSites,
  hoveredRowIndex,
  setHoveredRowIndex,
  onUpdateStepDate,
  onUpdateStepDuration,
  isDarkMode
}) => {
  const toggleExpand = (id: string, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-action-item]')) {
      return;
    }
    
    const next = new Set(expandedSites);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    
    (setExpandedSites as any)(next);
  };

  const handleDateChange = (siteId: string, stepName: StepName, val: string) => {
    let date = parseISO(val);
    if (date.getFullYear() === 26) date = setYear(date, 2026);
    onUpdateStepDate(siteId, stepName, date.toISOString());
  };

  return (
    <div className={`flex-none w-[380px] border-r select-none transition-colors relative z-10 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      <div className={`sticky top-0 z-30 flex flex-col border-b border-slate-200/10 ${isDarkMode ? 'bg-slate-950 text-slate-500' : 'bg-slate-100 text-slate-500'}`} style={{ height: ROW_HEIGHT * 2 }}>
        <div className="flex-grow flex items-center justify-center text-[10px] font-bold uppercase tracking-widest border-b border-slate-200/5">Project List</div>
        <div className="flex h-1/2">
          <div className="w-10 border-r border-slate-200/5"></div>
          <div className="flex-grow flex items-center px-4 font-bold text-[10px] uppercase border-r border-slate-200/5">Site / Task</div>
          <div className="w-12"></div>
        </div>
      </div>

      <div className="flex flex-col">
        {rows.map((row) => {
          const isSiteRow = !row.step;
          const site = row.site;
          const step = row.step;
          const done = step?.done || false;
          
          return (
            <div 
              key={`${site.id}-${step?.name || 'header'}`}
              onMouseEnter={() => setHoveredRowIndex(row.rowIndex)}
              onMouseLeave={() => setHoveredRowIndex(null)}
              onClick={(e) => isSiteRow && toggleExpand(site.id, e)}
              style={{ height: ROW_HEIGHT }}
              className={`flex border-b border-slate-200/5 transition-colors cursor-pointer items-center group
                ${hoveredRowIndex === row.rowIndex 
                  ? (isDarkMode ? 'bg-slate-800' : 'bg-blue-50') 
                  : (isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50')}
                ${!isSiteRow ? (isDarkMode ? 'bg-slate-900/40' : 'bg-slate-50/50') : ''}
              `} 
            >
              <div className="w-10 flex items-center justify-center flex-none">
                {isSiteRow ? (
                  expandedSites.has(site.id) ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />
                ) : (
                  <div className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-slate-300'}`} />
                )}
              </div>

              <div className="flex-grow px-3 overflow-hidden">
                {isSiteRow ? (
                  <div className="flex flex-col justify-center h-full">
                    <div className={`font-bold truncate text-xs ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{site.name}</div>
                    <div className="text-[9px] text-slate-500 font-normal truncate uppercase tracking-tighter opacity-70">
                      {site.owner} • {site.status}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col justify-center h-full">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold truncate ${done ? 'text-emerald-500 font-bold' : (isDarkMode ? 'text-slate-300' : 'text-slate-700')}`}>
                        {step!.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2" data-action-item="true">
                      <div className="text-[9px] text-slate-500 flex items-center gap-1 border border-transparent hover:border-blue-500/20 rounded transition-all">
                        <Calendar size={10} className="opacity-50" />
                        <input 
                          type="date" 
                          onClick={(e) => e.stopPropagation()}
                          className={`bg-transparent border-none p-0 focus:ring-0 text-[9px] cursor-pointer hover:text-blue-500 transition-colors font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}
                          value={parseISO(step!.startDate).toISOString().split('T')[0]}
                          onChange={(e) => handleDateChange(site.id, step!.name, e.target.value)}
                        />
                      </div>
                      <div className="text-[9px] text-slate-500 flex items-center gap-1 border border-transparent hover:border-blue-500/20 rounded transition-all">
                        <Hash size={10} className="opacity-50" />
                        <input 
                          type="number" 
                          min="1"
                          onClick={(e) => e.stopPropagation()}
                          className={`w-12 bg-white/5 dark:bg-slate-800/50 border border-slate-200/10 rounded px-1 focus:ring-1 focus:ring-blue-500 text-[10px] cursor-pointer hover:text-blue-500 transition-colors font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}
                          value={step!.durationWorkdays}
                          onChange={(e) => onUpdateStepDuration(site.id, step!.name, parseInt(e.target.value) || 1)}
                        />
                        <span className="opacity-40">days</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="w-12 flex items-center justify-center flex-none pr-1 relative z-20" data-action-item="true">
                {isSiteRow ? (
                  <div className="flex items-center gap-1">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSite(site.id);
                      }} 
                      className="text-slate-400 hover:text-red-500 transition-all p-2 rounded-lg hover:bg-red-500/10 active:scale-75"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStepDone(site.id, step!.name);
                    }}
                    className={`p-1.5 rounded-full transition-all flex items-center justify-center shadow-sm
                      ${done 
                        ? 'bg-emerald-500 text-white hover:bg-emerald-400 scale-105 shadow-emerald-500/30' 
                        : (isDarkMode ? 'bg-slate-800 text-slate-500 hover:text-blue-400 border border-slate-700' : 'bg-slate-100 text-slate-400 hover:text-blue-600 border border-slate-200')}`}
                  >
                    {done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SiteTable;
