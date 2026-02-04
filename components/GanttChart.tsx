import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Site, Step, Holiday, ViewMode, StepName, UserConfig } from '../types';
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
import { X, Clock, MapPin, Check, Search, GripVertical, GripHorizontal, RotateCcw } from 'lucide-react';
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
  setRowHeight: (h: number) => void;
  dayWidth: number;
  setDayWidth: (w: number) => void;
  expandedSites: Set<string>;
  onVerticalScroll?: (scrollTop: number) => void;
  tableSyncRef?: React.RefObject<HTMLDivElement | null>;
}

const Navigator: React.FC<{
  totalSize: number;
  visibleSize: number;
  onScroll: (offset: number) => void;
  onZoom: (newVisibleSize: number) => void;
  orientation: 'horizontal' | 'vertical';
  isDarkMode: boolean;
  currentOffset: number;
}> = ({ totalSize, visibleSize, onScroll, onZoom, orientation, isDarkMode, currentOffset }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'scroll' | 'start' | 'end' | null>(null);
  const [dragStartPos, setDragStartPos] = useState(0);
  const [initialOffset, setInitialOffset] = useState(0);
  const [initialVisibleSize, setInitialVisibleSize] = useState(0);

  const isH = orientation === 'horizontal';

  const thumbSize = Math.max(10, (visibleSize / totalSize) * 100); 
  const thumbPos = totalSize > visibleSize ? (currentOffset / (totalSize - visibleSize)) * (100 - thumbSize) : 0; 

  const handleMouseDown = (e: React.MouseEvent, type: 'scroll' | 'start' | 'end') => {
    e.stopPropagation();
    setIsDragging(type);
    setDragStartPos(isH ? e.clientX : e.clientY);
    setInitialOffset(currentOffset);
    setInitialVisibleSize(visibleSize);
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent) => {
      if (!trackRef.current) return;
      const trackRect = trackRef.current.getBoundingClientRect();
      const trackPixels = isH ? trackRect.width : trackRect.height;
      const delta = (isH ? e.clientX : e.clientY) - dragStartPos;

      if (isDragging === 'scroll') {
        const deltaOffset = (delta / trackPixels) * totalSize;
        const next = Math.max(0, Math.min(totalSize - visibleSize, initialOffset + deltaOffset));
        onScroll(next);
      } else if (isDragging === 'start' || isDragging === 'end') {
        const deltaSize = (delta / trackPixels) * totalSize;
        const nextSize = isDragging === 'end' 
          ? Math.max(10, initialVisibleSize + deltaSize)
          : Math.max(10, initialVisibleSize - deltaSize);
        onZoom(nextSize);
      }
    };

    const onUp = () => setIsDragging(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, dragStartPos, totalSize, visibleSize, initialOffset, initialVisibleSize, isH, onScroll, onZoom]);

  return (
    <div 
      ref={trackRef}
      className={`relative transition-colors rounded-full ${isH ? 'h-3 w-full' : 'w-3 h-full'} ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}
    >
      <div 
        className={`absolute rounded-full transition-all flex items-center justify-center cursor-grab active:cursor-grabbing ${isDarkMode ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-400 hover:bg-slate-500'}`}
        style={{
          left: isH ? `${thumbPos}%` : '0',
          top: isH ? '0' : `${thumbPos}%`,
          width: isH ? `${thumbSize}%` : '100%',
          height: isH ? '100%' : `${thumbSize}%`
        }}
        onMouseDown={(e) => handleMouseDown(e, 'scroll')}
      >
        <div 
          className={`absolute flex items-center justify-center cursor-col-resize hover:bg-white/20 transition-colors ${isH ? 'left-0 h-full w-4' : 'top-0 w-full h-4 cursor-row-resize'}`}
          onMouseDown={(e) => handleMouseDown(e, 'start')}
        >
           {isH ? <GripVertical size={8} className="text-white/40" /> : <GripHorizontal size={8} className="text-white/40" />}
        </div>
        <div 
          className={`absolute flex items-center justify-center cursor-col-resize hover:bg-white/20 transition-colors ${isH ? 'right-0 h-full w-4' : 'bottom-0 w-full h-4 cursor-row-resize'}`}
          onMouseDown={(e) => handleMouseDown(e, 'end')}
        >
           {isH ? <GripVertical size={8} className="text-white/40" /> : <GripHorizontal size={8} className="text-white/40" />}
        </div>
      </div>
    </div>
  );
};

const GanttChart: React.FC<GanttChartProps> = ({ 
  rows, 
  holidays, 
  hoveredRowIndex, 
  setHoveredRowIndex,
  onToggleStepDone,
  isDarkMode,
  userConfig,
  rowHeight,
  setRowHeight,
  dayWidth,
  setDayWidth,
  expandedSites,
  onVerticalScroll,
  tableSyncRef
}) => {
  const chartBodyRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [selectedBar, setSelectedBar] = useState<{site: Site, step: Step} | null>(null);

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

  const totalChartWidth = days.length * dayWidth;
  const totalChartHeight = rows.length * rowHeight;

  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  // CRITICAL: Direct DOM sync to ensure Edge/Chrome alignment
  const syncTableScroll = useCallback((newScrollY: number) => {
    if (tableSyncRef?.current) {
        tableSyncRef.current.scrollTop = newScrollY;
    }
  }, [tableSyncRef]);

  useEffect(() => {
    if (chartBodyRef.current) {
        chartBodyRef.current.scrollLeft = scrollX;
        chartBodyRef.current.scrollTop = scrollY;
    }
    if (headerRef.current) {
        headerRef.current.scrollLeft = scrollX;
    }
    syncTableScroll(scrollY);
    if (onVerticalScroll) onVerticalScroll(scrollY);
  }, [scrollX, scrollY, onVerticalScroll, syncTableScroll]);

  const handleWheel = useCallback((e: WheelEvent) => {
    // If Ctrl or Alt is held, we are ZOOMING
    if (e.ctrlKey || e.altKey) {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        
        if (e.ctrlKey) {
            // Ctrl + Wheel -> Vertical Zoom (Row Height)
            setRowHeight(Math.max(10, Math.min(150, rowHeight * zoomFactor)));
        } else if (e.altKey) {
            // Alt + Wheel -> Horizontal Zoom (Day Width)
            setDayWidth(Math.max(0.5, Math.min(200, dayWidth * zoomFactor)));
        }
        return;
    }

    // Otherwise we are PANNING
    e.preventDefault();
    if (e.shiftKey) {
        // Shift + Wheel -> Vertical Panning
        const visibleHeight = chartBodyRef.current?.clientHeight || 600;
        const nextY = Math.max(0, Math.min(totalChartHeight - visibleHeight, scrollY + e.deltaY));
        setScrollY(nextY);
        syncTableScroll(nextY); // Immediate DOM update
    } else {
        // Normal Wheel -> Horizontal Panning
        const visibleWidth = chartBodyRef.current?.clientWidth || 1000;
        setScrollX(prev => Math.max(0, Math.min(totalChartWidth - visibleWidth, prev + e.deltaY)));
    }
  }, [totalChartWidth, totalChartHeight, rowHeight, dayWidth, scrollY, syncTableScroll]);

  useEffect(() => {
    const el = chartBodyRef.current;
    if (el) {
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  const getPosition = (dateStr: string) => differenceInCalendarDays(parseISO(dateStr), startDate) * dayWidth;
  const getWidth = (start: string, finish: string) => (differenceInCalendarDays(parseISO(finish), parseISO(start)) + 1) * dayWidth;

  const handleZoomH = (newVisiblePixels: number) => {
    const containerWidth = chartBodyRef.current?.clientWidth || 1000;
    const nextDayWidth = Math.max(0.5, Math.min(200, (containerWidth / newVisiblePixels) * dayWidth));
    setDayWidth(nextDayWidth);
  };

  const handleZoomV = (newVisiblePixels: number) => {
    const containerHeight = chartBodyRef.current?.clientHeight || 600;
    const nextRowHeight = Math.max(10, Math.min(150, (containerHeight / newVisiblePixels) * rowHeight));
    setRowHeight(nextRowHeight);
  };

  const handleResetH = () => setDayWidth(40);
  const handleResetV = () => setRowHeight(48);

  const handleNavScrollY = (next: number) => {
    setScrollY(next);
    syncTableScroll(next);
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden transition-all min-w-0 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'} relative`}>
      <div ref={headerRef} className={`sticky top-0 z-40 border-b overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`} style={{ height: rowHeight * 2 }}>
        <div className="flex whitespace-nowrap h-full relative" style={{ width: totalChartWidth }}>
          <div className="absolute top-0 left-0 flex h-1/2 border-b border-slate-200/10">
            {months.map(m => (
              <div key={m.toISOString()} className={`border-r px-2 flex items-center text-[9px] font-bold transition-colors ${isDarkMode ? 'text-slate-400 bg-slate-900 border-slate-800' : 'text-slate-600 bg-slate-50 border-slate-200'}`} style={{ width: getWidth(m.toISOString(), endOfMonth(m).toISOString()) }}>
                {dayWidth > 5 ? format(m, 'MMMM yyyy') : format(m, 'MMM')}
              </div>
            ))}
          </div>
          <div className="absolute bottom-0 left-0 flex h-1/2">
            {days.map(d => (
              <div key={d.toISOString()} className={`border-r flex items-center justify-center text-[8px] flex-col leading-tight transition-colors relative ${isDarkMode ? 'border-slate-800/50' : 'border-slate-100'} ${isWeekend(d) ? (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400') : (isDarkMode ? 'text-slate-400' : 'text-slate-500')} ${holidayMap.has(d.toISOString()) ? 'bg-orange-500/10 text-orange-500' : ''}`} style={{ width: dayWidth }}>
                {dayWidth > 15 && (
                  <>
                    <span>{format(d, 'EE').charAt(0)}</span>
                    <span className="font-bold">{format(d, 'd')}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-grow flex relative overflow-hidden">
        <div ref={chartBodyRef} className="flex-grow overflow-hidden relative">
          <div className="absolute inset-0 pointer-events-none flex" style={{ width: totalChartWidth, height: totalChartHeight }}>
            {days.map(d => (
              <div key={`grid-${d.toISOString()}`} style={{ width: dayWidth }} className={`h-full border-r ${isDarkMode ? 'border-slate-800/20' : 'border-slate-200/30'} ${isWeekend(d) ? (isDarkMode ? 'bg-slate-800/10' : 'bg-slate-100/10') : ''}`} />
            ))}
          </div>

          <div className="relative" style={{ width: totalChartWidth, height: totalChartHeight }}>
            {rows.map((row) => {
              const isSiteHeader = !row.step;
              const isCollapsed = !expandedSites.has(row.site.id);
              const isSiteConfirmed = row.site.steps.length > 0 && row.site.steps.every(s => s.isConfirmed);
              const isSiteCompleted = row.site.steps.length === 5 && row.site.steps.every(s => s.done);

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
                      summaryData = { main: { start: minStart.toISOString(), finish: maxFinish.toISOString() }, revisit: revisitStep };
                  }
              }
              
              return (
                <div key={`${row.site.id}-${row.step?.name || 'header'}`} className={`relative transition-all border-b flex items-center ${isDarkMode ? 'border-slate-800/50' : 'border-slate-100'} ${hoveredRowIndex === row.rowIndex ? (isDarkMode ? 'bg-slate-800/40' : 'bg-blue-50/50') : ''}`} style={{ height: rowHeight }}>
                  {summaryData?.main && (
                      <div className="absolute inset-0 pointer-events-none">
                          <div className={`absolute h-[60%] top-[20%] rounded shadow-sm flex items-center px-1.5 text-[8px] font-bold text-white overflow-hidden`}
                              style={{ 
                                  left: getPosition(summaryData.main.start),
                                  width: getWidth(summaryData.main.start, summaryData.main.finish),
                                  backgroundColor: isSiteCompleted ? userConfig.completedSummaryColour : (isSiteConfirmed ? userConfig.confirmedSummaryColour : userConfig.tbcSummaryColour)
                              }}>
                              <span className="truncate">{row.site.name}</span>
                          </div>
                      </div>
                  )}

                  {row.step && (() => {
                    const barWidth = getWidth(row.step.startDate, row.step.finishDate);
                    return (
                      <div onClick={() => setSelectedBar({ site: row.site, step: row.step! })} className={`absolute rounded cursor-pointer flex items-center px-1 text-[9px] font-bold text-white shadow-sm hover:brightness-110 active:scale-95 overflow-hidden ${rowHeight < 30 ? 'top-1 bottom-1' : 'top-1.5 bottom-1.5'} ${row.step.isTentative ? 'diagonal-stripe opacity-60' : ''}`} style={{ left: getPosition(row.step.startDate), width: Math.max(4, barWidth), backgroundColor: userConfig.stepColours[row.step.name] }}>
                        {barWidth > 40 && rowHeight > 24 && <span className="truncate flex-grow">{row.step.name}</span>}
                        {row.step.done && <Check size={rowHeight < 24 ? 8 : 10} strokeWidth={4} className="ml-auto" />}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>

        <div className={`w-8 border-l flex flex-col items-center py-4 px-1.5 gap-2 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
          <button 
            onClick={handleResetV}
            title="Reset Vertical Zoom"
            className={`p-1 rounded hover:bg-white/10 text-slate-500 hover:text-blue-500 transition-colors ${isDarkMode ? '' : 'hover:bg-black/5'}`}
          >
            <RotateCcw size={12} />
          </button>
          <div className="flex-grow w-full relative">
            <Navigator 
              totalSize={totalChartHeight} 
              visibleSize={chartBodyRef.current?.clientHeight || 600} 
              orientation="vertical" 
              isDarkMode={isDarkMode} 
              currentOffset={scrollY} 
              onScroll={handleNavScrollY} 
              onZoom={handleZoomV} 
            />
          </div>
        </div>
      </div>

      <div className={`h-8 border-t flex items-center px-4 gap-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
        <button 
          onClick={handleResetH}
          title="Reset Horizontal Zoom"
          className={`p-1 rounded hover:bg-white/10 text-slate-500 hover:text-blue-500 transition-colors ${isDarkMode ? '' : 'hover:bg-black/5'}`}
        >
          <RotateCcw size={14} />
        </button>
        <Navigator 
          totalSize={totalChartWidth} 
          visibleSize={chartBodyRef.current?.clientWidth || 1000} 
          orientation="horizontal" 
          isDarkMode={isDarkMode} 
          currentOffset={scrollX} 
          onScroll={setScrollX} 
          onZoom={handleZoomH} 
        />
        <div className="text-[9px] font-bold text-slate-500 uppercase flex-none italic tracking-tighter opacity-70">
          Wheel: Pan Horiz • Shift+Wheel: Pan Vert • Ctrl+Wheel: Zoom Vert • Alt+Wheel: Zoom Horiz
        </div>
      </div>

      {selectedBar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedBar(null)}>
          <div className={`w-80 rounded-2xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 text-white flex justify-between items-center`} style={{ backgroundColor: userConfig.stepColours[selectedBar.step.name] }}>
              <h3 className="font-bold text-sm">{selectedBar.step.name}</h3>
              <button onClick={() => setSelectedBar(null)}><X size={18}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3"><MapPin size={16} /><div className="text-xs font-bold">{selectedBar.site.name}</div></div>
              <div className="flex items-center gap-3 text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded-lg"><Clock size={16}/><div>{formatDateUK(selectedBar.step.startDate)} - {formatDateUK(selectedBar.step.finishDate)}</div></div>
              <button onClick={() => { onToggleStepDone(selectedBar.site.id, selectedBar.step.name); setSelectedBar(null); }} className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20">
                {selectedBar.step.done ? 'Reset Task' : 'Complete Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GanttChart;