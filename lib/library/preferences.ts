import type { BookFilter, BookSort, BookSummary } from "@/lib/types/books";
import { isSupportedSort } from "@/lib/validation/books";

export const LIBRARY_FILTER_KEY = "open-reader:library-filter";
export const LIBRARY_SORT_KEY = "open-reader:library-sort";

export function normalizeBookFilter(value: string | null | undefined): BookFilter {
  return value === "pdf" || value === "epub" ? value : "all";
}

export function normalizeBookSort(value: string | null | undefined): BookSort {
  return value && isSupportedSort(value) ? value : "dateAdded";
}

export function filterBooks(books: BookSummary[], filter: BookFilter): BookSummary[] {
  if (filter === "all") {
    return books;
  }
  return books.filter((book) => book.format === filter);
}

export function sortBooks(books: BookSummary[], sort: BookSort): BookSummary[] {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  const sorted = [...books];

  sorted.sort((left, right) => {
    if (sort === "title") {
      return collator.compare(left.title, right.title);
    }

    if (sort === "author") {
      return collator.compare(left.author, right.author) || collator.compare(left.title, right.title);
    }

    if (sort === "lastRead") {
      const leftTime = left.lastReadAt ?? -1;
      const rightTime = right.lastReadAt ?? -1;
      return rightTime - leftTime || collator.compare(left.title, right.title);
    }

    return right.createdAt - left.createdAt || collator.compare(left.title, right.title);
  });

  return sorted;
}

export function applyLibraryPreferences(
  books: BookSummary[],
  filter: BookFilter,
  sort: BookSort,
): BookSummary[] {
  return sortBooks(filterBooks(books, filter), sort);
}
