"use client";

import { HIGHLIGHT_COLORS, type HighlightColor } from "@/lib/types/reader";

type HighlightColorPickerProps = {
  x: number;
  y: number;
  onSelect: (color: HighlightColor) => void;
  onDismiss: () => void;
};

const LABELS: Record<HighlightColor, string> = {
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
  pink: "Pink",
};

export function HighlightColorPicker({ x, y, onSelect, onDismiss }: HighlightColorPickerProps) {
  return (
    <div
      className="highlight-picker"
      role="toolbar"
      aria-label="Highlight colors"
      style={{ left: x, top: y }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onDismiss();
        }
      }}
    >
      {HIGHLIGHT_COLORS.map((color) => (
        <button
          key={color}
          className={`highlight-swatch ${color}`}
          type="button"
          aria-label={`${LABELS[color]} highlight`}
          title={`${LABELS[color]} highlight`}
          onClick={() => onSelect(color)}
        />
      ))}
    </div>
  );
}
