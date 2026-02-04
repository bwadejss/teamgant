import React, { useState, useEffect } from 'react';
import { Site, Step, StepName, SiteStatus, ZoomLevel, UserConfig } from '../types';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Trash2, Calendar, Plus, Minus, Search, X } from 'lucide-react';
import { parseISO, setYear, isValid } from 'date-fns';

interface SiteTableProps {
  rows: { site: Site; step?: Step; rowIndex: number }[];
  onToggleStepDone: (siteId: string, stepName: StepName) => void;
  onRemoveSite: (siteId: string) => void;
  onRemoveStep: (siteId: string, stepName: StepName) => void;
  expandedSites: Set<string>;
  setExpandedSites: React.Dispatch<React.SetStateAction<Set<string>>>;
  hoveredRowIndex: number | null;
  setHoveredRowIndex: (idx: number | null) => void;
  onUpdateStepDate: (siteId: string, stepName: StepName, newDate: string) => void;
  onUpdateStepDuration: (siteId: string, stepName: StepName, duration: number) => void;
  onToggleSiteStatus: (siteId: string) => void;
  onToggleStepConfirmation: (siteId: string, stepName: StepName) => void;
  isDarkMode: boolean;
  rowHeight: number;
  zoomLevel: ZoomLevel;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  userConfig: UserConfig;
}

const ConfirmationSwitch: React.FC<{
  isOn: boolean;
  onToggle: (e: React.MouseEvent) => void;
  isDarkMode: boolean;
  label?: string;
  compact?: boolean;
}> = ({ isOn, onToggle, isDarkMode, label, compact }) => {
  return (
    <div className="flex items-center gap-1.5 cursor-pointer group" onClick={onToggle}>
      <div className={`relative rounded-full transition-colors flex items-center ${compact ? 'w-5 h-2.5' : 'w-7 h-4'} ${isOn ? 'bg-blue-500' : (isDarkMode ? 'bg-slate-700' : 'bg-slate-300')}`}>
        <div className={`absolute rounded-full bg-white shadow-sm transition-all transform ${compact ? 'w-1.5 h-1.5' : 'w-3 h-3'} ${isOn ? (compact ? 'translate-x-3' : 'translate-x-3.5') : 'translate-x-0.5'}`} />
      </div>
      {!compact && label && <span className={`text-[9px] font-bold uppercase tracking-tight ${isOn ? 'text-blue-500' : 'text-slate-500'}`}>{label}</span>}
    </div>
  );
};

const DurationStepper: React.FC<{
  value: number;
  onChange: (val: number) => void;
  isDarkMode: boolean;
  compact?: boolean;
}> = ({ value, onChange, isDarkMode, compact }) => {
  const [localVal, setLocalVal] = useState(String(value));

  useEffect(() => {
    setLocalVal(String(value));
  }, [value]);

  const commitValue = (v: string) => {
    const parsed = parseInt(v);
    if (!isNaN(parsed) && parsed > 0) onChange(parsed);
    else setLocalVal(String(value));
  };

  return (
    <div className={`flex items-center rounded-md border shadow-sm transition-colors ${compact ? 'h-5' : 'h-6'} ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-300'}`} onClick={(e) => e.stopPropagation()}>
      <button onClick={(e) => { e.stopPropagation(); if (value > 1) onChange(value - 1); }} className={`${compact ? 'w-4' : 'w-5'} flex items-center justify-center border-r ${isDarkMode ? 'text-slate-400 border-slate-700 hover:bg-slate-800' : 'text-slate-600 border-slate-300 hover:bg-slate-200'}`}>
        <Minus size={compact ? 8 : 10} />
      </button>
      <input type="text" value={localVal} onChange={(e) => setLocalVal(e.target.value)} onBlur={() => commitValue(localVal)} className={`${compact ? 'w-4 text-[8px]' : 'w-6 text-[10px]'} text-center bg-transparent border-none p-0 focus:ring-0 font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`} />
      <button onClick={(e) => { e.stopPropagation(); onChange(value + 1); }} className={`${compact ? 'w-4' : 'w-5'} flex items-center justify-center border-l ${isDarkMode ? 'text-slate-400 border-slate-700 hover:bg-slate-800' : 'text-slate-600 border-slate-300 hover:bg-slate-200'}`}>
        <Plus size={compact ? 8 : 10} />
      </button>
    </div>
  );
};

