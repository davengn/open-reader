"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, Columns, Loader2 } from "lucide-react";
import { HighlightColorPicker } from "@/components/reader/HighlightColorPicker";
import { HighlightTooltip } from "@/components/reader/HighlightTooltip";
import { PageControls } from "@/components/reader/PageControls";
import { PdfCanvasPage } from "@/components/reader/PdfCanvasPage";
import { ReaderHeader } from "@/components/reader/ReaderHeader";
import { ReaderNavigationPanel } from "@/components/reader/ReaderNavigationPanel";
import { ZoomControl } from "@/components/reader/ZoomControl";
import { Button } from "@/components/ui/button";
import { updateProgress } from "@/app/book/[id]/actions";
import { loadPdfBookmarks } from "@/lib/pdf/bookmarks";
import { loadPdfDocument } from "@/lib/pdf/client";
import { getContinuousPageWindow, getPdfPageNumbers } from "@/lib/reader/pageWindow";
import { calculatePdfProgress, clampPdfPage, parsePageInput } from "@/lib/reader/progress";
import { loadStoredZoom, normalizeZoom, saveStoredZoom, type ReaderZoom } from "@/lib/reader/zoom";
import type { HighlightColor, ReaderBookmark, ReaderHighlight, SelectionDraft } from "@/lib/types/reader";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";

type PdfReaderClientProps = {
  bookId: string;
  title: string;
  author: string;
  pdfUrl: string;
  initialPage: number;
  initialTotalPages: number | null;
};

type TooltipState = {
  highlight: ReaderHighlight;
  x: number;
  y: number;
};

type PageSize = {
  width: number;
  height: number;
};

type HighlightMap = Record<number, ReaderHighlight[]>;
type PageSizeMap = Record<number, PageSize>;

const DEFAULT_PAGE_SIZE = {
  width: 612,
  height: 792,
};

