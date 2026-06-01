"use client";

import { Trash2 } from "lucide-react";
import type { ReaderHighlight } from "@/lib/types/reader";

type HighlightTooltipProps = {
  highlight: ReaderHighlight;
  x: number;
  y: number;
  onDelete: (highlight: ReaderHighlight) => void;
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
        <button className="text-button" type="button" onClick={onDismiss}>
          Dismiss
        </button>
        <button className="icon-button danger" type="button" onClick={() => onDelete(highlight)} aria-label="Delete highlight">
          <Trash2 className="inline-icon" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
