export const EPUB_FONT_SIZE_KEY = "epub.fontSize";
export const EPUB_FONT_SIZE_VALUES = [14, 16, 18, 20] as const;
export type EpubFontSize = (typeof EPUB_FONT_SIZE_VALUES)[number];

export function normalizeFontSize(value: unknown): EpubFontSize {
  const numeric = typeof value === "string" ? Number.parseInt(value, 10) : value;
  return EPUB_FONT_SIZE_VALUES.includes(numeric as EpubFontSize) ? (numeric as EpubFontSize) : 16;
}

export function loadStoredFontSize(storage: Pick<Storage, "getItem"> | null | undefined): EpubFontSize {
  if (!storage) {
    return 16;
  }

  return normalizeFontSize(storage.getItem(EPUB_FONT_SIZE_KEY));
}

export function saveStoredFontSize(storage: Pick<Storage, "setItem"> | null | undefined, size: EpubFontSize) {
  if (!storage) {
    return;
  }

  storage.setItem(EPUB_FONT_SIZE_KEY, String(normalizeFontSize(size)));
}
