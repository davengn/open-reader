"use client";

import { ArrowDownAZ } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
          <Button
            key={item.value}
            variant={filter === item.value ? "default" : "secondary"}
            size="sm"
            onClick={() => onFilterChange(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="toolbar-side">
        <span className="count-label">
          {visibleCount} of {totalCount} books
        </span>
        <label className="toolbar-side" aria-label="Sort books">
          <ArrowDownAZ className="inline-icon" aria-hidden="true" />
          <Select value={sort} onValueChange={(val) => onSortChange(val as BookSort)}>
            <SelectTrigger className="w-[140px] h-[40px] border border-line bg-surface text-ink rounded-md font-semibold px-3 py-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dateAdded">Date added</SelectItem>
              <SelectItem value="lastRead">Last read</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="author">Author</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </div>
    </div>
  );
}
