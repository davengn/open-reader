"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReaderBookmark } from "@/lib/types/reader";

type ReaderNavigationPanelProps = {
  currentPage: number;
  totalPages: number | null;
  progressSummary: string;
  bookmarks: ReaderBookmark[];
  isLoadingBookmarks: boolean;
  onPageSelect: (page: number) => void;
  onResizeStart?: (event: React.MouseEvent | React.TouchEvent) => void;
  isResizing?: boolean;
  style?: React.CSSProperties;
};

export function ReaderNavigationPanel({
  currentPage,
  totalPages,
  progressSummary,
  bookmarks,
  isLoadingBookmarks,
  onPageSelect,
  onResizeStart,
  isResizing,
  style,
}: ReaderNavigationPanelProps) {
  const activeButtonRef = useRef<HTMLButtonElement | null>(null);
  const activeBookmarkId = getActiveBookmarkId(bookmarks, currentPage);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const hasChildrenMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (let i = 0; i < bookmarks.length; i++) {
      const current = bookmarks[i];
      const next = bookmarks[i + 1];
      map.set(current.id, next ? next.depth > current.depth : false);
    }
    return map;
  }, [bookmarks]);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isVisible = (bookmarkId: string) => {
    const parts = bookmarkId.split(".");
    for (let i = 1; i < parts.length; i++) {
      const parentId = parts.slice(0, i).join(".");
      if (collapsed[parentId]) {
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    if (activeBookmarkId) {
      const parts = activeBookmarkId.split(".");
      if (parts.length > 1) {
        setCollapsed((prev) => {
          let changed = false;
          const nextCollapsed = { ...prev };
          for (let i = 1; i < parts.length; i++) {
            const parentId = parts.slice(0, i).join(".");
            if (nextCollapsed[parentId]) {
              nextCollapsed[parentId] = false;
              changed = true;
            }
          }
          return changed ? nextCollapsed : prev;
        });
      }
    }
  }, [activeBookmarkId]);

  useEffect(() => {
    activeButtonRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentPage, activeBookmarkId]);

  return (
    <aside className="reader-nav-panel" aria-label="Book bookmarks" style={style}>
      {onResizeStart && (
        <div
          className={`reader-sidebar-resize-handle${isResizing ? " is-resizing" : ""}`}
          onMouseDown={onResizeStart}
          onTouchStart={onResizeStart}
        />
      )}
      <div className="reader-nav-heading">
        <span className="eyebrow">Bookmarks</span>
        <span className="separator">•</span>
        <h2>Contents</h2>
        <span className="separator">•</span>
        <span className="entry-count">{isLoadingBookmarks ? "Loading contents" : `${bookmarks.length} entries`}</span>
      </div>

      <div className="reader-nav-current" aria-live="polite">
        <span>{progressSummary} read</span>
        <strong>{totalPages ? `${currentPage} / ${totalPages}` : "..."}</strong>
      </div>

      {bookmarks.length > 0 ? (
        <ol className="reader-bookmark-list" aria-label="Table of contents">
          {bookmarks.map((bookmark) => {
            if (!isVisible(bookmark.id)) {
              return null;
            }
            const isActive = bookmark.id === activeBookmarkId;
            return (
              <li key={bookmark.id}>
                <div
                  className="reader-bookmark-item-wrapper"
                  style={{ paddingLeft: `${Math.min(bookmark.depth, 5) * 14}px` }}
                >
                  {hasChildrenMap.get(bookmark.id) ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="reader-bookmark-toggle"
                      onClick={() => toggleCollapse(bookmark.id)}
                      aria-label={collapsed[bookmark.id] ? "Expand section" : "Collapse section"}
                    >
                      {collapsed[bookmark.id] ? (
                        <ChevronRight className="bookmark-toggle-icon" />
                      ) : (
                        <ChevronDown className="bookmark-toggle-icon" />
                      )}
                    </Button>
                  ) : (
                    <span className="reader-bookmark-toggle-spacer" />
                  )}
                  <Button
                    ref={isActive ? activeButtonRef : null}
                    className="reader-bookmark-button"
                    variant={isActive ? "default" : "ghost"}
                    aria-current={isActive ? "location" : undefined}
                    onClick={() => onPageSelect(bookmark.page)}
                  >
                    <span className="reader-bookmark-title">{bookmark.title}</span>
                    <span className="reader-bookmark-page">p. {bookmark.page}</span>
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="reader-bookmark-empty" role="status">
          {isLoadingBookmarks ? "Loading contents" : "No bookmarks in this PDF"}
        </div>
      )}
    </aside>
  );
}

function getActiveBookmarkId(bookmarks: ReaderBookmark[], currentPage: number) {
  let activeBookmark: ReaderBookmark | null = null;

  for (const bookmark of bookmarks) {
    if (bookmark.page <= currentPage && (!activeBookmark || bookmark.page >= activeBookmark.page)) {
      activeBookmark = bookmark;
    }
  }

  return activeBookmark?.id ?? null;
}
