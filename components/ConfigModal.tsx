import React from 'react';
import { X, Settings, Palette, Clock, SortAsc, RefreshCcw, Layers } from 'lucide-react';
import { StepName, UserConfig, SortMode } from '../types';

interface ConfigModalProps {
  config: UserConfig;
  onUpdate: (newConfig: UserConfig) => void;
  onClose: () => void;
  isDarkMode: boolean;
}

const ConfigModal: React.FC<ConfigModalProps> = ({ config, onUpdate, onClose, isDarkMode }) => {
  const updateStepColour = (step: StepName, colour: string) => {
    onUpdate({
      ...config,
      stepColours: { ...config.stepColours, [step]: colour }
    });
  };

  const updateDefaultDuration = (step: StepName, val: string) => {
    onUpdate({
      ...config,
      defaultDurations: { ...config.defaultDurations, [step]: parseInt(val) || 1 }
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className={`rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
        <div className={`p-5 border-b flex justify-between items-center transition-colors ${isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-blue-500" />
            <h2 className="text-xl font-bold">System Configuration</h2>
          </div>
          <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}><X size={20}/></button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8 bg-inherit">
          <section>
            <h3 className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-slate-500 mb-4"><SortAsc size={16}/> General Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">Project Sorting</label>
                <select 
                  value={config.sortMode} 
                  onChange={(e) => onUpdate({...config, sortMode: e.target.value as SortMode})}
                  className={`w-full p-2.5 rounded-lg border-2 text-sm outline-none transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'}`}
                >
                  <option value="Creation">Creation Order</option>
                  <option value="Name">Site Name (A-Z)</option>
                  <option value="Date">Date of First Task</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">Revisit Delay (Months)</label>
                <input 
                  type="number" 
                  min="1" 
                  max="12"
                  value={config.revisitOffsetMonths}
                  onChange={(e) => onUpdate({...config, revisitOffsetMonths: parseInt(e.target.value) || 3})}
                  className={`w-full p-2.5 rounded-lg border-2 text-sm outline-none transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'}`}
                />
              </div>
              
              <div className="md:col-span-2 space-y-3">
                <div className={`flex items-center gap-3 p-4 rounded-xl border-2 border-dashed transition-colors ${isDarkMode ? 'border-slate-800 bg-slate-800/20' : 'border-slate-200 bg-slate-50'}`}>
                   <input 
                    type="checkbox" 
                    id="keepColour"
                    checked={config.keepColourOnDone}
                    onChange={(e) => onUpdate({...config, keepColourOnDone: e.target.checked})}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                   />
                   <label htmlFor="keepColour" className="text-sm font-medium">
                     Keep original task colour when completed (show tick only)
                   </label>
                </div>

                <div className={`flex items-center gap-3 p-4 rounded-xl border-2 border-dashed transition-colors ${isDarkMode ? 'border-slate-800 bg-slate-800/20' : 'border-slate-200 bg-slate-50'}`}>
                   <RefreshCcw size={18} className="text-blue-500" />
                   <div className="flex-grow">
                     <label htmlFor="autoRegen" className="text-sm font-bold block">Auto-generate next visit (12m delay)</label>
                     <span className="text-[10px] text-slate-500">Adds "(V2)", "(V3)" etc. when a site's revisit is complete.</span>
                   </div>
                   <input 
                    type="checkbox" 
                    id="autoRegen"
                    checked={config.autoRegenerateVisit}
                    onChange={(e) => onUpdate({...config, autoRegenerateVisit: e.target.checked})}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                   />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-slate-500 mb-4"><Layers size={16}/> Summary Bar Colours (Collapsed View)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Confirmed</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={config.confirmedSummaryColour} 
                    onChange={(e) => onUpdate({...config, confirmedSummaryColour: e.target.value})}
                    className="w-10 h-10 rounded cursor-pointer border-none bg-transparent"
                  />
                  <span className="text-xs font-mono">{config.confirmedSummaryColour}</span>
                </div>
              </div>
              <div className={`p-4 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">TBC</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={config.tbcSummaryColour} 
                    onChange={(e) => onUpdate({...config, tbcSummaryColour: e.target.value})}
                    className="w-10 h-10 rounded cursor-pointer border-none bg-transparent"
                  />
                  <span className="text-xs font-mono">{config.tbcSummaryColour}</span>
                </div>
              </div>
              <div className={`p-4 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Completed</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={config.completedSummaryColour} 
                    onChange={(e) => onUpdate({...config, completedSummaryColour: e.target.value})}
                    className="w-10 h-10 rounded cursor-pointer border-none bg-transparent"
                  />
                  <span className="text-xs font-mono">{config.completedSummaryColour}</span>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-slate-500 mb-4"><Palette size={16}/> Tasks: Colours & Defaults</h3>
            <div className="space-y-4">
              {Object.values(StepName).map((step) => (
                <div key={step} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex items-center gap-4">
                    <input 
                      type="color" 
                      value={config.stepColours[step]} 
                      onChange={(e) => updateStepColour(step, e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                    />
                    <span className="text-sm font-bold">{step}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Default</span>
                    <input 
                      type="number" 
                      min="1"
                      value={config.defaultDurations[step]}
                      onChange={(e) => updateDefaultDuration(step, e.target.value)}
                      className={`w-14 p-1.5 rounded-lg border-2 text-center text-xs outline-none transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                    />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Days</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        
        <div className={`p-6 border-t flex justify-end transition-colors ${isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-slate-50'}`}>
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;