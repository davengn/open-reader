"use client";

import type { ReaderHighlight } from "@/lib/types/reader";

type HighlightLayerProps = {
  highlights: ReaderHighlight[];
  onSelect: (highlight: ReaderHighlight, x: number, y: number) => void;
};

export function HighlightLayer({ highlights, onSelect }: HighlightLayerProps) {
  return (
    <div className="highlight-layer" aria-hidden={highlights.length === 0}>
      {highlights.flatMap((highlight) =>
        highlight.rects.map((rect, index) => (
          <button
            key={`${highlight.id}-${index}`}
            className={`highlight-rect ${highlight.color}`}
            type="button"
            aria-label={`Highlight: ${highlight.text}`}
            title={highlight.text}
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.width * 100}%`,
              height: `${rect.height * 100}%`,
            }}
            onClick={(event) => onSelect(highlight, event.clientX, event.clientY)}
          />
        )),
      )}
    </div>
  );
}
