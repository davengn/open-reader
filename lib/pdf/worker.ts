import { GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

const WORKER_SRC = "/pdf.worker.min.mjs";

export function configurePdfWorker() {
  if (typeof window === "undefined") {
    return;
  }

  if (GlobalWorkerOptions.workerSrc !== WORKER_SRC) {
    GlobalWorkerOptions.workerSrc = WORKER_SRC;
  }
}

export function getPdfWorkerSrc() {
  return WORKER_SRC;
}
