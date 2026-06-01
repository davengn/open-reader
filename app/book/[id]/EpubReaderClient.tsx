"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bookmark, Columns } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReaderHeader } from "@/components/reader/ReaderHeader";
import { NotesPanel } from "@/components/reader/NotesPanel";
import { EpubViewerStage } from "@/components/reader/EpubViewerStage";
import { ReaderStatusBanner } from "@/components/reader/ReaderStatusBanner";
import { HighlightColorPicker } from "@/components/reader/HighlightColorPicker";
import { HighlightTooltip } from "@/components/reader/HighlightTooltip";
import { EpubTocPanel } from "@/components/reader/EpubTocPanel";
import { EpubChapterNav } from "@/components/reader/EpubChapterNav";
import { FontSizeControl } from "@/components/reader/FontSizeControl";
import { getEpubjs, fetchEpubArrayBuffer } from "@/lib/epub/client";
import { updateEpubProgress } from "@/app/book/[id]/actions";
import { normalizeProgressPercent, normalizeChapterTitle } from "@/lib/reader/epubProgress";
import { isCrossChapterCfi } from "@/lib/epub/highlights";
import { flattenToc } from "@/lib/epub/toc";
import { loadStoredFontSize, saveStoredFontSize, type EpubFontSize } from "@/lib/reader/fontSize";
import { getStoredNotesPanelPreference, saveNotesPanelPreference } from "@/lib/reader/notesPanelPreference";
import type { Book, Rendition } from "epubjs";
import type {
  EpubHighlight,
  HighlightColor,
  EpubSelectionDraft,
  EpubTocItem,
  ReaderAnnotationNavigationTarget,
} from "@/lib/types/reader";

type EpubReaderClientProps = {
  bookId: string;
  title: string;
  author: string;
  initialCfi: string | null;
  initialChapter: string | null;
};

type TooltipState = {
  highlight: EpubHighlight;
  x: number;
  y: number;
};

