
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
              Each task type (Pre-work, Visit, Report, etc.) has its own dedicated resource pool. This allows different tasks for different sites to happen simultaneously 
              in the same week, but prevents two visits or two pre-works from overlapping.
            </p>
          </section>

          <section>
            <h3 className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 mb-2">
              <Calendar size={18} className="text-emerald-500" /> Non-Working Days
            </h3>
            <p>
              Weekends (Sat-Sun) and user-defined Holidays are automatically excluded. Task durations count only <strong>actual workdays</strong>. 
              Site Visits are never scheduled on Fridays to maintain team consistency.
            </p>
          </section>

          <section>
            <h3 className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 mb-2">
              <CheckCircle size={18} className="text-purple-500" /> Conditional Revisit
            </h3>
            <p>
              The <strong>Revisit</strong> task is unique. It defaults to 3 months after the Final Presentation, but it will only be officially 
              "scheduled" and locked once all previous steps for that site are marked as <strong>Complete</strong>. Until then, it remains 
              as a tentative indicator in the timeline.
            </p>
          </section>

          <section className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
            <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-1">Quick Tips</h4>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Use <strong>Shift + Scroll</strong> to pan left/right on the calendar.</li>
              <li>You can type <strong>'26'</strong> in date inputs as a shortcut for 2026.</li>
              {/* Fix: AlertCircle component was missing from the import list */}
              <li>Hover over the <AlertCircle size={10} className="inline" /> icon to see why a task is overdue.</li>
              <li>Click any bar on the Gantt chart to quickly toggle its completion status.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ReadmeModal;
