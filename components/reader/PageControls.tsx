"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type PageControlsProps = {
  currentPage: number;
  totalPages: number | null;
  inputValue: string;
  onInputChange: (value: string) => void;
  onCommit: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

export function PageControls({
  currentPage,
  totalPages,
  inputValue,
  onInputChange,
  onCommit,
  onPrevious,
  onNext,
}: PageControlsProps) {
  const isFirstPage = currentPage <= 1;
  const isLastPage = totalPages ? currentPage >= totalPages : true;

  return (
    <div className="page-controls" aria-label="Page controls">
      <button className="icon-button" type="button" onClick={onPrevious} disabled={isFirstPage} aria-label="Previous page">
        <ChevronLeft className="inline-icon" aria-hidden="true" />
      </button>
      <label className="page-input-label">
        <span className="sr-only">Page number</span>
        <input
          className="page-input"
          id="reader-page-input"
          name="readerPage"
          inputMode="numeric"
          pattern="[0-9]*"
          value={inputValue}
          aria-label="Page number"
          onChange={(event) => onInputChange(event.target.value)}
          onBlur={onCommit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onCommit();
              event.currentTarget.blur();
            }
          }}
        />
      </label>
      <span className="page-total">/ {totalPages ?? "..."}</span>
      <button className="icon-button" type="button" onClick={onNext} disabled={isLastPage} aria-label="Next page">
        <ChevronRight className="inline-icon" aria-hidden="true" />
      </button>
    </div>
  );
}
