import { GlobalWorkerOptions } from "pdfjs-dist";

// 统一配置 pdf.js worker(pdfjs-dist >= 4 使用 esm worker)。
// Vite 会在构建时将 worker 打包为本地资源,避免运行时依赖外部 CDN。
try {
  GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
} catch (e) {
  // Fallback silently; pdfjs will try default worker
  console.warn("pdfjs worker set failed", e);
}
