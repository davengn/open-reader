"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type EpubChapterNavProps = {
  onPrev: () => void;
  onNext: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
};

export function EpubChapterNav({ onPrev, onNext, hasPrev = true, hasNext = true }: EpubChapterNavProps) {
  return (
    <nav className="epub-chapter-nav" aria-label="Chapter navigation">
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrev}
        disabled={!hasPrev}
        aria-label="Previous page"
        title="Previous page"
      >
        <ChevronLeft className="inline-icon" aria-hidden="true" />
      </Button>
      <span className="count-label" style={{ userSelect: "none" }}>Navigate</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        disabled={!hasNext}
        aria-label="Next page"
        title="Next page"
      >
        <ChevronRight className="inline-icon" aria-hidden="true" />
      </Button>
    </nav>
  );
}
