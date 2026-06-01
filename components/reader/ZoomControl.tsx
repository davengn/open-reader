import { ZoomIn } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
      <Select value={String(value)} onValueChange={(val) => onChange(Number(val) as ReaderZoom)}>
        <SelectTrigger className="w-[100px] h-[40px] border border-line bg-surface text-ink rounded-md font-semibold px-3 py-2" id="reader-zoom">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {READER_ZOOM_VALUES.map((zoom) => (
            <SelectItem key={zoom} value={String(zoom)}>
              {Math.round(zoom * 100)}%
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