export function PdfReaderClient({
  bookId,
  title,
  author,
  pdfUrl,
  initialPage,
  initialTotalPages,
}: PdfReaderClientProps) {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(initialTotalPages);
  const [currentPage, setCurrentPage] = useState(() =>
    initialTotalPages ? clampPdfPage(initialPage, initialTotalPages) : Math.max(1, initialPage),
  );
  const [pageInput, setPageInput] = useState(String(currentPage));
  const [zoom, setZoom] = useState<ReaderZoom>(1);
  const [selectionDraft, setSelectionDraft] = useState<SelectionDraft | null>(null);
  const [highlightsByPage, setHighlightsByPage] = useState<HighlightMap>({});
  const [pageSizes, setPageSizes] = useState<PageSizeMap>({});
  const [bookmarks, setBookmarks] = useState<ReaderBookmark[]>([]);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);
  const [hasRestoredInitialPosition, setHasRestoredInitialPosition] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const lastWidthRef = useRef(260);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prevOpen) => {
      const nextOpen = !prevOpen;
      if (nextOpen) {
        setSidebarWidth(lastWidthRef.current);
      } else {
        lastWidthRef.current = sidebarWidth > 0 ? sidebarWidth : lastWidthRef.current;
        setSidebarWidth(0);
      }
      return nextOpen;
    });
  }, [sidebarWidth]);

  const startResizing = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if ("preventDefault" in event) {
      event.preventDefault();
    }
    setIsResizing(true);
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    const newWidth = mouseMoveEvent.clientX;
    if (newWidth < 150) {
      setSidebarWidth(0);
      setSidebarOpen(false);
    } else if (newWidth <= 500) {
      setSidebarWidth(newWidth);
      lastWidthRef.current = newWidth;
      setSidebarOpen(true);
    }
  }, []);

  const resizeTouch = useCallback((touchMoveEvent: TouchEvent) => {
    const touch = touchMoveEvent.touches[0];
    if (touch) {
      const newWidth = touch.clientX;
      if (newWidth < 150) {
        setSidebarWidth(0);
        setSidebarOpen(false);
      } else if (newWidth <= 500) {
        setSidebarWidth(newWidth);
        lastWidthRef.current = newWidth;
        setSidebarOpen(true);
      }
    }
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
      window.addEventListener("touchmove", resizeTouch, { passive: true });
      window.addEventListener("touchend", stopResizing);
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      window.removeEventListener("touchmove", resizeTouch);
      window.removeEventListener("touchend", stopResizing);
    }

    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      window.removeEventListener("touchmove", resizeTouch);
      window.removeEventListener("touchend", stopResizing);
    };
  }, [isResizing, resize, resizeTouch, stopResizing]);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pageSlotRefs = useRef(new Map<number, HTMLElement>());
  const pendingScrollPageRef = useRef<number | null>(currentPage);
  const observedCurrentPageRef = useRef(currentPage);
  const progressSnapshotRef = useRef({
    bookId,
    currentPage,
    totalPages,
    hasRestoredInitialPosition: false,
  });
  const [, startTransition] = useTransition();

  const progressSummary = useMemo(() => {
    if (!totalPages) {
      return "0%";
    }

    return `${calculatePdfProgress(currentPage, totalPages)}%`;
  }, [currentPage, totalPages]);

  const pageNumbers = useMemo(() => getPdfPageNumbers(totalPages), [totalPages]);

  const renderedPages = useMemo(() => {
    if (!totalPages) {
      return [];
    }

    return getContinuousPageWindow(currentPage, totalPages);
  }, [currentPage, totalPages]);

  const renderedPageSet = useMemo(() => new Set(renderedPages), [renderedPages]);

  const setPageSlotRef = useCallback((pageNumber: number, node: HTMLElement | null) => {
    if (node) {
      pageSlotRefs.current.set(pageNumber, node);
      return;
    }

    pageSlotRefs.current.delete(pageNumber);
  }, []);

  const scrollPageIntoView = useCallback((pageNumber: number) => {
    pageSlotRefs.current.get(pageNumber)?.scrollIntoView({ block: "start", inline: "nearest" });
  }, []);

  const flushProgressBeforeLeaving = useCallback(() => {
    const snapshot = progressSnapshotRef.current;
    if (!snapshot.totalPages || !snapshot.hasRestoredInitialPosition) {
      return;
    }

    const nextPage = clampPdfPage(snapshot.currentPage, snapshot.totalPages);
    const percentage = calculatePdfProgress(nextPage, snapshot.totalPages);
    const url = `/api/books/${encodeURIComponent(snapshot.bookId)}/progress`;
    const body = JSON.stringify({
      currentPage: nextPage,
      totalPages: snapshot.totalPages,
      percentage,
    });

    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      if (sent) {
        return;
      }
    }

    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  const goToPage = useCallback(
    (page: number) => {
      if (!totalPages) {
        return;
      }

      const nextPage = clampPdfPage(page, totalPages);
      pendingScrollPageRef.current = nextPage;
      observedCurrentPageRef.current = nextPage;
      setCurrentPage(nextPage);
    },
    [totalPages],
  );

  const fetchHighlightsForPage = useCallback(
    async (page: number) => {
      if (!totalPages) {
        return;
      }

      const response = await fetch(`/api/highlights?bookId=${encodeURIComponent(bookId)}&page=${page}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        setHighlightsByPage((current) => ({ ...current, [page]: [] }));
        return;
      }

      const payload = (await response.json()) as { highlights?: ReaderHighlight[] };
      setHighlightsByPage((current) => ({ ...current, [page]: payload.highlights ?? [] }));
    },
    [bookId, totalPages],
  );

  const handleRenderedSize = useCallback((pageNumber: number, size: PageSize) => {
    setPageSizes((current) => {
      const existing = current[pageNumber];
      if (existing?.width === size.width && existing.height === size.height) {
        return current;
      }

      return { ...current, [pageNumber]: size };
    });
  }, []);

  useEffect(() => {
    observedCurrentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    progressSnapshotRef.current = {
      bookId,
      currentPage,
      totalPages,
      hasRestoredInitialPosition,
    };
  }, [bookId, currentPage, hasRestoredInitialPosition, totalPages]);

  useEffect(() => {
    setZoom(loadStoredZoom(window.localStorage));
  }, []);

  useEffect(() => {
    saveStoredZoom(window.localStorage, zoom);
    setPageSizes({});
  }, [zoom]);

  useEffect(() => {
    let cancelled = false;
    let loadedDocument: PDFDocumentProxy | null = null;

    async function loadDocument() {
      setLoadError(null);
      setHasRestoredInitialPosition(false);
      setBookmarks([]);
      setIsLoadingBookmarks(false);
      try {
        loadedDocument = await loadPdfDocument(pdfUrl);
        if (cancelled) {
          await loadedDocument.destroy();
          return;
        }

        const nextTotal = loadedDocument.numPages;
        setPdfDoc(loadedDocument);
        setTotalPages(nextTotal);
        setCurrentPage((page) => {
          const restoredPage = clampPdfPage(page, nextTotal);
          pendingScrollPageRef.current = restoredPage;
          observedCurrentPageRef.current = restoredPage;
          return restoredPage;
        });
      } catch {
        if (!cancelled) {
          setLoadError("The PDF could not be opened.");
        }
      }
    }

    void loadDocument();

    return () => {
      cancelled = true;
      if (loadedDocument) {
        void loadedDocument.destroy();
      }
    };
  }, [pdfUrl]);

  useEffect(() => {
    if (!pdfDoc || !totalPages) {
      setBookmarks([]);
      setIsLoadingBookmarks(false);
      return;
    }

    let cancelled = false;
    setIsLoadingBookmarks(true);

    void loadPdfBookmarks(pdfDoc, totalPages)
      .then((items) => {
        if (!cancelled) {
          setBookmarks(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBookmarks([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingBookmarks(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, totalPages]);

  useEffect(() => {
    setPageInput(String(currentPage));
    setSelectionDraft(null);
    setTooltip(null);
  }, [currentPage]);

  useEffect(() => {
    for (const page of renderedPages) {
      void fetchHighlightsForPage(page);
    }
  }, [fetchHighlightsForPage, renderedPages]);

  useEffect(() => {
    function refetchOnFocus() {
      for (const page of renderedPages) {
        void fetchHighlightsForPage(page);
      }
    }

    window.addEventListener("focus", refetchOnFocus);
    return () => window.removeEventListener("focus", refetchOnFocus);
  }, [fetchHighlightsForPage, renderedPages]);

  useEffect(() => {
    if (!totalPages || !hasRestoredInitialPosition) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const percentage = calculatePdfProgress(currentPage, totalPages);
      startTransition(() => {
        void updateProgress({
          bookId,
          currentPage,
          totalPages,
          percentage,
        }).catch(() => undefined);
      });
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [bookId, currentPage, hasRestoredInitialPosition, totalPages, startTransition]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        flushProgressBeforeLeaving();
      }
    }

    window.addEventListener("pagehide", flushProgressBeforeLeaving);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      flushProgressBeforeLeaving();
      window.removeEventListener("pagehide", flushProgressBeforeLeaving);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flushProgressBeforeLeaving]);

  useEffect(() => {
    if (!pdfDoc || !totalPages) {
      return;
    }

    const scheduleIdle = window.requestIdleCallback ?? ((callback) => window.setTimeout(callback, 250));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = scheduleIdle(() => {
      for (const page of [currentPage - 1, currentPage + 1]) {
        if (page >= 1 && page <= totalPages) {
          void pdfDoc.getPage(page).then((pdfPage) => {
            pdfPage.cleanup();
          });
        }
      }
    });

    return () => cancelIdle(handle);
  }, [currentPage, pdfDoc, totalPages]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const isEditing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (event.key === "Escape") {
        setSelectionDraft(null);
        setTooltip(null);
        return;
      }

      if (isEditing) {
        return;
      }

      if (event.key === "ArrowRight" || event.key.toLowerCase() === "j") {
        event.preventDefault();
        goToPage(currentPage + 1);
      }

      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "k") {
        event.preventDefault();
        goToPage(currentPage - 1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, goToPage]);

  useEffect(() => {
    if (!totalPages || !scrollContainerRef.current) {
      return;
    }

    const root = scrollContainerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (pendingScrollPageRef.current) {
          return;
        }

        const rootRect = root.getBoundingClientRect();
        const rootCenter = rootRect.top + rootRect.height * 0.42;
        const visiblePages = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => {
            const pageNumber = Number((entry.target as HTMLElement).dataset.pageNumber);
            const pageCenter = entry.boundingClientRect.top + entry.boundingClientRect.height / 2;
            return {
              pageNumber,
              distance: Math.abs(pageCenter - rootCenter),
            };
          })
          .filter((entry) => Number.isInteger(entry.pageNumber));

        visiblePages.sort((a, b) => a.distance - b.distance);
        const nextPage = visiblePages[0]?.pageNumber;
        if (nextPage && nextPage !== observedCurrentPageRef.current) {
          observedCurrentPageRef.current = nextPage;
          setCurrentPage(nextPage);
        }
      },
      {
        root,
        threshold: [0.08, 0.2, 0.45, 0.7],
      },
    );

    for (const node of pageSlotRefs.current.values()) {
      observer.observe(node);
    }

    return () => observer.disconnect();
  }, [pageNumbers, totalPages]);

  useEffect(() => {
    const pendingPage = pendingScrollPageRef.current;
    if (!pdfDoc || !totalPages || !pendingPage || pendingPage !== currentPage) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const node = pageSlotRefs.current.get(pendingPage);
      if (!node) {
        return;
      }

      scrollPageIntoView(pendingPage);
      if (pendingScrollPageRef.current === pendingPage) {
        pendingScrollPageRef.current = null;
      }
      setHasRestoredInitialPosition(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentPage, pdfDoc, renderedPages, scrollPageIntoView, totalPages]);

  function commitPageInput() {
    if (!totalPages) {
      setPageInput(String(currentPage));
      return;
    }

    const nextPage = parsePageInput(pageInput, totalPages, currentPage);
    goToPage(nextPage);
    setPageInput(String(nextPage));
  }

  async function createHighlight(color: HighlightColor) {
    if (!selectionDraft) {
      return;
    }

    const highlightPage = selectionDraft.page;
    const temporary: ReaderHighlight = {
      id: -Date.now(),
      bookId,
      page: highlightPage,
      text: selectionDraft.text,
      color,
      rects: selectionDraft.rects,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setHighlightsByPage((current) => ({
      ...current,
      [highlightPage]: [...(current[highlightPage] ?? []), temporary],
    }));
    setSelectionDraft(null);
    window.getSelection()?.removeAllRanges();

    const response = await fetch("/api/highlights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookId,
        page: highlightPage,
        text: temporary.text,
        color,
        rects: temporary.rects,
      }),
    });

    if (!response.ok) {
      setHighlightsByPage((current) => ({
        ...current,
        [highlightPage]: (current[highlightPage] ?? []).filter((item) => item.id !== temporary.id),
      }));
      return;
    }

    const payload = (await response.json()) as { highlight: ReaderHighlight };
    setHighlightsByPage((current) => ({
      ...current,
      [highlightPage]: (current[highlightPage] ?? []).map((item) =>
        item.id === temporary.id ? payload.highlight : item,
      ),
    }));
  }

  async function deleteHighlight(highlight: ReaderHighlight) {
    setTooltip(null);
    setHighlightsByPage((current) => ({
      ...current,
      [highlight.page]: (current[highlight.page] ?? []).filter((item) => item.id !== highlight.id),
    }));
    const response = await fetch(`/api/highlights/${highlight.id}`, { method: "DELETE" });
    if (!response.ok) {
      void fetchHighlightsForPage(highlight.page);
    }
  }

  function handleZoomChange(nextZoom: ReaderZoom) {
    setZoom(normalizeZoom(nextZoom));
  }

  function getPlaceholderStyle(pageNumber: number) {
    const pageSize = pageSizes[pageNumber] ?? {
      width: DEFAULT_PAGE_SIZE.width * zoom,
      height: DEFAULT_PAGE_SIZE.height * zoom,
    };

    return {
      width: pageSize.width,
      height: pageSize.height,
    };
  }

  if (loadError) {
    return (
      <main className="pdf-reader-shell">
        <ReaderHeader title={title} author={author} currentPage={currentPage} totalPages={totalPages}>
          <span className="reader-progress-label">{progressSummary}</span>
        </ReaderHeader>
        <section className="reader-status-panel error" role="alert">
          <AlertTriangle className="inline-icon" aria-hidden="true" />
          <p>{loadError}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="pdf-reader-shell">
      <ReaderHeader title={title} author={author} currentPage={currentPage} totalPages={totalPages}>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Hide outline" : "Show outline"}
          title={sidebarOpen ? "Hide outline" : "Show outline"}
        >
          <Columns className="inline-icon" aria-hidden="true" />
        </Button>
        <span className="reader-progress-label">{progressSummary}</span>
        <PageControls
          currentPage={currentPage}
          totalPages={totalPages}
          inputValue={pageInput}
          onInputChange={setPageInput}
          onCommit={commitPageInput}
          onPrevious={() => goToPage(currentPage - 1)}
          onNext={() => goToPage(currentPage + 1)}
        />
        <ZoomControl value={zoom} onChange={handleZoomChange} />
      </ReaderHeader>

      <div className="reader-workspace" style={{ gridTemplateColumns: sidebarOpen ? `${sidebarWidth}px minmax(0, 1fr)` : "0px minmax(0, 1fr)", userSelect: isResizing ? "none" : "auto" }}>
        <ReaderNavigationPanel
          currentPage={currentPage}
          totalPages={totalPages}
          progressSummary={progressSummary}
          bookmarks={bookmarks}
          isLoadingBookmarks={isLoadingBookmarks}
          onPageSelect={goToPage}
          onResizeStart={startResizing}
          isResizing={isResizing}
          style={{ display: sidebarOpen ? undefined : "none" }}
        />

        <div className="pdf-stage" ref={scrollContainerRef}>
          {pdfDoc && totalPages ? (
            <div className="pdf-scroll-column">
              {pageNumbers.map((pageNumber) => {
                const isRendered = renderedPageSet.has(pageNumber);
                return (
                  <section
                    key={pageNumber}
                    ref={(node) => setPageSlotRef(pageNumber, node)}
                    className={`pdf-page-slot${pageNumber === currentPage ? " current" : ""}`}
                    data-page-number={pageNumber}
                    aria-current={pageNumber === currentPage ? "page" : undefined}
                  >
                    {isRendered ? (
                      <PdfCanvasPage
                        pdfDoc={pdfDoc}
                        pageNumber={pageNumber}
                        zoom={zoom}
                        highlights={highlightsByPage[pageNumber] ?? []}
                        onSelectionDraft={setSelectionDraft}
                        onHighlightSelect={(highlight, x, y) => setTooltip({ highlight, x, y })}
                        onRenderedSize={handleRenderedSize}
                      />
                    ) : (
                      <div className="pdf-page-wrap" aria-hidden="true">
                        <div className="pdf-page pdf-page-skeleton" style={getPlaceholderStyle(pageNumber)}>
                          <span>Page {pageNumber}</span>
                        </div>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          ) : (
            <section className="reader-status-panel" role="status">
              <Loader2 className="inline-icon spinner" aria-hidden="true" />
              <p>Loading PDF</p>
            </section>
          )}
        </div>
      </div>

      {selectionDraft ? (
        <HighlightColorPicker
          x={selectionDraft.anchorX}
          y={selectionDraft.anchorY}
          onSelect={createHighlight}
          onDismiss={() => setSelectionDraft(null)}
        />
      ) : null}

      {tooltip ? (
        <HighlightTooltip
          highlight={tooltip.highlight}
          x={tooltip.x}
          y={tooltip.y}
          onDelete={deleteHighlight}
          onDismiss={() => setTooltip(null)}
        />
      ) : null}
    </main>
  );
}
