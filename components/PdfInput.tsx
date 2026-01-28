import React, { useRef, useState } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle2 } from 'lucide-react';

interface PdfInputProps {
  onFileSelect: (base64: string, filename: string) => void;
  fileName: string | null;
  isAnalyzing: boolean;
  onClear: () => void;
}

export const PdfInput: React.FC<PdfInputProps> = ({ 
  onFileSelect, 
  fileName, 
  isAnalyzing,
  onClear 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const processFile = (file: File) => {
    if (file.type !== 'application/pdf') {
        alert("请上传 PDF 格式的文件");
        return;
    }
    // Simple client-side size check (e.g. 10MB limit for better experience)
    if (file.size > 10 * 1024 * 1024) {
        alert("文件过大 (超过 10MB)，建议压缩后上传");
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      onFileSelect(base64, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isAnalyzing) return;
    
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleTriggerUpload = () => {
    if (!isAnalyzing && !fileName) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="w-full">
      <input 
        type="file" 
        accept="application/pdf" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      
      {!fileName ? (
        <div 
          className={`
            relative group cursor-pointer
            flex flex-col items-center justify-center 
            h-64 w-full rounded-2xl 
            border-2 border-dashed transition-all duration-300
            ${isDragging 
              ? 'border-brand-500 bg-brand-50' 
              : 'border-slate-300 bg-white hover:border-brand-400 hover:bg-slate-50'
            }
          `}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={handleTriggerUpload}
        >
          <div className="flex flex-col items-center space-y-4 text-center p-6">
            <div className="p-4 bg-red-50 text-red-600 rounded-full group-hover:scale-110 transition-transform duration-300">
              <FileText className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-slate-700">
                上传论文 PDF
              </p>
              <p className="text-sm text-slate-500">
                拖拽文件或点击上传 (最大 10MB)
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-brand-200 bg-brand-50/50 p-6 flex flex-col items-center justify-center min-h-[160px] animate-in fade-in zoom-in-95">
           
           <div className="flex items-center gap-4 mb-2">
                <div className={`p-3 rounded-full ${isAnalyzing ? 'bg-slate-100' : 'bg-green-100'}`}>
                    {isAnalyzing ? (
                        <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                    ) : (
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                    )}
                </div>
                <div className="text-left overflow-hidden max-w-[200px] md:max-w-sm">
                    <p className="font-semibold text-slate-800 truncate" title={fileName}>
                        {fileName}
                    </p>
                    <p className="text-xs text-slate-500">
                        {isAnalyzing ? "正在深入阅读分析..." : "分析完成"}
                    </p>
                </div>
           </div>

          {!isAnalyzing && (
            <button 
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="移除文件"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};