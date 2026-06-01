PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('pdf', 'epub')),
  status TEXT NOT NULL CHECK (status IN ('indexing', 'ready', 'error')),
  status_message TEXT,
  file_path TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 209715200),
  sha256 TEXT NOT NULL UNIQUE,
  cover_path TEXT,
  cover_hash TEXT,
  total_pages INTEGER,
  total_locations INTEGER,
  reading_percent INTEGER NOT NULL DEFAULT 0 CHECK (reading_percent >= 0 AND reading_percent <= 100),
  last_read_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS books_created_at_idx ON books(created_at DESC);
CREATE INDEX IF NOT EXISTS books_status_idx ON books(status);

CREATE TABLE IF NOT EXISTS reading_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  locator_type TEXT NOT NULL CHECK (locator_type IN ('pdf-page', 'epub-cfi')),
  page INTEGER,
  cfi TEXT,
  chapter TEXT,
  percent INTEGER NOT NULL CHECK (percent >= 0 AND percent <= 100),
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS reading_progress_book_unique ON reading_progress(book_id);

CREATE TABLE IF NOT EXISTS highlights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  color TEXT NOT NULL,
  page INTEGER,
  cfi TEXT,
  chapter TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  highlight_id INTEGER REFERENCES highlights(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  page INTEGER,
  cfi TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS flashcards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  next_review INTEGER,
  interval_days INTEGER NOT NULL,
  ease_factor REAL NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS book_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chapter TEXT,
  page INTEGER,
  cfi TEXT,
  token_start INTEGER,
  token_end INTEGER,
  created_at INTEGER NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS book_chunks_fts USING fts5(
  content,
  chapter,
  bookId UNINDEXED,
  content='book_chunks',
  content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS book_chunks_ai AFTER INSERT ON book_chunks BEGIN
  INSERT INTO book_chunks_fts(rowid, content, chapter, bookId)
  VALUES (new.id, new.content, new.chapter, new.book_id);
END;

CREATE TRIGGER IF NOT EXISTS book_chunks_ad AFTER DELETE ON book_chunks BEGIN
  INSERT INTO book_chunks_fts(book_chunks_fts, rowid, content, chapter, bookId)
  VALUES ('delete', old.id, old.content, old.chapter, old.book_id);
END;

CREATE TRIGGER IF NOT EXISTS book_chunks_au AFTER UPDATE ON book_chunks BEGIN
  INSERT INTO book_chunks_fts(book_chunks_fts, rowid, content, chapter, bookId)
  VALUES ('delete', old.id, old.content, old.chapter, old.book_id);
  INSERT INTO book_chunks_fts(rowid, content, chapter, bookId)
  VALUES (new.id, new.content, new.chapter, new.book_id);
END;
