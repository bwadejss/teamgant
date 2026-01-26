import React, { useState, useEffect } from 'react';
import { Site, Step, StepName, SiteStatus, ZoomLevel } from '../types';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Trash2, Calendar, Plus, Minus } from 'lucide-react';
import { parseISO, setYear } from 'date-fns';

interface SiteTableProps {
  rows: { site: Site; step?: Step; rowIndex: number }[];
  onToggleStepDone: (siteId: string, stepName: StepName) => void;
  onRemoveSite: (siteId: string) => void;
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
}

const ConfirmationSwitch: React.FC<{
  isOn: boolean;
  onToggle: (e: React.MouseEvent) => void;
  isDarkMode: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'xs';
}> = ({ isOn, onToggle, isDarkMode, label, size = 'md' }) => {
  const isXs = size === 'xs';
  const isSm = size === 'sm';
  return (
    <div 
      className="flex items-center gap-1.5 cursor-pointer group"
      onClick={onToggle}
    >
      <div className={`relative rounded-full transition-colors flex items-center
        ${isXs ? 'w-5 h-2.5' : isSm ? 'w-7 h-4' : 'w-8 h-4.5'}
        ${isOn ? 'bg-blue-500' : (isDarkMode ? 'bg-slate-700' : 'bg-slate-300')}`}
    >
        <div className={`absolute rounded-full bg-white shadow-sm transition-all transform
          ${isXs ? 'w-2 h-2' : isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'}
          ${isOn ? (isXs ? 'translate-x-2.5' : isSm ? 'translate-x-3.5' : 'translate-x-4') : 'translate-x-0.5'}`} 
        />
      </div>
      {label && !isXs && <span className={`text-[9px] font-bold uppercase tracking-tight ${isOn ? 'text-blue-500' : 'text-slate-500'}`}>{label}</span>}
    </div>
  );
};

