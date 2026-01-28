
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { PdfInput } from './PdfInput';
import { ImageInput } from './ImageInput';
import { PdfViewer } from './PdfViewer';
import { analyzePaper, analyzeChart, chatWithPaper } from '../services/geminiService';
import { extractPdfText } from '../services/pdfText';
import { BookOpen, Copy, Check, FileText, Bot, History, PieChart, Trash2, ArrowRight, Crop, MessageSquare, Send, User } from 'lucide-react';
import { PaperHistoryItem, ChatMessage } from '../types';

type SubTab = 'read' | 'chart' | 'qa' | 'history';

export const PaperFeature: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('read');
  
  // Reading State
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [readResult, setReadResult] = useState<string>("");
  
  // Preview State
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  
  // Chart State
  const [chartImage, setChartImage] = useState<string | null>(null);
  const [chartResult, setChartResult] = useState<string>("");
  const [isChartAnalyzing, setIsChartAnalyzing] = useState<boolean>(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Common State
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState<{ message: string; percent: number } | null>(null);
  const [history, setHistory] = useState<PaperHistoryItem[]>([]);

  // Load History on Mount
  useEffect(() => {
    const saved = localStorage.getItem('mathsnap_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) { console.error("Failed to load history"); }
    }
  }, []);

  // Convert Base64 PDF to Blob URL for reliable previewing
  useEffect(() => {
    if (!pdfFile) {
        setPdfPreviewUrl(null);
        return;
    }

    let url: string | null = null;
    try {
        // Extract base64 data
        const arr = pdfFile.split(',');
        const data = arr[1] || arr[0]; // Fallback if no prefix
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
        
        const binaryString = window.atob(data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: mime });
        url = URL.createObjectURL(blob);
        setPdfPreviewUrl(url);
    } catch (e) {
        console.error("PDF Preview generation failed:", e);
    }

    // Cleanup URL on unmount or file change
    return () => {
        if (url) URL.revokeObjectURL(url);
    };
  }, [pdfFile]);

  // Auto scroll chat
  useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, subTab]);

  const saveToHistory = (item: PaperHistoryItem) => {
    // Remove existing item with same ID if exists (for updating chat history)
    const filteredHistory = history.filter(h => h.id !== item.id);
    const newHistory = [item, ...filteredHistory];
    setHistory(newHistory);
    localStorage.setItem('mathsnap_history', JSON.stringify(newHistory));
  };

  const handlePdfSelect = async (base64: string, name: string) => {
    setPdfFile(base64);
    setFileName(name);
    setReadResult("");
    setChatMessages([]);
    setError(null);
    setIsAnalyzing(true);
    setSubTab('read'); // Switch to notes tab immediately
    setProgress({ message: "解析 PDF 文本...", percent: 10 });

    try {
      const { text, pages } = await extractPdfText(base64);
      setProgress({ message: `提取文本完成（${pages} 页），正在生成笔记...`, percent: 60 });

      // Start analysis
      const result = await analyzePaper(text, name);
      setProgress({ message: "生成笔记完成", percent: 95 });
      setReadResult(result);
      saveToHistory({
        id: Date.now().toString(),
        type: 'note',
        fileName: name,
        timestamp: Date.now(),
        content: result
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "分析论文时出错");
    } finally {
      setIsAnalyzing(false);
      setProgress(null);
    }
  };

  const handleChartSelect = async (base64: string) => {
    setChartImage(base64);
    setChartResult("");
    setError(null);
    setIsChartAnalyzing(true);

    try {
      const result = await analyzeChart(base64);
      setChartResult(result);
      saveToHistory({
        id: Date.now().toString(),
        type: 'chart',
        fileName: fileName || "图表分析",
        timestamp: Date.now(),
        content: result,
        sourcePreview: base64
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "分析图表时出错");
    } finally {
      setIsChartAnalyzing(false);
    }
  };

  const handleSendMessage = async () => {
      if (!chatInput.trim() || !pdfFile) return;

      const newUserMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: Date.now() };
      const updatedMessages = [...chatMessages, newUserMsg];
      
      setChatMessages(updatedMessages);
      setChatInput("");
      setIsChatting(true);

      try {
          const answer = await chatWithPaper(pdfFile, chatMessages, newUserMsg.text);
          const newModelMsg: ChatMessage = { role: 'model', text: answer, timestamp: Date.now() };
          const finalMessages = [...updatedMessages, newModelMsg];
          setChatMessages(finalMessages);

          // Save chat session to history
          // Use a consistent ID for the current file if possible, or create a new entry if it's a new session.
          // For simplicity, we create a new entry or update the most recent 'chat' entry if it matches this file?
          // Simplest: Just save a new entry with current timestamp ID, or reuse an ID if we stored one in state.
          // Let's use fileName + "chat" as a loose key or just create a new record.
          
          saveToHistory({
              id: `chat-${fileName}-${Date.now()}`, // Unique ID for this snapshot, or could be persistent ID
              type: 'chat',
              fileName: fileName || "对话记录",
              timestamp: Date.now(),
              content: finalMessages
          });

      } catch (err) {
          console.error(err);
          // Add error message to chat
          setChatMessages(prev => [...prev, { role: 'model', text: "抱歉，回答出错，请稍后重试。", timestamp: Date.now() }]);
      } finally {
          setIsChatting(false);
      }
  };

  const loadHistoryItem = (item: PaperHistoryItem) => {
    if (item.type === 'note') {
      setSubTab('read');
      setReadResult(item.content as string);
      setFileName(item.fileName || "历史记录");
    } else if (item.type === 'chart') {
      setSubTab('chart');
      setChartResult(item.content as string);
      setChartImage(item.sourcePreview || null);
    } else if (item.type === 'chat') {
      setSubTab('qa');
      setChatMessages(item.content as ChatMessage[]);
      setFileName(item.fileName || "历史对话");
      // Note: We cannot continue the chat unless pdfFile is loaded.
    }
  };

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    localStorage.setItem('mathsnap_history', JSON.stringify(newHistory));
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderMarkdown = (content: string) => (
    <article className="prose prose-slate prose-sm md:prose-base max-w-none prose-headings:text-brand-900 prose-a:text-brand-600 prose-p:leading-relaxed prose-li:marker:text-slate-400">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </article>
  );

  // If no file is selected and we are not in history, show upload screen
  // Modified to allow viewing history even if no file, but initial state is empty
  if (!pdfFile && subTab !== 'history' && !readResult && chatMessages.length === 0) {
     return (
        <div className="flex flex-col items-center justify-center h-full p-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-full max-w-2xl space-y-8">
                 <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-100 text-brand-600 mb-4">
                        <Bot className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900">AI 论文精读助手</h2>
                    <p className="text-slate-500 text-lg">上传 PDF 论文，自动生成精读笔记，支持图表解析与智能问答</p>
                 </div>
                 
                 <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <PdfInput 
                        onFileSelect={handlePdfSelect} 
                        fileName={fileName}
                        isAnalyzing={isAnalyzing}
                        onClear={() => { setPdfFile(null); setFileName(null); }}
                    />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <FileText className="w-4 h-4 text-brand-500" /> 自动生成结构化笔记
                    </div>
                    <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <PieChart className="w-4 h-4 text-brand-500" /> 图表/公式精准识别
                    </div>
                    <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <MessageSquare className="w-4 h-4 text-brand-500" /> 对话式智能问答
                    </div>
                 </div>
            </div>
        </div>
     );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Sub-Header / Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between flex-shrink-0 z-10 shadow-sm">
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
           <button
             onClick={() => setSubTab('read')}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${subTab === 'read' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
           >
             <BookOpen className="w-4 h-4" /> 精读笔记
           </button>
           <button
             onClick={() => setSubTab('qa')}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${subTab === 'qa' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
           >
             <MessageSquare className="w-4 h-4" /> 问答助手
           </button>
           <button
             onClick={() => setSubTab('chart')}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${subTab === 'chart' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
           >
             <PieChart className="w-4 h-4" /> 图表解析
           </button>
           <button
             onClick={() => setSubTab('history')}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${subTab === 'history' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
           >
             <History className="w-4 h-4" /> 历史记录
           </button>
        </div>

        {pdfFile && subTab !== 'history' && (
             <div className="flex items-center gap-3">
                 <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200 max-w-[150px] truncate hidden md:inline-block" title={fileName || ''}>
                    {fileName}
                 </span>
                 <button 
                    onClick={() => { setPdfFile(null); setReadResult(""); setChartResult(""); setChatMessages([]); }}
                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                 >
                    重新上传
                 </button>
             </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-grow flex overflow-hidden relative">
        
        {/* --- READ TAB (Notes Only) --- */}
        {subTab === 'read' && (
            <div className="w-full h-full flex justify-center bg-white overflow-y-auto custom-scrollbar">
                <div className="w-full max-w-4xl p-6 md:p-10">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-1">{fileName || "精读笔记"}</h2>
                            <p className="text-sm text-slate-400">AI 自动生成的结构化阅读笔记</p>
                        </div>
                        {readResult && (
                            <button
                                onClick={() => handleCopy(readResult)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                {copied ? "已复制" : "复制 Markdown"}
                            </button>
                        )}
                    </div>
                    
                    {error && (
                        <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                    
                    {isAnalyzing ? (
                        <div className="space-y-4 animate-in fade-in">
                            <div className="h-3 bg-slate-100 rounded w-3/4"></div>
                            <div className="h-3 bg-slate-100 rounded w-full"></div>
                            <div className="h-3 bg-slate-100 rounded w-5/6"></div>
                            <div className="h-24 bg-slate-100 rounded-xl"></div>
                            <div className="flex flex-col gap-3">
                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                    <div
                                      className="h-2 bg-brand-500 transition-all"
                                      style={{ width: `${Math.min(progress?.percent ?? 10, 98)}%` }}
                                    />
                                </div>
                                <p className="text-slate-500 text-sm">
                                  {progress?.message || "正在处理..."}
                                </p>
                            </div>
                        </div>
                    ) : readResult ? (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {renderMarkdown(readResult)}
                        </div>
                    ) : (
                        <div className="text-center py-20 text-slate-400">
                            <p>暂无内容，请重新上传论文</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* --- QA TAB (Chat with Paper) --- */}
        {subTab === 'qa' && (
             <div className="flex w-full h-full flex-col md:flex-row bg-white">
                {/* Left: PDF Viewer (Context) */}
                <div className="hidden md:flex w-full md:w-[50%] border-r border-slate-200 bg-slate-200 flex-col relative">
                     {pdfPreviewUrl ? (
                         <PdfViewer url={pdfPreviewUrl} />
                     ) : (
                         <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
                             <FileText className="w-12 h-12 mb-4 opacity-30" />
                             <p>请上传 PDF 以查看原文对照</p>
                             <p className="text-xs mt-2">如果您正在查看历史记录且未加载原文件，这里将显示为空</p>
                         </div>
                     )}
                </div>

                {/* Right: Chat Interface */}
                <div className="w-full md:w-[50%] flex flex-col h-full bg-slate-50">
                    <div className="flex-grow overflow-y-auto p-4 custom-scrollbar space-y-4">
                        {chatMessages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                                <MessageSquare className="w-12 h-12 mb-4" />
                                <p>针对论文内容，随时提问</p>
                            </div>
                        ) : (
                            chatMessages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`
                                        max-w-[85%] rounded-2xl p-4 text-sm shadow-sm
                                        ${msg.role === 'user' 
                                            ? 'bg-brand-600 text-white rounded-br-none' 
                                            : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'}
                                    `}>
                                        {msg.role === 'user' ? (
                                            <p>{msg.text}</p>
                                        ) : (
                                            <div className="prose prose-sm prose-slate max-w-none prose-p:my-1 prose-headings:my-2">
                                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                    {msg.text}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="p-4 bg-white border-t border-slate-200">
                        {pdfFile ? (
                            <div className="flex gap-2 relative">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !isChatting && handleSendMessage()}
                                    placeholder="输入关于论文的问题..."
                                    className="flex-grow px-4 py-3 bg-slate-100 rounded-xl border-transparent focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-all outline-none text-sm"
                                    disabled={isChatting}
                                />
                                <button 
                                    onClick={handleSendMessage}
                                    disabled={!chatInput.trim() || isChatting}
                                    className="p-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex-shrink-0"
                                >
                                    {isChatting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
                                </button>
                            </div>
                        ) : (
                            <div className="text-center text-sm text-slate-500 py-2 bg-slate-50 rounded-lg border border-slate-100">
                                请先上传 PDF 才能进行 AI 问答
                            </div>
                        )}
                    </div>
                </div>
             </div>
        )}

        {/* --- CHART TAB (Split View: PDF Left, Input Right) --- */}
        {subTab === 'chart' && (
            <div className="flex w-full h-full flex-col md:flex-row bg-white">
                 {/* Left: PDF Viewer */}
                 <div className="w-full md:w-[60%] border-r border-slate-200 bg-slate-200 flex flex-col h-[50vh] md:h-full relative group">
                    {pdfPreviewUrl ? (
                        <>
                             {/* Replaced iframe with custom PdfViewer */}
                             <PdfViewer url={pdfPreviewUrl} />
                             
                              {/* Hint Overlay */}
                              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur text-white px-4 py-2 rounded-full text-xs md:text-sm font-medium flex items-center gap-2 shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 whitespace-nowrap">
                                <Crop className="w-4 h-4" />
                                <span>使用系统截图框选图表 → 粘贴到右侧</span>
                              </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                             {pdfFile ? (
                                <div className="text-center">
                                    <p>正在生成预览...</p>
                                </div>
                             ) : (
                                "请先上传 PDF"
                             )}
                        </div>
                    )}
                 </div>

                 {/* Right: Analysis Interaction */}
                 <div className="w-full md:w-[40%] bg-white flex flex-col h-[50vh] md:h-full overflow-hidden">
                    {/* Input Area (Fixed at top) */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50/30">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <PieChart className="w-4 h-4 text-brand-600" />
                            <span>图表截图分析</span>
                        </div>
                        <ImageInput 
                            onImageSelect={handleChartSelect}
                            selectedImage={chartImage}
                            isAnalyzing={isChartAnalyzing}
                            onClear={() => { setChartImage(null); setChartResult(""); }}
                        />
                    </div>

                    {/* Result Area (Scrollable) */}
                    <div className="flex-grow overflow-y-auto p-4 custom-scrollbar bg-white">
                        {isChartAnalyzing ? (
                            <div className="flex flex-col items-center justify-center h-48 space-y-4">
                                <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                                <p className="text-slate-500 text-sm font-medium animate-pulse">正在解析图表数据...</p>
                            </div>
                        ) : chartResult ? (
                            <div className="animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">分析结果</span>
                                    <button onClick={() => handleCopy(chartResult)} className="text-slate-400 hover:text-brand-600">
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                                {renderMarkdown(chartResult)}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-300 space-y-3">
                                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
                                    <Crop className="w-6 h-6 opacity-30" />
                                </div>
                                <div className="text-center text-sm">
                                    <p>1. 使用截图工具框选左侧图表</p>
                                    <p>2. 在上方输入框粘贴 (Ctrl+V)</p>
                                </div>
                            </div>
                        )}
                        {error && <p className="text-red-500 mt-4 text-sm bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
                    </div>
                 </div>
            </div>
        )}

        {/* --- HISTORY TAB --- */}
        {subTab === 'history' && (
            <div className="w-full h-full overflow-y-auto bg-slate-50 p-6 md:p-10 custom-scrollbar">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                         <h2 className="text-2xl font-bold text-slate-800">历史记录</h2>
                         <button 
                            onClick={() => { setHistory([]); localStorage.removeItem('mathsnap_history'); }}
                            className="text-sm text-red-500 hover:text-red-700 px-3 py-1 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                         >
                            清空历史
                         </button>
                    </div>

                    {history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                            <History className="w-16 h-16 mb-4 opacity-20" />
                            <p>暂无历史记录</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {history.map(item => (
                                <div 
                                    key={item.id} 
                                    className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-shadow"
                                >
                                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center cursor-pointer" onClick={() => loadHistoryItem(item)}>
                                        <div className="flex items-center gap-3">
                                            <div className={`
                                                p-2 rounded-lg 
                                                ${item.type === 'note' ? 'bg-blue-100 text-blue-600' : ''}
                                                ${item.type === 'chart' ? 'bg-purple-100 text-purple-600' : ''}
                                                ${item.type === 'chat' ? 'bg-green-100 text-green-600' : ''}
                                            `}>
                                                {item.type === 'note' && <FileText className="w-5 h-5" />}
                                                {item.type === 'chart' && <PieChart className="w-5 h-5" />}
                                                {item.type === 'chat' && <MessageSquare className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">
                                                    {item.type === 'note' && (item.fileName || '未命名论文')}
                                                    {item.type === 'chart' && '图表分析'}
                                                    {item.type === 'chat' && `对话: ${item.fileName || '未命名'}`}
                                                </h4>
                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={(e) => deleteHistoryItem(e, item.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="删除"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <div className="p-2 text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ArrowRight className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </div>
                                    {/* Preview Content */}
                                    <div className="p-5 max-h-48 overflow-hidden relative">
                                        <div className="mask-image-b-fade">
                                            {item.type === 'chat' ? (
                                                <div className="space-y-2">
                                                    {(item.content as ChatMessage[]).slice(-2).map((msg, i) => (
                                                        <div key={i} className="text-sm">
                                                            <span className={`font-semibold ${msg.role === 'user' ? 'text-brand-600' : 'text-slate-600'}`}>
                                                                {msg.role === 'user' ? '我: ' : 'AI: '}
                                                            </span>
                                                            <span className="text-slate-500 truncate">{msg.text.substring(0, 100)}...</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                renderMarkdown(item.content as string)
                                            )}
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                                    </div>
                                    <div className="bg-slate-50 p-2 text-center border-t border-slate-100">
                                        <button 
                                            onClick={() => loadHistoryItem(item)}
                                            className="text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors w-full py-1"
                                        >
                                            查看完整内容
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