const SiteTable: React.FC<SiteTableProps> = ({ 
  rows, 
  onToggleStepDone, 
  onRemoveSite, 
  onRemoveStep,
  expandedSites, 
  setExpandedSites,
  hoveredRowIndex,
  setHoveredRowIndex,
  onUpdateStepDate,
  onUpdateStepDuration,
  onToggleSiteStatus,
  onToggleStepConfirmation,
  isDarkMode,
  rowHeight,
  scrollRef,
  searchTerm,
  setSearchTerm,
  userConfig
}) => {
  const toggleExpand = (id: string) => {
    setExpandedSites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDateChange = (siteId: string, stepName: StepName, val: string) => {
    if (!val) return;
    const date = parseISO(val);
    if (!isValid(date)) return;
    
    let finalDate = date;
    if (date.getFullYear() === 26) finalDate = setYear(date, 2026);
    onUpdateStepDate(siteId, stepName, finalDate.toISOString());
  };

  const isCompact = rowHeight < 40;
  const isMinimal = rowHeight < 30;

  return (
    <div className={`flex-none w-[380px] border-r transition-all relative z-10 h-full flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      <div className={`sticky top-0 z-30 flex flex-col border-b border-slate-200/10 ${isDarkMode ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-500'}`} style={{ height: rowHeight * 2 }}>
        <div className="flex-grow flex items-center justify-center text-[10px] font-bold uppercase tracking-widest border-b border-slate-200/5">Project List</div>
        <div className="flex h-1/2">
          <div className="w-8 border-r border-slate-200/5"></div>
          <div className="flex-grow flex items-center px-2 font-bold text-[10px] uppercase border-r border-slate-200/5 relative group">
            <Search size={10} className={`absolute left-2 transition-opacity ${searchTerm ? 'opacity-100' : 'opacity-40'}`} />
            <input 
                type="text" 
                placeholder="Search sites..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-6 pr-6 bg-transparent border-none text-[10px] font-bold outline-none placeholder:text-slate-400 transition-colors ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
            />
            {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2 p-1 hover:bg-black/10 rounded-full">
                    <X size={10} />
                </button>
            )}
          </div>
          <div className="w-10"></div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-grow overflow-auto scrollbar-hide">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 opacity-40 text-center">
            <Search size={24} className="mb-2" />
            <p className="text-xs font-bold uppercase tracking-widest">No matching sites</p>
          </div>
        ) : rows.map((row) => {
          const isSiteRow = !row.step;
          const site = row.site;
          const step = row.step;
          const done = step?.done || false;
          const isConfirmed = isSiteRow ? (site.steps.length > 0 && site.steps.every(s => !!s.isConfirmed)) : !!step?.isConfirmed;
          
          return (
            <div 
              key={`${site.id}-${step?.name || 'header'}`}
              onMouseEnter={() => setHoveredRowIndex(row.rowIndex)}
              onMouseLeave={() => setHoveredRowIndex(null)}
              style={{ height: rowHeight }}
              className={`flex border-b border-slate-200/5 items-center group transition-colors overflow-hidden
                ${hoveredRowIndex === row.rowIndex ? (isDarkMode ? 'bg-slate-800' : 'bg-blue-50') : (isDarkMode ? 'bg-slate-900' : 'bg-white')}
                ${!isSiteRow ? (isDarkMode ? 'bg-slate-900/40' : 'bg-slate-50/50') : ''}`}
            >
              <div className="w-8 flex items-center justify-center flex-none h-full cursor-pointer hover:bg-white/5" onClick={() => isSiteRow && toggleExpand(site.id)}>
                {isSiteRow ? (
                  expandedSites.has(site.id) ? <ChevronDown size={isMinimal ? 10 : 12} className="text-slate-400" /> : <ChevronRight size={isMinimal ? 10 : 12} className="text-slate-400" />
                ) : <div className={`w-0.5 h-0.5 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-slate-300'}`} />}
              </div>

              <div className="flex-grow px-2 overflow-hidden flex flex-col justify-center min-w-0">
                {isSiteRow ? (
                  <div className="flex items-center justify-between gap-1 overflow-hidden">
                    <div className="truncate min-w-0 cursor-pointer flex-grow" onClick={() => toggleExpand(site.id)}>
                      <div className={`font-bold truncate ${isMinimal ? 'text-[9px]' : 'text-xs'} ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{site.name}</div>
                      {!isMinimal && <div className="text-[8px] text-slate-500 font-normal truncate uppercase tracking-tighter opacity-70 leading-none">{site.owner}</div>}
                    </div>
                    {!isMinimal && <ConfirmationSwitch isOn={isConfirmed} onToggle={(e) => { e.stopPropagation(); onToggleSiteStatus(site.id); }} isDarkMode={isDarkMode} compact={isCompact} label={isConfirmed ? "Confirmed" : "TBC"} />}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between min-w-0">
                      <span className={`${isMinimal ? 'text-[8px]' : 'text-[10px]'} font-semibold truncate ${done ? 'text-emerald-500' : (isDarkMode ? 'text-slate-300' : 'text-slate-700')}`}>{step!.name}</span>
                      {!isMinimal && <ConfirmationSwitch isOn={isConfirmed} compact={true} onToggle={(e) => { e.stopPropagation(); onToggleStepConfirmation(site.id, step!.name); }} isDarkMode={isDarkMode} />}
                    </div>
                    {!isMinimal && (
                      <div className="flex items-center gap-2 mt-0.5" onClick={(e) => e.stopPropagation()}>
                        <div className={`text-[8px] flex items-center gap-1 border border-transparent rounded transition-all px-1 bg-white/5 ${isConfirmed ? 'border-blue-500/30' : ''}`}>
                          <Calendar size={8} className={isConfirmed ? 'text-blue-500' : 'opacity-50'} />
                          <input type="date" className={`bg-transparent border-none p-0 focus:ring-0 text-[8px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} ${isConfirmed ? 'text-blue-500' : ''}`} value={parseISO(step!.startDate).toISOString().split('T')[0]} onChange={(e) => handleDateChange(site.id, step!.name, e.target.value)} />
                        </div>
                        <div className="flex items-center gap-1">
                          <DurationStepper value={step!.durationWorkdays} isDarkMode={isDarkMode} compact={isCompact} onChange={(val) => onUpdateStepDuration(site.id, step!.name, val)} />
                          {step!.name === StepName.REVISIT && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); onRemoveStep(site.id, step!.name); }}
                                title="Remove Revisit for this site"
                                className="p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              >
                                <Trash2 size={10} />
                              </button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="w-10 flex items-center justify-center flex-none pr-1">
                {isSiteRow ? (
                  <button onClick={(e) => { e.stopPropagation(); onRemoveSite(site.id); }} className="text-slate-400 hover:text-red-500 p-1 rounded-lg">
                    <Trash2 size={isMinimal ? 10 : 14} />
                  </button>
                ) : (
                  <button onClick={(e) => { e.stopPropagation(); onToggleStepDone(site.id, step!.name); }} className={`rounded-full flex items-center justify-center ${isMinimal ? 'p-0.5' : 'p-1'} ${done ? 'bg-emerald-500 text-white shadow-emerald-500/30' : (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400')}`}>
                    {done ? <CheckCircle2 size={isMinimal ? 10 : 12} /> : <Circle size={isMinimal ? 10 : 12} />}
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
