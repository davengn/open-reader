declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  export const GlobalWorkerOptions: {
    workerSrc: string;
  };

  export type TextItem = {
    str?: string;
  };

  export type TextContent = {
    items: TextItem[];
  };

  export type PageViewport = {
    width: number;
    height: number;
  };

  export type RenderTask = {
    promise: Promise<void>;
    cancel(): void;
  };

  export type RefProxy = {
    num: number;
    gen: number;
  };

  export type PDFDestination = [number | RefProxy, ...unknown[]];

  export type PDFOutlineNode = {
    title: string;
    bold: boolean;
    italic: boolean;
    color: Uint8ClampedArray;
    dest: string | PDFDestination | null;
    url: string | null;
    unsafeUrl?: string;
    newWindow?: boolean;
    count?: number;
    items: PDFOutlineNode[];
  };

  export type PDFPageProxy = {
    getViewport(options: { scale: number }): PageViewport;
    getTextContent(): Promise<TextContent>;
    render(options: { canvasContext: CanvasRenderingContext2D; viewport: PageViewport }): RenderTask;
    cleanup(): void;
  };

  export type PDFDocumentProxy = {
    numPages: number;
    getMetadata(): Promise<{ info?: Record<string, unknown> }>;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
    getPageIndex(ref: RefProxy): Promise<number>;
    getDestination(id: string): Promise<PDFDestination | null>;
    getOutline(): Promise<PDFOutlineNode[] | null>;
    destroy(): Promise<void>;
  };

  export function getDocument(options: unknown): {
    promise: Promise<PDFDocumentProxy>;
  };

  export class TextLayer {
    constructor(options: {
      textContentSource: TextContent;
      container: HTMLElement;
      viewport: PageViewport;
    });
    render(): Promise<void>;
    cancel(): void;
  }
}
