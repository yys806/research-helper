import React, { useEffect, useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2, AlertCircle } from 'lucide-react';

// Initialize worker with the specific version matching our importmap
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

interface PdfViewerProps {
  url: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ url }) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        // Using the blob URL directly
        const loadingTask = pdfjsLib.getDocument(url);
        const doc = await loadingTask.promise;
        if (active) {
          setPdfDoc(doc);
          setLoading(false);
        }
      } catch (err) {
        console.error("PDF Load Error:", err);
        if (active) {
            setError("无法加载 PDF 预览。");
            setLoading(false);
        }
      }
    };

    if (url) loadPdf();
    
    return () => { active = false; };
  }, [url]);

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-brand-500" />
              <p>正在渲染 PDF...</p>
          </div>
      )
  }

  if (error || !pdfDoc) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6 text-center">
              <AlertCircle className="w-8 h-8 mb-2 text-red-400" />
              <p>{error || "加载失败"}</p>
          </div>
      )
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-200/50 p-4 custom-scrollbar">
       <div className="flex flex-col gap-4 items-center min-h-full">
         {Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1).map((pageNum) => (
            <PdfPage key={pageNum} pdfDoc={pdfDoc} pageNum={pageNum} />
         ))}
       </div>
    </div>
  );
};

const PdfPage: React.FC<{ pdfDoc: any; pageNum: number }> = ({ pdfDoc, pageNum }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Intersection Observer to render only when visible to save memory
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '500px' } 
        );
        
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible || !pdfDoc || !canvasRef.current) return;

        let renderTask: any = null;

        const render = async () => {
            try {
                const page = await pdfDoc.getPage(pageNum);
                // Scale 1.5 usually provides good reading quality
                const viewport = page.getViewport({ scale: 1.5 }); 
                const canvas = canvasRef.current;
                if (!canvas) return;

                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };
                
                renderTask = page.render(renderContext);
                await renderTask.promise;
            } catch (e) {
                // Ignore render cancellations
            }
        };

        render();

        return () => {
            if (renderTask) renderTask.cancel();
        };
    }, [isVisible, pdfDoc, pageNum]);

    return (
        <div ref={containerRef} className="bg-white shadow-lg rounded-sm w-full max-w-[800px] min-h-[400px] flex justify-center relative">
             <canvas ref={canvasRef} className="max-w-full h-auto block" />
             <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded opacity-50">
                {pageNum}
             </span>
        </div>
    );
};