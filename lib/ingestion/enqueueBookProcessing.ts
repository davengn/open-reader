import { processBook } from "@/lib/ingestion/processBook";

const inFlight = new Set<string>();

export function enqueueBookProcessing(bookId: string) {
  if (inFlight.has(bookId)) {
    return;
  }

  inFlight.add(bookId);
  setTimeout(() => {
    processBook(bookId)
      .catch((error) => {
        console.error("Book processing failed", error);
      })
      .finally(() => {
        inFlight.delete(bookId);
      });
  }, 0);
}

export function isBookProcessing(bookId: string) {
  return inFlight.has(bookId);
}
