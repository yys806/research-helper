import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Info, Code, Eye } from 'lucide-react';
import { FormulaResponse } from '../types';

interface ResultCardProps {
  result: FormulaResponse | null;
  isLoading: boolean;
  hasImage: boolean;
}

declare global {
  interface Window {
    katex: any;
  }
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, isLoading, hasImage }) => {
  const [copied, setCopied] = useState(false);
  const katexRef = useRef<HTMLDivElement>(null);

  // Handle Copy
  const handleCopy = () => {
    if (!result?.latex) return;
    navigator.clipboard.writeText(result.latex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle KaTeX Rendering
  useEffect(() => {
    if (result?.latex && katexRef.current && window.katex) {
      try {
        // Strip $$ for display rendering if needed, but KaTeX displayMode usually handles raw LaTeX well
        // We'll strip the $$ delimiters if present to pass purely the formula to katex.render
        const cleanLatex = result.latex.replace(/^\$\$|\$\$?$/g, '');
        window.katex.render(cleanLatex, katexRef.current, {
          throwOnError: false,
          displayMode: true,
          output: 'html' // use html output for better accessibility if possible
        });
      } catch (e) {
        console.error("KaTeX render error", e);
        if (katexRef.current) katexRef.current.innerText = "预览失败";
      }
    }
  }, [result]);

  if (!hasImage) {
    return (
      <div className="h-full min-h-[320px] bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center text-slate-400 text-center shadow-sm">
        <Code className="w-12 h-12 mb-4 opacity-20" />
        <p>在左侧上传或粘贴图片<br/>AI识别结果将显示在这里</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full min-h-[320px] bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm animate-pulse">
        <div className="h-8 bg-slate-100 rounded w-1/3 mb-6"></div>
        <div className="h-32 bg-slate-100 rounded-xl mb-6"></div>
        <div className="h-6 bg-slate-100 rounded w-1/4 mb-2"></div>
        <div className="h-4 bg-slate-100 rounded w-full"></div>
        <div className="h-4 bg-slate-100 rounded w-5/6"></div>
      </div>
    );
  }

  if (!result) {
    return null; // Should ideally not happen if hasImage is true and not loading, handled by App error state usually
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden flex flex-col">
      
      {/* 1. LaTeX Code Section */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <Code className="w-5 h-5 text-brand-600" />
            <h3>LaTeX 代码</h3>
          </div>
          <button
            onClick={handleCopy}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
              ${copied 
                ? 'bg-green-100 text-green-700 border border-green-200' 
                : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-300 hover:text-brand-600'
              }
            `}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" /> 已复制
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> 复制
              </>
            )}
          </button>
        </div>
        
        <div className="relative group">
          <textarea
            readOnly
            value={result.latex}
            className="w-full h-24 p-4 font-mono text-sm bg-slate-900 text-slate-50 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          />
        </div>
      </div>

      {/* 2. Visual Preview */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-2 text-slate-700 font-semibold mb-4">
          <Eye className="w-5 h-5 text-brand-600" />
          <h3>公式预览</h3>
        </div>
        <div className="flex justify-center items-center min-h-[4rem] overflow-x-auto py-4 px-2">
            <div ref={katexRef} className="text-lg md:text-xl text-slate-800"></div>
        </div>
      </div>

      {/* 3. Explanation Section */}
      <div className="p-6 bg-brand-50/30 flex-grow">
        <div className="flex items-center gap-2 text-slate-700 font-semibold mb-3">
          <Info className="w-5 h-5 text-brand-600" />
          <h3>公式解析</h3>
        </div>
        <p className="text-slate-600 leading-relaxed text-sm md:text-base whitespace-pre-wrap">
          {result.explanation}
        </p>
      </div>
    </div>
  );
};