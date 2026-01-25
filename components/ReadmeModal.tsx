
import React from 'react';
import { X, CheckCircle, Calendar, Zap, AlertCircle } from 'lucide-react';

interface ReadmeModalProps {
  onClose: () => void;
}

const ReadmeModal: React.FC<ReadmeModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
          <div>
            <h2 className="text-xl font-bold dark:text-white">System Documentation</h2>
            <p className="text-xs text-slate-500">How the Scheduling Engine Works</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20}/></button>
        </div>
        <div className="p-8 overflow-y-auto space-y-6 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          <section>
            <h3 className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 mb-2">
              <Zap size={18} className="text-blue-500" /> Auto-Scheduling Logic
            </h3>
            <p>
              The system uses a <strong>deterministic resource-aware engine</strong>. It schedules sites based on their priority (Booked first, then TBC creation order). 
              Each task type has its own resource pool, allowing different sites to progress through different stages at once.
            </p>
          </section>

          <section>
            <h3 className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 mb-2">
              <Calendar size={18} className="text-emerald-500" /> Non-Working Days
            </h3>
            <p>
              Weekends and user-defined Holidays are automatically excluded. Task durations count only <strong>actual workdays</strong>. 
            </p>
          </section>

          <section className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
            <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-1">Quick Tips</h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 dark:text-slate-300">
              <li>Use <strong>Shift + Scroll</strong> to pan the Gantt chart left/right.</li>
              <li>Type <strong>'26'</strong> in date inputs as a shortcut for 2026.</li>
              <li>Look for the <AlertCircle size={10} className="inline text-red-500" /> icon to see overdue tasks.</li>
              <li><strong>Import/Export</strong> Excel files to keep your data safe and share it with others.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ReadmeModal;
