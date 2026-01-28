import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { FormulaFeature } from './components/FormulaFeature';
import { PaperFeature } from './components/PaperFeature';
import { ApiKeyBar } from './components/ApiKeyBar';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'formula' | 'paper'>('formula');

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <ApiKeyBar />
      
      <main className="flex-grow overflow-hidden flex flex-col relative">
        {activeTab === 'formula' ? (
             <div className="h-full overflow-y-auto">
                 <div className="container mx-auto px-4 py-8 max-w-6xl">
                    <FormulaFeature />
                 </div>
             </div>
        ) : (
            <div className="h-full flex flex-col">
                <PaperFeature />
            </div>
        )}
      </main>
    </div>
  );
};

export default App;
