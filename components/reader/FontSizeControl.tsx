import { Type } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EPUB_FONT_SIZE_VALUES, type EpubFontSize } from "@/lib/reader/fontSize";

type FontSizeControlProps = {
  value: EpubFontSize;
  onChange: (size: EpubFontSize) => void;
};

export function FontSizeControl({ value, onChange }: FontSizeControlProps) {
  return (
    <label className="zoom-control">
      <Type className="inline-icon" aria-hidden="true" />
      <span className="sr-only">Font size</span>
      <Select value={String(value)} onValueChange={(val) => onChange(Number(val) as EpubFontSize)}>
        <SelectTrigger className="w-[100px] h-[40px] border border-line bg-surface text-ink rounded-md font-semibold px-3 py-2" id="reader-font-size">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {EPUB_FONT_SIZE_VALUES.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}px
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
