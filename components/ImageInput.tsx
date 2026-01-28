import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, Loader2, Plus, Image as ImageIcon } from 'lucide-react';

interface ImageInputProps {
  onImageSelect: (base64: string) => void;
  selectedImage: string | null;
  isAnalyzing: boolean;
  onClear: () => void;
}

export const ImageInput: React.FC<ImageInputProps> = ({ 
  onImageSelect, 
  selectedImage, 
  isAnalyzing,
  onClear 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so same file can be selected again if needed
    e.target.value = '';
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
        alert("请选择图片文件");
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      onImageSelect(base64);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    let found = false;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
            processFile(blob);
            found = true;
            e.preventDefault(); // Prevent default paste behavior (text insertion)
            break;
        }
      }
    }

    if (!found) {
        // If no image found, we allow text paste but maybe warn? 
        // Or just let it be. The user might have pasted text by accident.
    }
  };

  const handleTriggerUpload = () => {
    if (!isAnalyzing) {
      fileInputRef.current?.click();
    }
  };

  // Adjust textarea height automatically
  useEffect(() => {
    if (textAreaRef.current) {
        textAreaRef.current.style.height = 'auto';
        textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
    }
  }, [inputValue]);

  return (
    <div className="w-full flex flex-col gap-4">
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      
      {/* Image Preview Area */}
      {selectedImage ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white group min-h-[200px] flex items-center justify-center bg-slate-100/50">
          <img 
            src={selectedImage} 
            alt="Uploaded Formula" 
            className={`w-full h-auto max-h-[400px] object-contain mx-auto transition-opacity duration-300 ${isAnalyzing ? 'opacity-50 blur-[2px]' : 'opacity-100'}`}
          />
          
          {isAnalyzing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
                <span className="text-sm font-medium text-slate-700">正在识别公式...</span>
              </div>
            </div>
          )}

          {!isAnalyzing && (
            <button 
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm z-20"
              title="移除图片"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      ) : (
         // Empty state placeholder - simplified
         <div className="hidden md:flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 bg-slate-50/50">
             <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
             <p>预览区域</p>
         </div>
      )}

      {/* Chat-style Input Bar */}
      <div className="flex flex-col gap-2">
        <div className={`
            flex items-end gap-2 p-2 bg-white rounded-2xl border transition-all shadow-sm
            ${isAnalyzing ? 'opacity-50 pointer-events-none border-slate-200' : 'border-slate-300 hover:border-slate-400 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10'}
        `}>
            <button 
                onClick={handleTriggerUpload}
                className="p-3 text-slate-500 hover:bg-slate-100 hover:text-brand-600 active:bg-slate-200 rounded-xl transition-colors flex-shrink-0"
                title="上传图片"
            >
                <Plus className="w-6 h-6" />
            </button>

            <div className="flex-grow py-3 px-1 relative">
                <textarea
                    ref={textAreaRef}
                    rows={1}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onPaste={handlePaste}
                    placeholder="在此处粘贴图片，或点击 + 号上传"
                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-slate-700 placeholder:text-slate-400 resize-none max-h-32 min-h-[24px] leading-6"
                    style={{ overflowY: 'hidden' }}
                />
            </div>
            
            {/* Optional: Send/Action button if we wanted to enforce manual submit, but auto-submit on paste/select is better for this app flow. 
                We can keep it clean without a send button since the action is immediate upon file selection/paste.
            */}
        </div>
        <p className="text-xs text-slate-400 px-2 flex justify-between items-center">
            <span>支持 JPG, PNG, WebP</span>
            <span className="hidden sm:inline">提示: 手机端可长按输入框选择"粘贴"</span>
        </p>
      </div>
    </div>
  );
};