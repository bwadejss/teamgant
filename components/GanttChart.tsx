import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Site, Step, Holiday, ViewMode, StepName, UserConfig } from '../types';
import { MAX_CAPACITY } from '../constants';
import { 
  eachDayOfInterval, 
  eachMonthOfInterval, 
  format, 
  differenceInCalendarDays, 
  startOfYear, 
  endOfMonth,
  addMonths,
  parseISO,
  isBefore,
  isAfter,
  startOfDay,
  isWeekend
} from 'date-fns';
import { X, CheckCircle, Clock, MapPin, Check } from 'lucide-react';
import { formatDateUK } from '../utils/dateUtils';

interface GanttChartProps {
  rows: { site: Site; step?: Step; rowIndex: number }[];
  holidays: Holiday[];
  hoveredRowIndex: number | null;
  setHoveredRowIndex: (idx: number | null) => void;
  onToggleStepDone: (siteId: string, stepName: StepName) => void;
  isDarkMode: boolean;
  viewMode: ViewMode;
  userConfig: UserConfig;
  rowHeight: number;
  expandedSites: Set<string>;
}

const GanttChart: React.FC<GanttChartProps> = ({ 
  rows, 
  holidays, 
  hoveredRowIndex, 
  setHoveredRowIndex,
  onToggleStepDone,
  isDarkMode,
  viewMode,
  userConfig,
  rowHeight,
  expandedSites
}) => {
  const horizontalScrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [selectedBar, setSelectedBar] = useState<{site: Site, step: Step} | null>(null);
  
  const DAY_WIDTH = useMemo(() => {
    switch(viewMode) {
      case 'Day': return 40;
      case 'Week': return 15;
      case 'Month': return 6;
      default: return 40;
    }
  }, [viewMode]);

  const startDate = useMemo(() => startOfYear(new Date(2026, 0, 1)), []);
  
  const endDate = useMemo(() => {
    let latestTaskFinish = addMonths(startDate, 11);
    rows.forEach(row => {
      if (row.step) {
        const finish = parseISO(row.step.finishDate);
        if (isAfter(finish, latestTaskFinish)) latestTaskFinish = finish;
      } else if (row.site.steps.length > 0) {
        row.site.steps.forEach(s => {
            const f = parseISO(s.finishDate);
            if (isAfter(f, latestTaskFinish)) latestTaskFinish = f;
        });
      }
    });
    return endOfMonth(addMonths(latestTaskFinish, 12));
  }, [rows, startDate]);

  const days = useMemo(() => eachDayOfInterval({ start: startDate, end: endDate }), [startDate, endDate]);
  const months = useMemo(() => eachMonthOfInterval({ start: startDate, end: endDate }), [startDate, endDate]);

  const holidayMap = useMemo(() => {
    const map = new Set<string>();
    holidays.forEach(h => map.add(startOfDay(parseISO(h.date)).toISOString()));
    return map;
  }, [holidays]);

  const capacityHeatmap = useMemo(() => {
    const usage: Record<string, number> = {};
    const totalMax = Object.values(MAX_CAPACITY).reduce((a, b) => a + b, 0);

    rows.forEach(row => {
      if (row.step) {
        const start = parseISO(row.step.startDate);
        const finish = parseISO(row.step.finishDate);
        eachDayOfInterval({ start, end: finish }).forEach(d => {
          const key = startOfDay(d).toISOString();
          usage[key] = (usage[key] || 0) + 1;
        });
      }
    });

    return Object.entries(usage).reduce((acc, [key, val]) => {
      acc[key] = val / totalMax;
      return acc;
    }, {} as Record<string, number>);
  }, [rows]);

  const getPosition = (dateStr: string) => {
    const diff = differenceInCalendarDays(parseISO(dateStr), startDate);
    return diff * DAY_WIDTH;
  };

  const getWidth = (start: string, finish: string) => {
    const diff = differenceInCalendarDays(parseISO(finish), parseISO(start)) + 1;
    return diff * DAY_WIDTH;
  };

  const handleHorizontalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerRef.current) headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
  };

  useEffect(() => {
    const el = horizontalScrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.shiftKey) { el.scrollLeft += e.deltaY; e.preventDefault(); } 
      else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { el.scrollLeft += e.deltaX; e.preventDefault(); }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div className={`flex-grow flex flex-col transition-all min-w-0 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'} relative`}>
      <div ref={headerRef} className={`sticky top-0 z-40 border-b overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`} style={{ height: rowHeight * 2 }}>
        <div className="flex whitespace-nowrap h-full relative" style={{ width: days.length * DAY_WIDTH }}>
          <div className="absolute top-0 left-0 flex h-1/2 border-b border-slate-200/10">
            {months.map(m => (
              <div 
                key={m.toISOString()} 
                className={`border-r px-3 flex items-center text-[10px] font-bold transition-colors
                  ${isDarkMode ? 'text-slate-400 bg-slate-900 border-slate-800' : 'text-slate-600 bg-slate-50 border-slate-200'}`}
                style={{ width: getWidth(m.toISOString(), endOfMonth(m).toISOString()) }}
              >
                {format(m, 'MMMM yyyy')}
              </div>
            ))}
          </div>
          <div className="absolute bottom-0 left-0 flex h-1/2">
            {days.map(d => {
              const dStr = startOfDay(d).toISOString();
              const util = capacityHeatmap[dStr] || 0;
              const colorClass = util > 0.8 ? 'bg-red-500/30' : util > 0.4 ? 'bg-amber-500/20' : util > 0 ? 'bg-emerald-500/20' : '';
              return (
                <div 
                  key={d.toISOString()} 
                  className={`border-r flex items-center justify-center text-[9px] flex-col leading-tight transition-colors relative
                    ${isDarkMode ? 'border-slate-800/50' : 'border-slate-100'}
                    ${isWeekend(d) ? (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400') : (isDarkMode ? 'text-slate-400' : 'text-slate-500')} 
                    ${holidayMap.has(d.toISOString()) ? 'bg-orange-500/10 text-orange-500 font-bold' : ''}`}
                  style={{ width: DAY_WIDTH }}
                >
                  <div className={`absolute inset-0 opacity-40 pointer-events-none ${colorClass}`} />
                  {viewMode === 'Day' ? (
                    <>
                      <span>{format(d, 'EE').charAt(0)}</span>
                      <span className="font-bold">{format(d, 'd')}</span>
                    </>
                  ) : (
                     d.getDay() === 1 ? <span className="font-bold">{format(d, 'd/M')}</span> : null
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div ref={horizontalScrollRef} onScroll={handleHorizontalScroll} className="flex-grow overflow-x-auto scrollbar-hide">
        <div className="relative bg-inherit" style={{ width: days.length * DAY_WIDTH, height: rows.length * rowHeight }}>
          <div className="absolute inset-0 pointer-events-none flex">
            {days.map(d => (
              <div 
                key={`grid-${d.toISOString()}`}
                style={{ width: DAY_WIDTH }}
                className={`h-full border-r ${isDarkMode ? 'border-slate-800/20' : 'border-slate-200/30'}
                  ${isWeekend(d) ? (isDarkMode ? 'bg-slate-800/10' : 'bg-slate-100/10') : ''}
                  ${holidayMap.has(d.toISOString()) ? 'bg-orange-500/5' : ''}`}
              />
            ))}
          </div>

          {rows.map((row) => {
            const siteFullyComplete = userConfig.colourCompleteSitesGrey && row.site.steps.length === 5 && row.site.steps.every(s => s.done);
            const isSiteHeader = !row.step;
            const isCollapsed = !expandedSites.has(row.site.id);

            // Summary Calculation for Collapsed Sites
            let summaryData = null;
            if (isSiteHeader && isCollapsed && row.site.steps.length > 0) {
                const steps = row.site.steps;
                const mainPhaseSteps = steps.filter(s => s.name !== StepName.REVISIT);
                const revisitStep = steps.find(s => s.name === StepName.REVISIT);

                if (mainPhaseSteps.length > 0) {
                    let minStart = parseISO(mainPhaseSteps[0].startDate);
                    let maxFinish = parseISO(mainPhaseSteps[0].finishDate);

                    mainPhaseSteps.forEach(s => {
                        const start = parseISO(s.startDate);
                        const finish = parseISO(s.finishDate);
                        if (isBefore(start, minStart)) minStart = start;
                        if (isAfter(finish, maxFinish)) maxFinish = finish;
                    });

                    summaryData = {
                        main: { start: minStart.toISOString(), finish: maxFinish.toISOString() },
                        revisit: revisitStep
                    };
                } else {
                    summaryData = { main: null, revisit: revisitStep };
                }
            }
            
            return (
              <div 
                key={`${row.site.id}-${row.step?.name || 'header'}`} 
                onMouseEnter={() => setHoveredRowIndex(row.rowIndex)}
                onMouseLeave={() => setHoveredRowIndex(null)}
                className={`relative transition-all border-b flex items-center
                  ${isDarkMode ? 'border-slate-800/50' : 'border-slate-100'}
                  ${hoveredRowIndex === row.rowIndex ? (isDarkMode ? 'bg-slate-800/40' : 'bg-blue-50/50') : ''}
                  ${row.step?.done ? (isDarkMode ? 'bg-emerald-950/10' : 'bg-emerald-50/30') : ''}`} 
                style={{ height: rowHeight }}
              >
                {/* Summary Bars for Collapsed Sites */}
                {summaryData && (
                    <div className="absolute inset-0 pointer-events-none">
                        {summaryData.main && (
                            <div 
                                className={`absolute h-2.5 top-1/2 -translate-y-1/2 rounded-full opacity-50 shadow-sm
                                    ${siteFullyComplete ? '' : 'bg-slate-400 dark:bg-slate-600'}`}
                                style={{ 
                                    left: getPosition(summaryData.main.start),
                                    width: getWidth(summaryData.main.start, summaryData.main.finish),
                                    backgroundColor: siteFullyComplete ? userConfig.completeSiteColour : undefined
                                }}
                            />
                        )}
                        {summaryData.revisit && (
                            <div 
                                className="absolute h-2.5 top-1/2 -translate-y-1/2 rounded-full shadow-sm"
                                style={{ 
                                    left: getPosition(summaryData.revisit.startDate),
                                    width: getWidth(summaryData.revisit.startDate, summaryData.revisit.finishDate),
                                    backgroundColor: siteFullyComplete ? userConfig.completeSiteColour : userConfig.stepColours[StepName.REVISIT]
                                }}
                            />
                        )}
                    </div>
                )}

                {row.step && (() => {
                  const barWidth = getWidth(row.step.startDate, row.step.finishDate);
                  const showText = barWidth > 60 && rowHeight > 30;
                  
                  return (
                  <div 
                    onClick={() => setSelectedBar({ site: row.site, step: row.step! })}
                    className={`absolute rounded cursor-pointer flex items-center px-1 text-[10px] font-bold text-white shadow-md transition-all hover:brightness-110 active:scale-95 overflow-hidden
                      ${rowHeight < 40 ? 'top-1 bottom-1' : 'top-2 bottom-2'}
                      ${row.step.isTentative ? 'bg-slate-500/80 diagonal-stripe' : ''} 
                      ${row.step.done && !userConfig.keepColourOnDone && !siteFullyComplete ? 'bg-emerald-600 ring-2 ring-emerald-300 ring-offset-2 ring-offset-slate-900 shadow-xl scale-[1.01]' : ''} 
                      ${!row.step.done && isBefore(parseISO(row.step.finishDate), startOfDay(new Date())) ? 'ring-2 ring-red-500 ring-offset-1 ring-offset-slate-900' : ''}
                    `}
                    style={{ 
                      left: getPosition(row.step.startDate), 
                      width: Math.max(32, barWidth),
                      backgroundColor: siteFullyComplete 
                        ? userConfig.completeSiteColour 
                        : ((!row.step.done || userConfig.keepColourOnDone) && !row.step.isTentative ? userConfig.stepColours[row.step.name] : undefined)
                    }}
                  >
                    {showText && <span className="truncate flex-grow pr-0.5">{row.step.name}</span>}
                    {row.step.done && (
                      <div className="flex-none ml-auto">
                        <Check size={rowHeight < 30 ? 10 : 14} strokeWidth={4} className="text-white drop-shadow-sm" />
                      </div>
                    )}
                  </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>

      {selectedBar && (
        <div className={`absolute top-6 right-6 z-50 w-80 rounded-2xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200
          ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
          <div 
            className={`p-4 text-white flex justify-between items-center ${selectedBar.step.done && !userConfig.keepColourOnDone ? 'bg-emerald-600' : ''}`}
            style={{ backgroundColor: (!selectedBar.step.done || userConfig.keepColourOnDone) ? userConfig.stepColours[selectedBar.step.name] : undefined }}
          >
            <h3 className="font-bold text-sm tracking-wide">{selectedBar.step.name}</h3>
            <button onClick={() => setSelectedBar(null)} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X size={18}/></button>
          </div>
          <div className="p-5 space-y-4">
            <div className={`flex items-start gap-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              <MapPin size={16} className="mt-1 flex-none" />
              <div>
                <div className="text-xs font-bold leading-tight">{selectedBar.site.name}</div>
                <div className="text-[10px] opacity-60 uppercase">{selectedBar.site.owner}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 bg-slate-100/50 dark:bg-slate-800/50 p-3 rounded-lg">
              <Clock size={16} />
              <div>
                <span className="font-bold">{formatDateUK(selectedBar.step.startDate)}</span>
                <span className="mx-2">to</span>
                <span className="font-bold">{formatDateUK(selectedBar.step.finishDate)}</span>
              </div>
            </div>
            <button 
              onClick={() => { onToggleStepDone(selectedBar.site.id, selectedBar.step.name); setSelectedBar(null); }}
              className={`w-full mt-2 py-3 rounded-xl text-xs font-bold transition-all shadow-lg
                ${selectedBar.step.done 
                  ? 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300' 
                  : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20'}`}
            >
              {selectedBar.step.done ? 'Reset Task Status' : 'Mark as Complete'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GanttChart;