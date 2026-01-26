import React, { useState, useRef, useEffect } from 'react';
import { SiteStatus, Site, StepName } from '../types';
import { X, Clock, Calendar as CalIcon } from 'lucide-react';
import { DEFAULT_DURATIONS } from '../constants';

interface AddSiteFormProps {
  onClose: () => void;
  onSubmit: (site: Partial<Site>) => void;
  existingSiteNames: string[];
  isDarkMode: boolean;
}

const AddSiteForm: React.FC<AddSiteFormProps> = ({ onClose, onSubmit, existingSiteNames, isDarkMode }) => {
  const [name, setName] = useState('');
  const [siteType, setSiteType] = useState('WTW');
  const [owner, setOwner] = useState('');
  const [status, setStatus] = useState<SiteStatus>(SiteStatus.TBC);
  
  // Three-part date state
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('26'); // Default to 26
  
  const [durations, setDurations] = useState<Record<string, number>>({ ...DEFAULT_DURATIONS });
  const [error, setError] = useState('');

  // Refs for auto-focus
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const updateDuration = (step: StepName, val: string) => {
    const n = parseInt(val) || 1;
    setDurations(prev => ({ ...prev, [step]: n }));
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    setDay(val);
    if (val.length === 2) {
      monthRef.current?.focus();
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    setMonth(val);
    if (val.length === 2) {
      yearRef.current?.focus();
    }
    if (val.length === 0 && (e.nativeEvent as any).inputType === 'deleteContentBackward') {
        dayRef.current?.focus();
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setYear(val);
    if (val.length === 0 && (e.nativeEvent as any).inputType === 'deleteContentBackward') {
        monthRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Site name is required');
      return;
    }

    // Append WTW or STW to the name
    const finalName = `${name.trim()} (${siteType})`;

    // Prevent duplicate sites (Case-insensitive)
    const isDuplicate = existingSiteNames.some(
      existing => existing.toLowerCase() === finalName.toLowerCase()
    );

    if (isDuplicate) {
      setError(`A site named "${finalName}" already exists. Please use a unique name.`);
      return;
    }

    let bookedStartDate: string | undefined = undefined;
    if (status === SiteStatus.BOOKED) {
      // Construct date from parts
      const d = parseInt(day);
      const m = parseInt(month);
      let y = parseInt(year);
      
      if (isNaN(d) || isNaN(m) || isNaN(y)) {
        setError('Please enter a valid date (DD/MM/YYYY)');
        return;
      }

      if (y < 100) y += 2000;
      
      const parsed = new Date(y, m - 1, d);
      if (isNaN(parsed.getTime()) || parsed.getDate() !== d || parsed.getMonth() !== m - 1) {
        setError('Invalid date components. Please check your entry.');
        return;
      }
      bookedStartDate = parsed.toISOString();
    }

    onSubmit({
      name: finalName,
      owner,
      status,
      bookedStartDate,
      createdAt: Date.now(),
      notes: '',
      customDurations: durations,
      steps: []
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className={`rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className={`flex items-center justify-between p-5 border-b transition-colors ${isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-slate-50'}`}>
          <div>
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>New Site Plan</h2>
            <p className="text-xs text-slate-500 mt-0.5">Initialize site work with custom constraints</p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}><X size={20}/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {error && (
            <div className={`p-3 rounded-xl text-xs font-bold border animate-in fade-in slide-in-from-top-1 ${isDarkMode ? 'bg-red-900/20 text-red-400 border-red-900' : 'bg-red-50 text-red-600 border-red-100'}`}>
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Site Name</label>
              <input required value={name} onChange={e => setName(e.target.value)} className={`w-full border-2 rounded-xl p-3 outline-none transition-all text-sm ${isDarkMode ? 'border-slate-800 bg-slate-950 text-white focus:border-blue-500' : 'border-slate-100 bg-white text-slate-800 focus:border-blue-500'}`} placeholder="e.g. Manchester Central" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Type</label>
              <select value={siteType} onChange={e => setSiteType(e.target.value)} className={`w-full border-2 rounded-xl p-3 outline-none transition-all text-sm cursor-pointer ${isDarkMode ? 'border-slate-800 bg-slate-950 text-white focus:border-blue-500' : 'border-slate-100 bg-white text-slate-800 focus:border-blue-500'}`}>
                <option value="WTW">WTW</option>
                <option value="STW">STW</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Owner / Team</label>
              <input required value={owner} onChange={e => setOwner(e.target.value)} className={`w-full border-2 rounded-xl p-3 outline-none transition-all text-sm ${isDarkMode ? 'border-slate-800 bg-slate-950 text-white focus:border-blue-500' : 'border-slate-100 bg-white text-slate-800 focus:border-blue-500'}`} placeholder="e.g. Team North" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Scheduling Mode</label>
              <select value={status} onChange={e => setStatus(e.target.value as SiteStatus)} className={`w-full border-2 rounded-xl p-3 outline-none transition-all text-sm cursor-pointer ${isDarkMode ? 'border-slate-800 bg-slate-950 text-white focus:border-blue-500' : 'border-slate-100 bg-white text-slate-800 focus:border-blue-500'}`}>
                <option value={SiteStatus.TBC}>TBC (Auto-fill)</option>
                <option value={SiteStatus.BOOKED}>Booked (Fixed Start)</option>
              </select>
            </div>
          </div>

          {status === SiteStatus.BOOKED && (
            <div className="animate-in fade-in slide-in-from-top-2 space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fixed Start Date</label>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1 flex-grow p-1 border-2 rounded-xl ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  <input 
                    ref={dayRef}
                    placeholder="DD"
                    value={day}
                    onChange={handleDayChange}
                    className={`w-12 bg-transparent text-center text-sm font-bold outline-none ${isDarkMode ? 'text-white placeholder:text-slate-700' : 'text-slate-800 placeholder:text-slate-300'}`}
                  />
                  <span className={`${isDarkMode ? 'text-slate-700' : 'text-slate-300'} font-bold`}>/</span>
                  <input 
                    ref={monthRef}
                    placeholder="MM"
                    value={month}
                    onChange={handleMonthChange}
                    className={`w-12 bg-transparent text-center text-sm font-bold outline-none ${isDarkMode ? 'text-white placeholder:text-slate-700' : 'text-slate-800 placeholder:text-slate-300'}`}
                  />
                  <span className={`${isDarkMode ? 'text-slate-700' : 'text-slate-300'} font-bold`}>/</span>
                  <input 
                    ref={yearRef}
                    placeholder="YYYY"
                    value={year}
                    onChange={handleYearChange}
                    className={`w-16 bg-transparent text-center text-sm font-bold outline-none ${isDarkMode ? 'text-white placeholder:text-slate-700' : 'text-slate-800 placeholder:text-slate-300'}`}
                  />
                </div>
                <div className={`p-3 rounded-xl ${isDarkMode ? 'text-blue-500 bg-blue-900/20' : 'text-blue-500 bg-blue-50'}`}>
                    <CalIcon size={20} />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Step Durations (Workdays)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.values(StepName).map((step) => (
                <div key={step} className={`flex items-center justify-between p-3 rounded-xl border group ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-400" />
                    <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{step}</span>
                  </div>
                  <input 
                    type="number" 
                    min="1" 
                    max="30"
                    value={durations[step]}
                    onChange={(e) => updateDuration(step as StepName, e.target.value)}
                    className={`w-16 border-2 rounded-lg p-1.5 text-center text-xs outline-none transition-all ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white focus:border-blue-400' : 'border-slate-200 bg-white text-slate-800 focus:border-blue-400'}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button type="button" onClick={onClose} className={`flex-1 font-bold py-3 rounded-xl transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Cancel</button>
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]">Confirm Schedule</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSiteForm;