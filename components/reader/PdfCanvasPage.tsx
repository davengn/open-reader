"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { TextLayer, type PDFDocumentProxy, type RenderTask } from "pdfjs-dist/legacy/build/pdf.mjs";
import { HighlightLayer } from "@/components/reader/HighlightLayer";
import { ScannedPageBanner } from "@/components/reader/ScannedPageBanner";
import { normalizeSelectionRects, type RectLike } from "@/lib/reader/highlightRects";
import type { PdfRenderStatus, ReaderHighlight, SelectionDraft } from "@/lib/types/reader";

type PdfCanvasPageProps = {
  pdfDoc: PDFDocumentProxy | null;
  pageNumber: number;
  zoom: number;
  highlights: ReaderHighlight[];
  onSelectionDraft: (draft: SelectionDraft | null) => void;
  onHighlightSelect: (highlight: ReaderHighlight, x: number, y: number) => void;
  onRenderedSize?: (pageNumber: number, size: PageSize) => void;
};

type PageSize = {
  width: number;
  height: number;
};

export function PdfCanvasPage({
  pdfDoc,
  pageNumber,
  zoom,
  highlights,
  onSelectionDraft,
  onHighlightSelect,
  onRenderedSize,
}: PdfCanvasPageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [pageSize, setPageSize] = useState<PageSize | null>(null);
  const [status, setStatus] = useState<PdfRenderStatus>("loading");

  useEffect(() => {
    if (!pdfDoc) {
      return;
    }

    const document = pdfDoc;
    let cancelled = false;
    let renderTask: RenderTask | null = null;
    let textLayer: TextLayer | null = null;

    async function renderPage() {
      const canvas = canvasRef.current;
      const textLayerElement = textLayerRef.current;
      if (!canvas || !textLayerElement) {
        return;
      }

      setStatus("loading");
      onSelectionDraft(null);
      textLayerElement.replaceChildren();

      try {
        const page = await document.getPage(pageNumber);
        if (cancelled) {
          page.cleanup();
          return;
        }

        const viewport = page.getViewport({ scale: zoom });
        const pixelRatio = window.devicePixelRatio || 1;
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) {
          throw new Error("Canvas context unavailable");
        }

        const nextPageSize = { width: viewport.width, height: viewport.height };
        setPageSize(nextPageSize);
        onRenderedSize?.(pageNumber, nextPageSize);
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, viewport.width, viewport.height);

        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;

        const textContent = await page.getTextContent();
        if (cancelled) {
          page.cleanup();
          return;
        }

        const hasText = textContent.items.some((item) => typeof item.str === "string" && item.str.trim().length > 0);
        textLayerElement.style.width = `${viewport.width}px`;
        textLayerElement.style.height = `${viewport.height}px`;
        textLayer = new TextLayer({
          textContentSource: textContent,
          container: textLayerElement,
          viewport,
        });
        await textLayer.render();

        if (!cancelled) {
          setStatus(hasText ? "ready" : "scanned");
        }
        page.cleanup();
      } catch (error) {
        if (!cancelled && !isRenderCancellation(error)) {
          setStatus("error");
        }
      }
    }

    void renderPage();

    return () => {
      cancelled = true;
      renderTask?.cancel();
      textLayer?.cancel();
    };
  }, [pdfDoc, pageNumber, zoom, onRenderedSize, onSelectionDraft]);

  function captureSelection(event: React.MouseEvent) {
    if (status === "scanned" || status === "error") {
      return;
    }

    const selection = window.getSelection();
    const pageElement = pageRef.current;
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed || !pageElement) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!pageElement.contains(range.commonAncestorContainer)) {
      return;
    }

    const text = selection.toString().replace(/\s+/g, " ").trim();
    if (!text) {
      return;
    }

    const rects = normalizeSelectionRects(
      Array.from(range.getClientRects()).map(domRectToRectLike),
      pageElement.getBoundingClientRect(),
    );

    if (rects.length === 0) {
      return;
    }

    onSelectionDraft({
      page: pageNumber,
      text,
      rects,
      anchorX: event.clientX,
      anchorY: event.clientY,
    });
  }

  const style = pageSize ? { width: pageSize.width, height: pageSize.height } : undefined;

  return (
    <section className="pdf-page-wrap" aria-label={`Page ${pageNumber}`}>
      {status === "scanned" ? <ScannedPageBanner /> : null}
      <div ref={pageRef} className={`pdf-page status-${status}`} style={style} onMouseUp={captureSelection}>
        {status === "loading" ? (
          <div className="pdf-page-placeholder" role="status">
            <Loader2 className="inline-icon spinner" aria-hidden="true" />
            <span>Loading page</span>
          </div>
        ) : null}
        {status === "error" ? (
          <div className="pdf-page-placeholder error" role="alert">
            <AlertTriangle className="inline-icon" aria-hidden="true" />
            <span>This page could not be rendered.</span>
          </div>
        ) : null}
        <canvas ref={canvasRef} className="pdf-canvas" />
        <div ref={textLayerRef} className="textLayer pdf-text-layer" />
        <HighlightLayer highlights={highlights} onSelect={onHighlightSelect} />
      </div>
    </section>
  );
}

function domRectToRectLike(rect: DOMRect): RectLike {
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

function isRenderCancellation(error: unknown) {
  return error instanceof Error && /cancel/i.test(error.name || error.message);
}
