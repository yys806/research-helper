import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

// Configure pdf.js worker (Vite will handle bundling)
// Note: pdfjs-dist >=4 uses esm worker path
try {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
} catch (e) {
  // Fallback silently; pdfjs will try default worker
  console.warn("pdfjs worker set failed", e);
}

export const extractPdfText = async (base64: string): Promise<{ text: string; pages: number }> => {
  const data = base64.startsWith("data:")
    ? atob(base64.split(",")[1] ?? "")
    : atob(base64);

  const bytes = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) bytes[i] = data.charCodeAt(i);

  const pdf = await getDocument({ data: bytes }).promise;
  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((it: any) => it.str).join(" ");
    fullText += `\n\n[Page ${pageNum}]\n${pageText}`;
  }

  return { text: fullText.trim(), pages: pdf.numPages };
};

