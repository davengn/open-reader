"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { ReaderHighlight, EpubHighlight } from "@/lib/types/reader";

type HighlightTooltipProps = {
  highlight: ReaderHighlight | EpubHighlight;
  x: number;
  y: number;
  onDelete: (highlight: any) => void;
  onDismiss: () => void;
};

export function HighlightTooltip({ highlight, x, y, onDelete, onDismiss }: HighlightTooltipProps) {
  return (
    <div
      className="highlight-tooltip"
      role="dialog"
      aria-label="Highlight actions"
      style={{ left: x, top: y }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onDismiss();
        }
      }}
    >
      <p>{highlight.text}</p>
      <div className="highlight-tooltip-actions">
        <Button variant="ghost" onClick={onDismiss}>
          Dismiss
        </Button>
        <Button variant="destructive" size="icon" className="w-[34px] h-[34px]" onClick={() => onDelete(highlight)} aria-label="Delete highlight">
          <Trash2 className="inline-icon" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
