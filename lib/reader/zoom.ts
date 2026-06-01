export const READER_ZOOM_KEY = "reader.zoom";
export const READER_ZOOM_VALUES = [0.75, 1, 1.25, 1.5, 2] as const;
export type ReaderZoom = (typeof READER_ZOOM_VALUES)[number];

export function normalizeZoom(value: unknown): ReaderZoom {
  const numeric = typeof value === "string" ? Number.parseFloat(value) : value;
  return READER_ZOOM_VALUES.includes(numeric as ReaderZoom) ? (numeric as ReaderZoom) : 1;
}

export function loadStoredZoom(storage: Pick<Storage, "getItem"> | null | undefined): ReaderZoom {
  if (!storage) {
    return 1;
  }

  return normalizeZoom(storage.getItem(READER_ZOOM_KEY));
}

export function saveStoredZoom(storage: Pick<Storage, "setItem"> | null | undefined, zoom: ReaderZoom) {
  if (!storage) {
    return;
  }

  storage.setItem(READER_ZOOM_KEY, String(normalizeZoom(zoom)));
}
