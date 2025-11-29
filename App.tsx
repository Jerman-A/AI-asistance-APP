import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import LiveSession from './components/LiveSession';
import { AppMode } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.CHAT);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSetMode = (newMode: AppMode) => {
    setMode(newMode);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar currentMode={mode} setMode={handleSetMode} />

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="w-64 h-full bg-slate-900 shadow-2xl animate-slide-in-left">
            <div className="flex justify-end p-4">
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400">
                <X size={24} />
              </button>
            </div>
            {/* Reusing sidebar logic for mobile would ideally use a shared component, 
                but for simplicity we clone the nav here or just rely on Sidebar being responsive if we modified it.
                Let's use the actual Sidebar component but handle visibility via CSS classes in a real app. 
                For this strict file structure, I will just render the Sidebar inside a wrapper for mobile.
            */}
             <div className="h-full -mt-12">
                 <Sidebar currentMode={mode} setMode={handleSetMode} />
             </div>
          </div>
          <div 
            className="flex-1 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full w-full relative">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">N</div>
            <span className="font-bold text-slate-200">Gemini Nexus</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-300">
            <Menu size={24} />
          </button>
        </div>

        {/* Viewport */}
        <div className="flex-1 overflow-hidden relative">
          {mode === AppMode.CHAT ? <ChatInterface /> : <LiveSession />}
        </div>
      </div>
    </div>
  );
};

export default App;
