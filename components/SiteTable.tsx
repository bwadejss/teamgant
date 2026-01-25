import React, { useState, useEffect } from 'react';
import { Site, Step, StepName, SiteStatus } from '../types';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Trash2, Calendar, Plus, Minus } from 'lucide-react';
import { parseISO, setYear } from 'date-fns';
import { ROW_HEIGHT } from '../constants';

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
  isDarkMode: boolean;
}

/**
 * Custom Duration Stepper to fix native input hit-box issues in preview mode.
 */
const DurationStepper: React.FC<{
  value: number;
  taskName: string;
  onChange: (val: number) => void;
  isDarkMode: boolean;
}> = ({ value, taskName, onChange, isDarkMode }) => {
  const [localVal, setLocalVal] = useState(String(value));

  // Sync with prop updates
  useEffect(() => {
    setLocalVal(String(value));
  }, [value]);

  const commitValue = (v: string) => {
    const parsed = parseInt(v);
    if (!isNaN(parsed) && parsed > 0) {
      console.log(`[UI DEBUG] Committing duration ${parsed} for ${taskName}`);
      onChange(parsed);
    } else {
      setLocalVal(String(value));
    }
  };

  const handleBlur = () => {
    commitValue(localVal);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log(`[UI DEBUG] Plus clicked for ${taskName}, current val: ${value}`);
    onChange(value + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log(`[UI DEBUG] Minus clicked for ${taskName}, current val: ${value}`);
    if (value > 1) {
      onChange(value - 1);
    }
  };

  return (
    <div 
      className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-700 overflow-hidden shadow-sm"
      onClick={(e) => e.stopPropagation()} // Stop row expansion
    >
      <button 
        type="button" 
        onMouseDown={(e) => e.stopPropagation()} // Stop browser from focusing elsewhere
        onClick={handleDecrement}
        className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 border-r border-slate-300 dark:border-slate-700 transition-colors active:bg-slate-300 dark:active:bg-slate-600"
      >
        <Minus size={14} />
      </button>
      <input 
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={localVal}
        onChange={(e) => {
          e.stopPropagation();
          setLocalVal(e.target.value);
        }}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitValue(localVal);
        }}
        className={`w-10 text-center bg-transparent border-none p-0 focus:ring-0 text-[11px] font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}
      />
      <button 
        type="button" 
        onMouseDown={(e) => e.stopPropagation()}
        onClick={handleIncrement}
        className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 border-l border-slate-300 dark:border-slate-700 transition-colors active:bg-slate-300 dark:active:bg-slate-600"
      >
        <Plus size={14} />
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
  isDarkMode
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

  return (
    <div className={`flex-none w-[380px] border-r transition-colors relative z-10 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      <div className={`sticky top-0 z-30 flex flex-col border-b border-slate-200/10 ${isDarkMode ? 'bg-slate-950 text-slate-500' : 'bg-slate-100 text-slate-500'}`} style={{ height: ROW_HEIGHT * 2 }}>
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
          
          return (
            <div 
              key={`${site.id}-${step?.name || 'header'}`}
              onMouseEnter={() => setHoveredRowIndex(row.rowIndex)}
              onMouseLeave={() => setHoveredRowIndex(null)}
              style={{ height: ROW_HEIGHT }}
              className={`flex border-b border-slate-200/5 transition-colors items-center group
                ${hoveredRowIndex === row.rowIndex 
                  ? (isDarkMode ? 'bg-slate-800' : 'bg-blue-50') 
                  : (isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50')}
                ${!isSiteRow ? (isDarkMode ? 'bg-slate-900/40' : 'bg-slate-50/50') : ''}
              `} 
            >
              {/* Row Label (Handle expand/collapse) */}
              <div 
                className="flex flex-grow items-center h-full min-w-0"
                onClick={() => isSiteRow && toggleExpand(site.id)}
              >
                {/* Left Column Icon */}
                <div className="w-10 flex items-center justify-center flex-none h-full cursor-pointer hover:bg-white/5 transition-colors">
                  {isSiteRow ? (
                    expandedSites.has(site.id) ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />
                  ) : (
                    <div className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-slate-300'}`} />
                  )}
                </div>

                {/* Main Text Area */}
                <div className="flex-grow px-3 overflow-hidden flex flex-col justify-center cursor-pointer">
                  {isSiteRow ? (
                    <>
                      <div className={`font-bold truncate text-xs ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{site.name}</div>
                      <div className="text-[9px] text-slate-500 font-normal truncate uppercase tracking-tighter opacity-70">
                        {site.owner} • {site.status}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[11px] font-semibold truncate ${done ? 'text-emerald-500 font-bold' : (isDarkMode ? 'text-slate-300' : 'text-slate-700')}`}>
                          {step!.name}
                        </span>
                      </div>
                      
                      {/* Controls Row (Separate from text click) */}
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {/* Date Picker */}
                        <div className="text-[9px] text-slate-500 flex items-center gap-1 border border-transparent hover:border-blue-500/20 rounded transition-all px-1 bg-white/5">
                          <Calendar size={10} className="opacity-50" />
                          <input 
                            type="date" 
                            onFocus={(e) => e.target.select()}
                            className={`bg-transparent border-none p-0 focus:ring-0 text-[9px] cursor-text hover:text-blue-500 transition-colors font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}
                            value={parseISO(step!.startDate).toISOString().split('T')[0]}
                            onChange={(e) => handleDateChange(site.id, step!.name, e.target.value)}
                          />
                        </div>
                        
                        {/* Duration Custom Stepper */}
                        <DurationStepper 
                          value={step!.durationWorkdays} 
                          taskName={step!.name}
                          isDarkMode={isDarkMode}
                          onChange={(val) => onUpdateStepDuration(site.id, step!.name, val)}
                        />
                        
                        <span className="text-[9px] text-slate-500 opacity-40 uppercase font-bold tracking-tighter">days</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="w-12 flex items-center justify-center flex-none pr-1">
                {isSiteRow ? (
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRemoveSite(site.id); }} 
                    className="text-slate-400 hover:text-red-500 transition-all p-2 rounded-lg hover:bg-red-500/10 active:scale-75"
                  >
                    <Trash2 size={16} />
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggleStepDone(site.id, step!.name); }}
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