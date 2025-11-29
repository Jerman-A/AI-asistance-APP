import React from 'react';
import { MessageSquareText, Radio, Info } from 'lucide-react';
import { AppMode } from '../types';

interface SidebarProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentMode, setMode }) => {
  return (
    <div className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 h-full p-4">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <span className="font-bold text-white">N</span>
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
          Gemini Nexus
        </h1>
      </div>

      <nav className="flex-1 space-y-2">
        <button
          onClick={() => setMode(AppMode.CHAT)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
            currentMode === AppMode.CHAT
              ? 'bg-slate-800 text-blue-400 shadow-lg shadow-blue-500/10'
              : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
          }`}
        >
          <MessageSquareText size={20} />
          <span className="font-medium">Assistant Chat</span>
        </button>

        <button
          onClick={() => setMode(AppMode.LIVE)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
            currentMode === AppMode.LIVE
              ? 'bg-slate-800 text-rose-400 shadow-lg shadow-rose-500/10'
              : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
          }`}
        >
          <Radio size={20} />
          <span className="font-medium">Live Voice</span>
        </button>
      </nav>

      <div className="mt-auto px-4 py-4 rounded-xl bg-slate-800/30 border border-slate-800">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-slate-500 mt-1" />
          <p className="text-xs text-slate-500 leading-relaxed">
            Powered by Google Gemini 2.5 Flash.
            <br />
            Nexus v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
