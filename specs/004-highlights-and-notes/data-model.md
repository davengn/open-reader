# Data Model: Highlights and Notes

## Existing Entity: Book

**Table**: `books`

**Relevant fields**:

- `id`: stable book identifier used by panel, note, highlight, and export
  routes.
- `title`: used in the export heading and sanitized filename.
- `author`: used in the export metadata block.
- `format`: `pdf` or `epub`, determines whether note navigation uses `page` or
  `cfi`.
- `status`: notes panel is available for ready reader routes.

**Validation rules**:

- Export requires an existing book.
- Reader-panel mutations require a ready book where the active reader already
  has a valid current page or CFI.
- Deleting a book continues to cascade `highlights`, `notes`, and
  `reading_progress`.

## Existing Entity: Highlight

**Table**: `highlights`

**Purpose**: Source passages that can have one attached Markdown note.

**Relevant fields**:

- `id`: integer primary key.
- `bookId`: required, references `books.id`, cascades on delete.
- `text`: full selected text used for panel tooltip and Markdown blockquote.
- `color`: one of `yellow`, `green`, `blue`, or `pink`.
- `page`: PDF page locator; null for EPUB highlights.
- `cfi`: EPUB CFI locator; null for PDF highlights.
- `chapter`: optional grouping label.
- `rects`: PDF rectangle JSON or `[]` for EPUB.
- `createdAt`: stable fallback ordering.
- `updatedAt`: current mutation timestamp.

**Validation rules**:

- Existing PDF validation remains page and rectangle based.
- Existing EPUB validation remains CFI based.
- A highlight can have zero or one attached note in the MVP.

## Entity: Note

**Table**: `notes`

**Purpose**: Store Markdown notes attached to highlights or standalone book
locations.

**Fields**:

- `id`: integer primary key.
- `bookId`: required, references `books.id`, cascades on delete.
- `highlightId`: nullable reference to `highlights.id`, set null when the
  highlight is deleted.
- `content`: Markdown/plain text content, trimmed for empty-delete checks but
  otherwise preserved.
- `page`: nullable PDF page locator.
- `cfi`: nullable EPUB CFI locator.
- `createdAt`: epoch milliseconds. Add by migration when absent, defaulting to
  `updated_at` for existing rows.
- `updatedAt`: epoch milliseconds, updated on every successful save.

**Migration notes**:

- Add `created_at` to `notes` if it is not already present.
- Add `notes_book_updated_idx` on `(book_id, updated_at)`.
- Add `notes_book_page_idx` on `(book_id, page)` for PDF panel ordering.
- Add `notes_book_cfi_idx` on `(book_id, cfi)` for EPUB lookup/export.
- Add partial unique index `notes_highlight_unique` on `highlight_id` where
  `highlight_id IS NOT NULL`.
- Add `notes_fts` using FTS5 with `content`, `bookId UNINDEXED`, and triggers
  mirroring `book_chunks_fts`.

**Validation rules**:

- `bookId` must resolve to an existing book.
- `content.length <= 50000`.
- Whitespace-only content deletes the existing note if one exists and rejects
  creation of an empty note.
- Attached notes require `highlightId` to reference a highlight in the same
  book.
- PDF standalone notes require a positive integer `page`.
- EPUB standalone notes require a non-empty valid-looking CFI.
- If a referenced highlight no longer exists during autosave, the note is saved
  as standalone using the provided `page` or `cfi` and `highlightId = null`.

**State transitions**:

```text
no row -> save non-empty attached content -> note linked to highlight
attached note -> edit non-empty content -> same note updated
attached note -> save whitespace -> note deleted
highlight deleted -> next save -> note retained with highlight_id = null
no row -> save standalone content -> standalone note created
standalone note -> save whitespace -> note deleted
book deleted -> note removed by cascade
```

## Search Entity: NoteSearchIndex

**Virtual table**: `notes_fts`

**Purpose**: Make note content searchable without scanning long text rows.

**Fields**:

- `content`: note content indexed by FTS5.
- `bookId`: unindexed book filter.

**Synchronization**:

- `notes_ai` trigger inserts on note creation.
- `notes_ad` trigger deletes FTS rows on note deletion.
- `notes_au` trigger refreshes FTS rows on note update.

**Query rules**:

- Search is scoped by `bookId` for the notes panel.
- Empty sanitized queries return no rows without executing `MATCH`.
- Results are ordered by FTS rank, then `updatedAt DESC`.

## Client Model: ReaderAnnotationItem

**Storage**: React state only.

**Fields**:

- `kind`: `highlight` or `standalone-note`.
- `id`: stable UI key.
- `bookId`.
- `highlightId`: present for highlight items.
- `noteId`: present when a note exists.
- `excerpt`: highlight text or note preview.
- `fullText`: full highlight text or note content.
- `color`: highlight color for highlight items.
- `chapter`: grouping label, defaults to `Uncategorized`.
- `page`: PDF location when available.
- `cfi`: EPUB location when available.
- `locationLabel`: display string such as `Page 14` or `CFI`.
- `noteContent`: editable Markdown content.
- `noteStatus`: `idle`, `saving`, `saved`, `error`, or `detached`.
- `sortKey`: normalized chapter/page/position key.

**Validation rules**:

- Excerpt is truncated at 120 characters with an ellipsis.
- Full highlight text is exposed through the native `title` attribute.
- Editor state is keyed by note ID or temporary standalone draft ID.
- Failed saves keep unsaved textarea content in memory.

## Client Model: NotesPanelPreference

**Storage**: `localStorage`

**Fields**:

- `reader.notesPanel`: `open` or `closed`.

**Validation rules**:

- Missing or invalid values default to `closed` on mobile and `open` can be
  restored on desktop if previously saved.
- Preference is read only on the client to avoid server/client render mismatch.

## Export Model: MarkdownAnnotationExport

**Purpose**: Server-side view model for generating Markdown downloads.

**Fields**:

- `bookTitle`
- `author`
- `exportedAtIso`
- `chapters`: ordered groups.
- `items`: highlights with optional note, plus standalone notes.

**Formatting rules**:

- Title is level 1.
- Author and exported timestamp appear before the first separator.
- Chapters are level-2 headings.
- Highlight text is a blockquote.
- Highlight metadata uses `Page [n] - [color]` for PDF and `CFI - [color]` for
  EPUB when page is unavailable.
- Attached note content follows its highlight.
- Standalone notes render as normal Markdown paragraphs under their chapter or
  `Uncategorized`.
- Empty exports contain only the header and `No highlights or notes yet.`
