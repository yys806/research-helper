import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="py-6 bg-white border-t border-slate-100 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <p className="text-slate-400 text-sm">
          Powered by Gemini 3 Flash • Built with React & Tailwind
        </p>
      </div>
    </footer>
  );
};