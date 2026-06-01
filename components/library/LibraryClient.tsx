"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookGrid } from "@/components/library/BookGrid";
import { LibraryToolbar } from "@/components/library/LibraryToolbar";
import { UploadDropzone } from "@/components/library/UploadDropzone";
import {
  LIBRARY_FILTER_KEY,
  LIBRARY_SORT_KEY,
  applyLibraryPreferences,
  normalizeBookFilter,
  normalizeBookSort,
} from "@/lib/library/preferences";
import type { BookFilter, BookSort, BookStatusPayload, BookSummary } from "@/lib/types/books";

type LibraryClientProps = {
  initialBooks: BookSummary[];
};

export function LibraryClient({ initialBooks }: LibraryClientProps) {
  const [books, setBooks] = useState(initialBooks);
  const [filter, setFilter] = useState<BookFilter>("all");
  const [sort, setSort] = useState<BookSort>("dateAdded");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setFilter(normalizeBookFilter(window.localStorage.getItem(LIBRARY_FILTER_KEY)));
    setSort(normalizeBookSort(window.localStorage.getItem(LIBRARY_SORT_KEY)));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(LIBRARY_FILTER_KEY, filter);
    }
  }, [filter, hydrated]);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(LIBRARY_SORT_KEY, sort);
    }
  }, [sort, hydrated]);

  const refreshBooks = useCallback(async () => {
    const response = await fetch("/api/books", { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as { books: BookSummary[] };
    setBooks(payload.books);
  }, []);

  useEffect(() => {
    const indexingIds = books.filter((book) => book.status === "indexing").map((book) => book.id);
    if (indexingIds.length === 0) {
      return;
    }

    const intervalId = window.setInterval(async () => {
      const updates = await Promise.all(
        indexingIds.map(async (id) => {
          const response = await fetch(`/api/books/${id}/status`, { cache: "no-store" });
          return response.ok ? ((await response.json()) as BookStatusPayload) : null;
        }),
      );

      setBooks((current) =>
        current.map((book) => {
          const update = updates.find((item) => item?.id === book.id);
          return update
            ? {
                ...book,
                status: update.status,
                statusMessage: update.statusMessage,
                readingPercent: update.readingPercent,
                updatedAt: update.updatedAt,
              }
            : book;
        }),
      );

      if (updates.some((update) => update && update.status !== "indexing")) {
        await refreshBooks();
      }
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [books, refreshBooks]);

  const visibleBooks = useMemo(() => applyLibraryPreferences(books, filter, sort), [books, filter, sort]);

  return (
    <>
      <header className="library-header">
        <div className="library-heading">
          <p className="eyebrow">Open Reader</p>
          <h1>Your technical shelf.</h1>
          <p>
            Keep PDFs and EPUBs local, indexed, and ready to reopen without turning the library into a
            dashboard.
          </p>
        </div>
        <UploadDropzone onUploaded={refreshBooks} />
      </header>

      <LibraryToolbar
        filter={filter}
        sort={sort}
        visibleCount={visibleBooks.length}
        totalCount={books.length}
        onFilterChange={setFilter}
        onSortChange={setSort}
      />

      <BookGrid
        books={visibleBooks}
        totalBooks={books.length}
        activeFilter={filter}
        onClearFilter={() => setFilter("all")}
        onBookChanged={refreshBooks}
      />
    </>
  );
}
