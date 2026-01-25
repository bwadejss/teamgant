
import React, { useState } from 'react';
import { Holiday } from '../types';
import { X, Trash2, Calendar as CalIcon } from 'lucide-react';
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
    onAdd({ date: new Date(date).toISOString(), description });
    setDate('');
    setDescription('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md h-[600px] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Holiday Manager</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X size={20}/></button>
        </div>
        <div className="p-6 flex-grow overflow-y-auto">
          <form onSubmit={handleAdd} className="mb-6 space-y-4">
            <div className="flex gap-2">
              <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="flex-1 border rounded-lg p-2 text-sm outline-none" />
              <input required placeholder="New Year's Day" value={description} onChange={e => setDescription(e.target.value)} className="flex-1 border rounded-lg p-2 text-sm outline-none" />
            </div>
            <button type="submit" className="w-full bg-slate-800 text-white font-bold py-2 rounded-lg hover:bg-slate-700 transition-colors">Add Holiday</button>
          </form>
          <div className="space-y-2">
            {holidays.map(h => (
              <div key={h.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <div className="font-bold text-sm">{formatDateUK(h.date)}</div>
                  <div className="text-xs text-slate-500">{h.description}</div>
                </div>
                <button onClick={() => onRemove(h.id)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HolidayManager;
