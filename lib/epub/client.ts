/**
 * Dynamically imports epubjs in the browser.
 * This prevents server-side rendering (SSR) errors in Next.js.
 */
export async function getEpubjs() {
  if (typeof window === "undefined") {
    throw new Error("epubjs is a client-only library and cannot be loaded on the server.");
  }
  const module = await import("epubjs");
  const ePub = module.default;
  (window as any).ePub = ePub;
  return ePub;
}

/**
 * Fetches the EPUB book file as an ArrayBuffer from the API.
 */
export async function fetchEpubArrayBuffer(bookId: string): Promise<ArrayBuffer> {
  const response = await fetch(`/api/books/${bookId}/file`);
  if (!response.ok) {
    throw new Error(`Failed to fetch book file: ${response.status} ${response.statusText}`);
  }
  return response.arrayBuffer();
}
