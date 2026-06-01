import { getDocument, type PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { configurePdfWorker } from "@/lib/pdf/worker";

export async function loadPdfDocument(url: string): Promise<PDFDocumentProxy> {
  configurePdfWorker();

  const loadingTask = getDocument({
    url,
    disableAutoFetch: false,
    disableStream: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  return loadingTask.promise;
}
