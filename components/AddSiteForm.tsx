
import React, { useState } from 'react';
import { SiteStatus, Site, StepName } from '../types';
import { X, Clock } from 'lucide-react';
import { DEFAULT_DURATIONS } from '../constants';
import { parseUKDate } from '../utils/dateUtils';

interface AddSiteFormProps {
  onClose: () => void;
  onSubmit: (site: Partial<Site>) => void;
}

const AddSiteForm: React.FC<AddSiteFormProps> = ({ onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [siteType, setSiteType] = useState('WTW');
  const [owner, setOwner] = useState('');
  const [status, setStatus] = useState<SiteStatus>(SiteStatus.TBC);
  const [bookedDateInput, setBookedDateInput] = useState(''); 
  const [durations, setDurations] = useState<Record<string, number>>({ ...DEFAULT_DURATIONS });
  const [error, setError] = useState('');

  const updateDuration = (step: StepName, val: string) => {
    const n = parseInt(val) || 1;
    setDurations(prev => ({ ...prev, [step]: n }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Site name is required');
      return;
    }

    let bookedStartDate: string | undefined = undefined;
    if (status === SiteStatus.BOOKED) {
      const parsed = parseUKDate(bookedDateInput);
      if (!parsed) {
        setError('Invalid date. Use dd/mm/yyyy or d/m/yy (e.g. 1/1/26)');
        return;
      }
      bookedStartDate = parsed.toISOString();
    }

    // Append WTW or STW to the name
    const finalName = `${name.trim()} (${siteType})`;

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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">New Site Plan</h2>
            <p className="text-xs text-slate-500 mt-0.5">Initialize site work with custom constraints</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors dark:text-slate-400"><X size={20}/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold border border-red-100 dark:border-red-900 animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Site Name</label>
              <input required value={name} onChange={e => setName(e.target.value)} className="w-full border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-950 rounded-xl p-3 focus:border-blue-500 focus:ring-0 outline-none transition-all text-sm" placeholder="e.g. Manchester Central" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Type</label>
              <select value={siteType} onChange={e => setSiteType(e.target.value)} className="w-full border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-950 rounded-xl p-3 focus:border-blue-500 focus:ring-0 outline-none transition-all text-sm cursor-pointer">
                <option value="WTW">WTW</option>
                <option value="STW">STW</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Owner / Team</label>
              <input required value={owner} onChange={e => setOwner(e.target.value)} className="w-full border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-950 rounded-xl p-3 focus:border-blue-500 focus:ring-0 outline-none transition-all text-sm" placeholder="e.g. Team North" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Scheduling Mode</label>
              <select value={status} onChange={e => setStatus(e.target.value as SiteStatus)} className="w-full border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-950 rounded-xl p-3 focus:border-blue-500 focus:ring-0 outline-none transition-all text-sm cursor-pointer">
                <option value={SiteStatus.TBC}>TBC (Auto-fill)</option>
                <option value={SiteStatus.BOOKED}>Booked (Fixed Start)</option>
              </select>
            </div>
          </div>

          {status === SiteStatus.BOOKED && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Fixed Start Date (UK Format)</label>
              <input 
                required 
                type="text" 
                value={bookedDateInput} 
                onChange={e => setBookedDateInput(e.target.value)} 
                className="w-full border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-950 rounded-xl p-3 focus:border-blue-500 focus:ring-0 outline-none transition-all text-sm" 
                placeholder="e.g. 1/1/26 or 01/01/2026"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Step Durations (Workdays)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.values(StepName).map((step) => (
                <div key={step} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 group">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{step}</span>
                  </div>
                  <input 
                    type="number" 
                    min="1" 
                    max="30"
                    value={durations[step]}
                    onChange={(e) => updateDuration(step as StepName, e.target.value)}
                    className="w-16 border-2 border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded-lg p-1.5 text-center text-xs focus:border-blue-400 outline-none transition-all dark:text-white"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 font-bold py-3 rounded-xl transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]">Confirm Schedule</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSiteForm;
