
import React, { useState } from 'react';
import { Holiday } from '../types';
import { X, Trash2, Calendar as CalIcon, Plus } from 'lucide-react';
import { formatDateUK } from '../utils/dateUtils';

interface HolidayManagerProps {
  holidays: Holiday[];
  onAdd: (h: Omit<Holiday, 'id'>) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

const HolidayManager: React.FC<HolidayManagerProps> = ({ holidays, onAdd, onRemove, onClose }) => {
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !description) return;
    onAdd({ date: new Date(date).toISOString(), description });
    setDate('');
    setDescription('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md h-[600px] flex flex-col overflow-hidden border dark:border-slate-800">
        <div className="flex items-center justify-between p-5 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div>
            <h2 className="text-xl font-bold dark:text-white">Holiday Manager</h2>
            <p className="text-xs text-slate-500 mt-0.5">Define non-working days for scheduling</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors dark:text-slate-400">
            <X size={20}/>
          </button>
        </div>
        
        <div className="p-6 flex-grow overflow-y-auto space-y-6">
          <form onSubmit={handleAdd} className="space-y-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border dark:border-slate-800">
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Holiday Date</label>
                <input 
                  required 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  className="w-full border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-900 rounded-lg p-2 text-sm outline-none focus:border-blue-500 transition-all dark:text-white" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                <input 
                  required 
                  placeholder="e.g. Bank Holiday" 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  className="w-full border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-900 rounded-lg p-2 text-sm outline-none focus:border-blue-500 transition-all dark:text-white" 
                />
              </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
              <Plus size={16} /> Add Holiday
            </button>
          </form>

          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Registered Holidays</h3>
            {holidays.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs italic">No custom holidays added yet</div>
            ) : (
              holidays.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(h => (
                <div key={h.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/50 rounded-xl border dark:border-slate-800 group hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                      <CalIcon size={14} />
                    </div>
                    <div>
                      <div className="font-bold text-xs dark:text-slate-100">{formatDateUK(h.date)}</div>
                      <div className="text-[10px] text-slate-500">{h.description}</div>
                    </div>
                  </div>
                  <button onClick={() => onRemove(h.id)} className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 size={16}/>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HolidayManager;