export function EpubReaderClient({
  bookId,
  title,
  author,
  initialCfi,
  initialChapter,
}: EpubReaderClientProps) {
  const [status, setStatus] = useState<"loading" | "drm-error" | "invalid-cfi" | "error" | "ready">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [chapterTitle, setChapterTitle] = useState<string | null>(initialChapter);
  const [percentage, setPercentage] = useState<number>(0);
  const [cfi, setCfi] = useState<string | null>(initialCfi);
  const [highlights, setHighlights] = useState<EpubHighlight[]>([]);
  const [selectionDraft, setSelectionDraft] = useState<EpubSelectionDraft | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [toc, setToc] = useState<EpubTocItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentHref, setCurrentHref] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<EpubFontSize>(16);
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);
  
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);

  const progressSnapshotRef = useRef({
    bookId,
    cfi: initialCfi,
    percentage: 0,
    chapter: initialChapter,
    hasRestoredInitialPosition: false,
  });

  const fetchHighlights = useCallback(async () => {
    try {
      const response = await fetch(`/api/highlights?bookId=${encodeURIComponent(bookId)}&format=epub`);
      if (response.ok) {
        const payload = await response.json();
        setHighlights(payload.highlights ?? []);
      }
    } catch (e) {
      console.error("Failed to fetch highlights:", e);
    }
  }, [bookId]);

  useEffect(() => {
    const stored = getStoredNotesPanelPreference(window.localStorage);
    if (stored) {
      setNotesPanelOpen(stored === "open");
    }
  }, []);

  useEffect(() => {
    saveNotesPanelPreference(window.localStorage, notesPanelOpen ? "open" : "closed");
  }, [notesPanelOpen]);

  const flushProgressBeforeLeaving = useCallback(() => {
    const snapshot = progressSnapshotRef.current;
    if (!snapshot.cfi || !snapshot.hasRestoredInitialPosition) {
      return;
    }

    const url = `/api/books/${encodeURIComponent(snapshot.bookId)}/progress`;
    const body = JSON.stringify({
      cfi: snapshot.cfi,
      percentage: snapshot.percentage,
      chapter: snapshot.chapter || undefined,
    });

    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      if (sent) return;
    }

    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;

    async function initReader() {
      try {
        setStatus("loading");
        
        // 1. Get epubjs and fetch book bytes
        const ePub = await getEpubjs();
        const arrayBuffer = await fetchEpubArrayBuffer(bookId);
        
        if (!active) return;

        // 2. Open the book
        const book = ePub(arrayBuffer);
        bookRef.current = book;

        // Wait for it to open
        await book.opened;

        if (!active) {
          book.destroy();
          return;
        }

        // Set Table of Contents
        if (book.navigation && book.navigation.toc) {
          const flat = flattenToc(book.navigation.toc);
          setToc(flat);
          if (flat.length === 0) {
            setSidebarOpen(false);
          }
        } else {
          setSidebarOpen(false);
        }

        // Check if there is any basic DRM protection
        const zip = (book as any).archive;
        const isEncrypted = zip && (
          (zip.files && zip.files["META-INF/encryption.xml"]) ||
          (zip.files && zip.files["META-INF/rights.xml"])
        );

        if (isEncrypted) {
          setStatus("drm-error");
          setErrorMessage("This EPUB book is protected by DRM (Digital Rights Management) and is not supported.");
          return;
        }

        // 3. Render the rendition
        if (viewerRef.current) {
          const rendition = book.renderTo(viewerRef.current, {
            width: "100%",
            height: "100%",
            flow: "paginated",
            manager: "iframe",
            allowScriptedContent: false,
          });
          renditionRef.current = rendition;

          // Load stored font size and apply it
          const storedSize = loadStoredFontSize(typeof window !== "undefined" ? window.localStorage : null);
          setFontSize(storedSize);
          rendition.themes.fontSize(`${storedSize}px`);

          // Configure rendition theme styles for injected highlights
          rendition.themes.default({
            ".epub-highlight": {
              "background-color": "transparent",
              "cursor": "pointer"
            },
            ".epub-highlight.yellow": {
              "background-color": "rgba(254, 240, 138, 0.5) !important"
            },
            ".epub-highlight.green": {
              "background-color": "rgba(187, 247, 208, 0.5) !important"
            },
            ".epub-highlight.blue": {
              "background-color": "rgba(191, 219, 254, 0.5) !important"
            },
            ".epub-highlight.pink": {
              "background-color": "rgba(251, 207, 232, 0.5) !important"
            }
          });

          // Wire relocated event
          rendition.on("relocated", (location: any) => {
            if (!active) return;
            
            const currentCfi = location.start.cfi;
            const rawPercent = location.start.percentage;
            const currentPercent = normalizeProgressPercent(rawPercent);
            
            let resolvedChapter = "";
            try {
              const spine = book.spine.get(currentCfi);
              if (spine && spine.href) {
                setCurrentHref(spine.href);
                const tocItem = book.navigation.get(spine.href);
                if (tocItem) {
                  resolvedChapter = tocItem.label;
                }
              }
            } catch (e) {
              console.warn("Failed to retrieve chapter label:", e);
            }
            
            const normalizedChapter = resolvedChapter ? normalizeChapterTitle(resolvedChapter) : "Unknown Chapter";
            
            setChapterTitle(normalizedChapter);
            setPercentage(currentPercent);
            setCfi(currentCfi);

            progressSnapshotRef.current = {
              bookId,
              cfi: currentCfi,
              percentage: currentPercent,
              chapter: normalizedChapter,
              hasRestoredInitialPosition: true,
            };
          });

          // Wire selected event
          rendition.on("selected", (cfiRange: string, contents: any) => {
            if (!active) return;
            
            const text = contents.window.getSelection()?.toString() || "";
            if (!text.trim()) return;

            const crossChapter = isCrossChapterCfi(cfiRange);
            const selection = contents.window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              const rect = range.getBoundingClientRect();
              const iframe = viewerRef.current?.querySelector("iframe");
              const iframeRect = iframe ? iframe.getBoundingClientRect() : { top: 0, left: 0 };

              const x = rect.left + iframeRect.left + rect.width / 2;
              const y = rect.top + iframeRect.top - 50;

              setSelectionDraft({
                cfiRange,
                text,
                chapter: chapterTitle || undefined,
                anchorX: x,
                anchorY: y,
                isCrossChapter: crossChapter,
              });
            }
          });

          // Display the initial position
          try {
            if (initialCfi) {
              await rendition.display(initialCfi);
            } else {
              await rendition.display();
            }
            setStatus("ready");
            progressSnapshotRef.current.hasRestoredInitialPosition = true;
          } catch (cfiError) {
            console.error("Failed to restore CFI, falling back to first page:", cfiError);
            if (initialCfi) {
              setStatus("invalid-cfi");
              await rendition.display();
              progressSnapshotRef.current.hasRestoredInitialPosition = true;
            } else {
              setStatus("error");
              setErrorMessage("Could not display the book.");
            }
          }
        }
      } catch (err: any) {
        console.error("EPUB reader error during initialization:", err);
        if (active) {
          setStatus("error");
          setErrorMessage(err?.message || "An error occurred while loading this book.");
        }
      }
    }

    void initReader();
    void fetchHighlights();

    return () => {
      active = false;
      if (renditionRef.current) {
        renditionRef.current.destroy();
      }
      if (bookRef.current) {
        bookRef.current.destroy();
      }
    };
  }, [bookId, initialCfi, fetchHighlights]);

  // Re-apply highlights to rendition
  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition || status !== "ready") return;

    highlights.forEach((hl) => {
      try {
        rendition.annotations.remove(hl.cfi, "highlight");
        rendition.annotations.add(
          "highlight",
          hl.cfi,
          {},
          (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const iframe = viewerRef.current?.querySelector("iframe");
            const iframeRect = iframe ? iframe.getBoundingClientRect() : { top: 0, left: 0 };
            
            setTooltip({
              highlight: hl,
              x: e.clientX + iframeRect.left,
              y: e.clientY + iframeRect.top - 40,
            });
          },
          `epub-highlight ${hl.color}`
        );
      } catch (err) {
        console.warn("Failed to apply highlight to CFI:", hl.cfi, err);
      }
    });
  }, [highlights, status]);

  // Debounced progress saving
  useEffect(() => {
    if (status !== "ready" && status !== "invalid-cfi") {
      return;
    }

    const timeout = window.setTimeout(() => {
      const snapshot = progressSnapshotRef.current;
      if (snapshot.cfi && snapshot.hasRestoredInitialPosition) {
        void updateEpubProgress({
          bookId,
          cfi: snapshot.cfi,
          percentage: snapshot.percentage,
          chapter: snapshot.chapter || undefined,
        }).catch(() => undefined);
      }
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [bookId, cfi, percentage, chapterTitle, status]);

  // Page hide/visibility change keepalive flush
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

  // Refetch highlights on focus
  useEffect(() => {
    window.addEventListener("focus", fetchHighlights);
    return () => window.removeEventListener("focus", fetchHighlights);
  }, [fetchHighlights]);

  // Create highlight
  const createHighlight = async (color: HighlightColor) => {
    if (!selectionDraft) return;

    const tempId = -Date.now();
    const temporary: EpubHighlight = {
      id: tempId,
      bookId,
      cfi: selectionDraft.cfiRange,
      text: selectionDraft.text,
      color,
      chapter: selectionDraft.chapter || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setHighlights((current) => [...current, temporary]);
    setSelectionDraft(null);
    
    try {
      const iframe = viewerRef.current?.querySelector("iframe");
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.getSelection()?.removeAllRanges();
      }
    } catch (e) {
      console.warn("Could not clear selection:", e);
    }

    try {
      const response = await fetch("/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          cfi: temporary.cfi,
          text: temporary.text,
          color,
          chapter: temporary.chapter,
        }),
      });

      if (!response.ok) {
        setHighlights((current) => current.filter((h) => h.id !== tempId));
        return;
      }

      const payload = await response.json();
      setHighlights((current) =>
        current.map((h) => (h.id === tempId ? payload.highlight : h))
      );
    } catch (e) {
      console.error("Failed to create highlight:", e);
      setHighlights((current) => current.filter((h) => h.id !== tempId));
    }
  };

  // Delete highlight
  const deleteHighlight = async (highlight: EpubHighlight) => {
    setTooltip(null);
    setHighlights((current) => current.filter((h) => h.id !== highlight.id));
    
    if (renditionRef.current) {
      try {
        renditionRef.current.annotations.remove(highlight.cfi, "highlight");
      } catch (e) {
        console.warn("Failed to remove annotation:", e);
      }
    }

    try {
      const response = await fetch(`/api/highlights/${highlight.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        void fetchHighlights();
      }
    } catch (e) {
      console.error("Failed to delete highlight:", e);
      void fetchHighlights();
    }
  };

  const handleFontSizeChange = useCallback(async (newSize: EpubFontSize) => {
    setFontSize(newSize);
    if (typeof window !== "undefined") {
      saveStoredFontSize(window.localStorage, newSize);
    }
    if (renditionRef.current) {
      const currentCfi = renditionRef.current.currentLocation()?.start?.cfi || cfi;
      renditionRef.current.themes.fontSize(`${newSize}px`);
      if (currentCfi) {
        try {
          await renditionRef.current.display(currentCfi);
        } catch (e) {
          console.warn("Failed to redisplay after font size change:", e);
        }
      }
    }
  }, [cfi]);

  const handleTocSelect = (href: string) => {
    if (renditionRef.current) {
      void renditionRef.current.display(href);
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      }
    }
  };

  const handleNotesNavigate = useCallback(async (target: ReaderAnnotationNavigationTarget) => {
    if (!target.cfi || !renditionRef.current) {
      return;
    }

    try {
      await renditionRef.current.display(target.cfi);
    } catch (error) {
      console.warn("Failed to navigate to note target:", error);
    }
  }, []);

  return (
    <main className="pdf-reader-shell">
      <ReaderHeader
        title={title}
        author={author}
        chapterTitle={chapterTitle}
        format="epub"
      >
        {toc.length > 0 && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? "Hide outline" : "Show outline"}
            title={sidebarOpen ? "Hide outline" : "Show outline"}
          >
            <Columns className="inline-icon" aria-hidden="true" />
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setNotesPanelOpen((open) => !open)}
          aria-label={notesPanelOpen ? "Hide notes" : "Show notes"}
          title={notesPanelOpen ? "Hide notes" : "Show notes"}
        >
          <Bookmark className="inline-icon" aria-hidden="true" />
        </Button>
        <FontSizeControl value={fontSize} onChange={handleFontSizeChange} />
        <span className="reader-progress-label">{percentage.toFixed(1)}%</span>
      </ReaderHeader>
      
      {status !== "ready" && (
        <ReaderStatusBanner
          status={status}
          message={errorMessage}
          onDismissInvalidCfi={() => setStatus("ready")}
        />
      )}

      <div
        className={`epub-workspace ${sidebarOpen ? "has-sidebar" : ""}${notesPanelOpen ? " has-notes-panel" : ""}`}
        style={{
          gridTemplateColumns: `${sidebarOpen ? "280px " : ""}minmax(0, 1fr)${notesPanelOpen ? " 320px" : ""}`,
        }}
      >
        <EpubTocPanel
          toc={toc}
          onSelect={handleTocSelect}
          activeHref={currentHref}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        
        <EpubViewerStage ref={viewerRef} />

        <NotesPanel
          bookId={bookId}
          isOpen={notesPanelOpen}
          currentPage={null}
          currentCfi={cfi}
          currentChapter={chapterTitle}
          onClose={() => setNotesPanelOpen(false)}
          onNavigate={handleNotesNavigate}
        />

        {status === "ready" && (
          <EpubChapterNav
            onPrev={() => renditionRef.current?.prev()}
            onNext={() => renditionRef.current?.next()}
          />
        )}
      </div>

      {selectionDraft ? (
        <HighlightColorPicker
          x={selectionDraft.anchorX}
          y={selectionDraft.anchorY}
          onSelect={createHighlight}
          onDismiss={() => setSelectionDraft(null)}
          isCrossChapter={selectionDraft.isCrossChapter}
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
export default EpubReaderClient;
