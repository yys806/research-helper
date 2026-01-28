import React, { useState, useEffect, useCallback } from 'react';
import { ImageInput } from './ImageInput';
import { ResultCard } from './ResultCard';
import { FormulaResponse } from '../types';
import { analyzeImage } from '../services/geminiService';
import { AlertCircle } from 'lucide-react';

export const FormulaFeature: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<FormulaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = useCallback(async (base64Image: string) => {
    setSelectedImage(base64Image);
    setResult(null);
    setError(null);
    setIsAnalyzing(true);

    try {
      const data = await analyzeImage(base64Image);
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : '无法解析图片，请重试');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleClear = () => {
    setSelectedImage(null);
    setResult(null);
    setError(null);
  };

  // Global paste handler active only when this component is mounted
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.clipboardData && e.clipboardData.items) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const base64 = event.target?.result as string;
                handleImageSelect(base64);
              };
              reader.readAsDataURL(blob);
              e.preventDefault();
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handleImageSelect]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Left Column: Input */}
      <div className="space-y-6">
        <ImageInput 
          onImageSelect={handleImageSelect} 
          selectedImage={selectedImage} 
          isAnalyzing={isAnalyzing}
          onClear={handleClear}
        />
        
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold">解析失败</h4>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Result */}
      <div className="space-y-6">
        <ResultCard 
          result={result} 
          isLoading={isAnalyzing} 
          hasImage={!!selectedImage}
        />
      </div>
    </div>
  );
};