"use client";

import { useEffect, useRef } from "react";
import type { ReaderBookmark } from "@/lib/types/reader";

type ReaderNavigationPanelProps = {
  currentPage: number;
  totalPages: number | null;
  progressSummary: string;
  bookmarks: ReaderBookmark[];
  isLoadingBookmarks: boolean;
  onPageSelect: (page: number) => void;
};

export function ReaderNavigationPanel({
  currentPage,
  totalPages,
  progressSummary,
  bookmarks,
  isLoadingBookmarks,
  onPageSelect,
}: ReaderNavigationPanelProps) {
  const activeButtonRef = useRef<HTMLButtonElement | null>(null);
  const activeBookmarkId = getActiveBookmarkId(bookmarks, currentPage);

  useEffect(() => {
    activeButtonRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentPage]);

  return (
    <aside className="reader-nav-panel" aria-label="Book bookmarks">
      <div className="reader-nav-heading">
        <p className="eyebrow">Bookmarks</p>
        <h2>Contents</h2>
        <p>{isLoadingBookmarks ? "Loading contents" : `${bookmarks.length} entries`}</p>
      </div>

      <div className="reader-nav-current" aria-live="polite">
        <span>{progressSummary} read</span>
        <strong>{totalPages ? `${currentPage} / ${totalPages}` : "..."}</strong>
      </div>

      {bookmarks.length > 0 ? (
        <ol className="reader-bookmark-list" aria-label="Table of contents">
          {bookmarks.map((bookmark) => {
            const isActive = bookmark.id === activeBookmarkId;
            return (
              <li key={bookmark.id}>
                <button
                  ref={isActive ? activeButtonRef : null}
                  className="reader-bookmark-button"
                  type="button"
                  style={{ paddingLeft: `${10 + Math.min(bookmark.depth, 5) * 14}px` }}
                  aria-current={isActive ? "location" : undefined}
                  onClick={() => onPageSelect(bookmark.page)}
                >
                  <span className="reader-bookmark-title">{bookmark.title}</span>
                  <span className="reader-bookmark-page">p. {bookmark.page}</span>
                </button>
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
