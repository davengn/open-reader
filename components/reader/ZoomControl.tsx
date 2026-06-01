"use client";

import { ZoomIn } from "lucide-react";
import { READER_ZOOM_VALUES, type ReaderZoom } from "@/lib/reader/zoom";

type ZoomControlProps = {
  value: ReaderZoom;
  onChange: (zoom: ReaderZoom) => void;
};

export function ZoomControl({ value, onChange }: ZoomControlProps) {
  return (
    <label className="zoom-control">
      <ZoomIn className="inline-icon" aria-hidden="true" />
      <span className="sr-only">Zoom level</span>
      <select
        className="select-control"
        id="reader-zoom"
        name="readerZoom"
        value={String(value)}
        aria-label="Zoom level"
        onChange={(event) => onChange(Number(event.target.value) as ReaderZoom)}
      >
        {READER_ZOOM_VALUES.map((zoom) => (
          <option key={zoom} value={zoom}>
            {Math.round(zoom * 100)}%
          </option>
        ))}
      </select>
    </label>
  );
}
