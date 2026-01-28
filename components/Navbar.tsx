import React from 'react';
import { Sigma, Github, FileText } from 'lucide-react';
import { APP_NAME } from '../constants';

interface NavbarProps {
  activeTab: 'formula' | 'paper';
  setActiveTab: (tab: 'formula' | 'paper') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm flex-shrink-0">
      <div className="w-full px-4 h-14 flex items-center justify-between">
        
        {/* Left: Tab Switcher & Title */}
        <div className="flex items-center gap-4">
          <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 inline-flex">
            <button
                onClick={() => setActiveTab('formula')}
                className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
                    ${activeTab === 'formula' 
                        ? 'bg-white text-brand-700 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }
                `}
            >
                <Sigma className="w-4 h-4" />
                公式提取
            </button>
            <button
                onClick={() => setActiveTab('paper')}
                className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
                    ${activeTab === 'paper' 
                        ? 'bg-white text-brand-700 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }
                `}
            >
                <FileText className="w-4 h-4" />
                论文精读
            </button>
          </div>

          {/* Title - Smaller and after tabs */}
          <div className="flex items-center gap-2 text-slate-500">
             <span className="text-slate-300">|</span>
             <span className="font-semibold text-base tracking-tight hover:text-brand-600 transition-colors cursor-default">{APP_NAME}</span>
          </div>
        </div>
        
        {/* Right: Links */}
        <div className="flex items-center gap-4">
          <a 
            href="#" 
            className="p-2 text-slate-400 hover:text-slate-800 transition-colors"
            aria-label="Github"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </div>
    </nav>
  );
};