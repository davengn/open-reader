declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  export function getDocument(options: unknown): {
    promise: Promise<{
      numPages: number;
      getMetadata(): Promise<{ info?: Record<string, unknown> }>;
      getPage(pageNumber: number): Promise<{
        getTextContent(): Promise<{ items: Array<{ str?: string }> }>;
        cleanup(): void;
      }>;
      destroy(): Promise<void>;
    }>;
  };
}
