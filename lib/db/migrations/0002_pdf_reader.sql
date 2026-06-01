PRAGMA foreign_keys = OFF;

ALTER TABLE reading_progress RENAME TO reading_progress_old;

CREATE TABLE reading_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  locator_type TEXT NOT NULL CHECK (locator_type IN ('pdf-page', 'epub-cfi')),
  page INTEGER CHECK (page IS NULL OR page >= 1),
  cfi TEXT,
  chapter TEXT,
  percent REAL NOT NULL CHECK (percent >= 0 AND percent <= 100),
  updated_at INTEGER NOT NULL
);

INSERT INTO reading_progress (
  id, book_id, locator_type, page, cfi, chapter, percent, updated_at
)
SELECT
  id,
  book_id,
  locator_type,
  page,
  cfi,
  chapter,
  ROUND(CAST(percent AS REAL), 1),
  updated_at
FROM reading_progress_old;

DROP TABLE reading_progress_old;

CREATE UNIQUE INDEX IF NOT EXISTS reading_progress_book_unique ON reading_progress(book_id);

ALTER TABLE highlights ADD COLUMN rects TEXT NOT NULL DEFAULT '[]';
ALTER TABLE highlights ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;

UPDATE highlights
SET updated_at = created_at
WHERE updated_at = 0;

CREATE INDEX IF NOT EXISTS highlights_book_page_idx ON highlights(book_id, page);
CREATE INDEX IF NOT EXISTS highlights_book_created_idx ON highlights(book_id, created_at);

PRAGMA foreign_keys = ON;