const DurationStepper: React.FC<{
  value: number;
  taskName: string;
  onChange: (val: number) => void;
  isDarkMode: boolean;
  compact?: boolean;
}> = ({ value, taskName, onChange, isDarkMode, compact }) => {
  const [localVal, setLocalVal] = useState(String(value));

  useEffect(() => {
    setLocalVal(String(value));
  }, [value]);

  const commitValue = (v: string) => {
    const parsed = parseInt(v);
    if (!isNaN(parsed) && parsed > 0) {
      onChange(parsed);
    } else {
      setLocalVal(String(value));
    }
  };

  const handleBlur = () => commitValue(localVal);

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (value > 1) onChange(value - 1);
  };

  return (
    <div 
      className={`flex items-center rounded-md border shadow-sm transition-colors ${compact ? 'h-5' : 'h-7'} 
        ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-300'}`} 
      onClick={(e) => e.stopPropagation()}
    >
      <button 
        onClick={handleDecrement} 
        className={`${compact ? 'w-5 h-5' : 'w-7 h-7'} flex items-center justify-center border-r transition-colors 
          ${isDarkMode ? 'text-slate-400 border-slate-700 hover:bg-slate-800' : 'text-slate-600 border-slate-300 hover:bg-slate-200'}`}
      >
        <Minus size={compact ? 10 : 14} />
      </button>
      <input 
        type="text" 
        value={localVal} 
        onChange={(e) => setLocalVal(e.target.value)} 
        onBlur={handleBlur} 
        className={`${compact ? 'w-6 text-[9px]' : 'w-10 text-[11px]'} text-center bg-transparent border-none p-0 focus:ring-0 font-bold 
          ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`} 
      />
      <button 
        onClick={handleIncrement} 
        className={`${compact ? 'w-5 h-5' : 'w-7 h-7'} flex items-center justify-center border-l transition-colors 
          ${isDarkMode ? 'text-slate-400 border-slate-700 hover:bg-slate-800' : 'text-slate-600 border-slate-300 hover:bg-slate-200'}`}
      >
        <Plus size={compact ? 10 : 14} />
      </button>
    </div>
  );
};

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
  onToggleSiteStatus,
  onToggleStepConfirmation,
  isDarkMode,
  rowHeight,
  zoomLevel
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
    let date = parseISO(val);
    if (date.getFullYear() === 26) date = setYear(date, 2026);
    onUpdateStepDate(siteId, stepName, date.toISOString());
  };

  const isTight = zoomLevel === 'Tight';
  const isCompact = zoomLevel === 'Compact';

  return (
    <div className={`flex-none w-[410px] border-r transition-all relative z-10 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      <div className={`sticky top-0 z-30 flex flex-col border-b border-slate-200/10 ${isDarkMode ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-500'}`} style={{ height: rowHeight * 2 }}>
        <div className="flex-grow flex items-center justify-center text-[10px] font-bold uppercase tracking-widest border-b border-slate-200/5">Project List</div>
        <div className="flex h-1/2">
          <div className="w-10 border-r border-slate-200/5"></div>
          <div className="flex-grow flex items-center px-4 font-bold text-[10px] uppercase border-r border-slate-200/5">Site / Task</div>
          <div className="w-12"></div>
        </div>
      </div>

      <div className="flex flex-col overflow-x-hidden">
        {rows.map((row) => {
          const isSiteRow = !row.step;
          const site = row.site;
          const step = row.step;
          const done = step?.done || false;

          const isConfirmed = isSiteRow 
            ? (site.steps.length > 0 && site.steps.every(s => !!s.isConfirmed))
            : !!step?.isConfirmed;
          
          return (
            <div 
              key={`${site.id}-${step?.name || 'header'}`}
              onMouseEnter={() => setHoveredRowIndex(row.rowIndex)}
              onMouseLeave={() => setHoveredRowIndex(null)}
              style={{ height: rowHeight }}
              className={`flex border-b border-slate-200/5 transition-all items-center group
                ${hoveredRowIndex === row.rowIndex 
                  ? (isDarkMode ? 'bg-slate-800' : 'bg-blue-50') 
                  : (isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50')}
                ${!isSiteRow ? (isDarkMode ? 'bg-slate-900/40' : 'bg-slate-50/50') : ''}
              `} 
            >
              <div className="flex flex-grow items-center h-full min-w-0">
                <div className="w-10 flex items-center justify-center flex-none h-full cursor-pointer hover:bg-white/5 transition-colors" onClick={() => isSiteRow && toggleExpand(site.id)}>
                  {isSiteRow ? (
                    expandedSites.has(site.id) ? <ChevronDown size={isTight ? 12 : 14} className="text-slate-400" /> : <ChevronRight size={isTight ? 12 : 14} className="text-slate-400" />
                  ) : (
                    <div className={`${isTight ? 'w-0.5 h-0.5' : 'w-1 h-1'} rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-slate-300'}`} />
                  )}
                </div>

                <div className="flex-grow px-3 overflow-hidden flex flex-col justify-center min-w-0">
                  {isSiteRow ? (
                    <div className="flex items-center justify-between gap-2 overflow-hidden">
                      <div className="truncate min-w-0 cursor-pointer flex-grow" onClick={() => toggleExpand(site.id)}>
                        <div className={`font-bold truncate ${isTight ? 'text-[10px]' : 'text-xs'} ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{site.name}</div>
                        {!isTight && (
                          <div className="text-[9px] text-slate-500 font-normal truncate uppercase tracking-tighter opacity-70 leading-none">
                            {site.owner}
                          </div>
                        )}
                      </div>
                      <ConfirmationSwitch 
                        isOn={isConfirmed} 
                        onToggle={(e) => { e.stopPropagation(); onToggleSiteStatus(site.id); }}
                        isDarkMode={isDarkMode}
                        size={isTight ? 'xs' : 'md'}
                        label={isConfirmed ? "Confirmed" : "TBC"}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between min-w-0">
                        <span className={`${isTight ? 'text-[9px]' : 'text-[11px]'} font-semibold truncate ${done ? 'text-emerald-500 font-bold' : (isDarkMode ? 'text-slate-300' : 'text-slate-700')}`}>
                          {step!.name}
                        </span>
                        {!isTight && (
                          <ConfirmationSwitch 
                            isOn={isConfirmed}
                            size="sm"
                            onToggle={(e) => { e.stopPropagation(); onToggleStepConfirmation(site.id, step!.name); }}
                            isDarkMode={isDarkMode}
                            label={isConfirmed ? "Confirmed" : "TBC"}
                          />
                        )}
                      </div>
                      
                      {!isTight && (
                        <div className="flex items-center gap-2 mt-0.5" onClick={(e) => e.stopPropagation()}>
                          <div className={`text-[9px] flex items-center gap-1 border border-transparent rounded transition-all px-1 bg-white/5 ${isConfirmed ? 'border-blue-500/30' : ''}`}>
                            <Calendar size={10} className={isConfirmed ? 'text-blue-500' : 'opacity-50'} />
                            <input 
                              type="date" 
                              className={`bg-transparent border-none p-0 focus:ring-0 text-[9px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} ${isConfirmed ? 'text-blue-500' : ''}`}
                              value={parseISO(step!.startDate).toISOString().split('T')[0]}
                              onChange={(e) => handleDateChange(site.id, step!.name, e.target.value)}
                            />
                          </div>
                          
                          <DurationStepper 
                            value={step!.durationWorkdays} 
                            taskName={step!.name}
                            isDarkMode={isDarkMode}
                            compact={isCompact}
                            onChange={(val) => onUpdateStepDuration(site.id, step!.name, val)}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="w-12 flex items-center justify-center flex-none pr-1">
                {isSiteRow ? (
                  <button onClick={(e) => { e.stopPropagation(); onRemoveSite(site.id); }} className={`text-slate-400 hover:text-red-500 transition-all rounded-lg hover:bg-red-500/10 active:scale-75 ${isTight ? 'p-1' : 'p-2'}`}>
                    <Trash2 size={isTight ? 12 : 16} />
                  </button>
                ) : (
                  <button onClick={(e) => { e.stopPropagation(); onToggleStepDone(site.id, step!.name); }} className={`rounded-full transition-all flex items-center justify-center shadow-sm
                    ${isTight ? 'p-0.5' : 'p-1.5'}
                    ${done 
                      ? 'bg-emerald-500 text-white hover:bg-emerald-400 scale-105 shadow-emerald-500/30' 
                      : (isDarkMode ? 'bg-slate-800 text-slate-500 hover:text-blue-400 border border-slate-700' : 'bg-slate-100 text-slate-400 hover:text-blue-600 border border-slate-200')}`}
                  >
                    {done ? <CheckCircle2 size={isTight ? 12 : 16} /> : <Circle size={isTight ? 12 : 16} />}
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