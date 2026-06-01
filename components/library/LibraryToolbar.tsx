"use client";

import { ArrowDownAZ } from "lucide-react";
import type { BookFilter, BookSort } from "@/lib/types/books";

type LibraryToolbarProps = {
  filter: BookFilter;
  sort: BookSort;
  visibleCount: number;
  totalCount: number;
  onFilterChange: (filter: BookFilter) => void;
  onSortChange: (sort: BookSort) => void;
};

const FILTERS: Array<{ value: BookFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "pdf", label: "PDF" },
  { value: "epub", label: "EPUB" },
];

export function LibraryToolbar({
  filter,
  sort,
  visibleCount,
  totalCount,
  onFilterChange,
  onSortChange,
}: LibraryToolbarProps) {
  return (
    <div className="library-toolbar" aria-label="Library controls">
      <div className="segments" role="group" aria-label="Filter by format">
        {FILTERS.map((item) => (
          <button
            className="segment-button"
            key={item.value}
            type="button"
            aria-pressed={filter === item.value}
            onClick={() => onFilterChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="toolbar-side">
        <span className="count-label">
          {visibleCount} of {totalCount} books
        </span>
        <label className="toolbar-side" aria-label="Sort books">
          <ArrowDownAZ className="inline-icon" aria-hidden="true" />
          <select
            className="select-control"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as BookSort)}
          >
            <option value="dateAdded">Date added</option>
            <option value="lastRead">Last read</option>
            <option value="title">Title</option>
            <option value="author">Author</option>
          </select>
        </label>
      </div>
    </div>
  );
}
