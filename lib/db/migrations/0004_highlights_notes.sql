PRAGMA foreign_keys = ON;

ALTER TABLE notes ADD COLUMN created_at INTEGER;

UPDATE notes
SET created_at = updated_at
WHERE created_at IS NULL;

CREATE INDEX IF NOT EXISTS notes_book_updated_idx ON notes(book_id, updated_at);
CREATE INDEX IF NOT EXISTS notes_book_page_idx ON notes(book_id, page);
CREATE INDEX IF NOT EXISTS notes_book_cfi_idx ON notes(book_id, cfi);
CREATE UNIQUE INDEX IF NOT EXISTS notes_highlight_unique
  ON notes(highlight_id)
  WHERE highlight_id IS NOT NULL;

CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  content,
  bookId UNINDEXED
);

INSERT INTO notes_fts(rowid, content, bookId)
SELECT id, content, book_id FROM notes;

CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, content, bookId)
  VALUES (new.id, new.content, new.book_id);
END;

CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
  DELETE FROM notes_fts WHERE rowid = old.id;
END;

CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
  DELETE FROM notes_fts WHERE rowid = old.id;
  INSERT INTO notes_fts(rowid, content, bookId)
  VALUES (new.id, new.content, new.book_id);
END;
