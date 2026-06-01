# Data Model: PDF Reader

## Existing Entity: Book

**Table**: `books`

**Relevant fields**:

- `id`: stable book identifier.
- `format`: must be `pdf` for this reader route to load the PDF UI.
- `status`: reader opens ready PDFs; error/indexing states keep visible fallback actions.
- `filePath`: relative path under the local book storage root.
- `totalPages`: PDF page count discovered during ingestion or reader load.
- `readingPercent`: summary percentage shown in the library.
- `lastReadAt`: updated when PDF progress is saved.

**Validation rules**:

- Only `format = "pdf"` books can stream through `/api/books/[id]/file`.
- File path resolution must stay inside the configured local book storage root.
- `totalPages`, when present, must be a positive integer.
- If a saved progress call has a larger loaded PDF page count than the stored
  `totalPages`, the stored value is refreshed so future resume rendering does
  not clamp against stale ingestion metadata.

## Entity: ReadingProgress

**Table**: `reading_progress`

**Purpose**: One durable resume row per book.

**Fields**:

- `id`: integer primary key.
- `bookId`: required, references `books.id`, cascades on delete.
- `locatorType`: `pdf-page` for this feature.
- `page`: required for PDF progress, integer in `[1, totalPages]`.
- `cfi`: unused for PDF, kept for EPUB parity.
- `chapter`: optional, unused for PDF MVP.
- `percent`: numeric percentage rounded to one decimal in `[0, 100]`.
- `updatedAt`: epoch milliseconds.

**Migration notes**:

- Existing `reading_progress_book_unique` remains the uniqueness rule.
- `percent` should allow one decimal precision. If the current SQLite check
  requires integer values, migration `0002_pdf_reader.sql` should rebuild the
  table as a `REAL` percentage and copy existing rows.
- `books.reading_percent` should continue mirroring `percent` for library cards.

**State transitions**:

```text
no row -> pdf-page row created on first debounced save
pdf-page row -> same row updated after page navigation
book deleted -> row removed by cascade
```

## Entity: Highlight

**Table**: `highlights`

**Purpose**: Persist page-specific selected text and overlay geometry.

**Fields**:

- `id`: integer primary key.
- `bookId`: required, references `books.id`, cascades on delete.
- `text`: selected text snapshot, trimmed, non-empty.
- `color`: one of `yellow`, `green`, `blue`, or `pink`.
- `page`: required for PDF highlights, integer `>= 1`.
- `cfi`: unused for PDF, kept for EPUB parity.
- `chapter`: optional, unused for PDF MVP.
- `rects`: JSON string array of page-relative rectangles.
- `createdAt`: epoch milliseconds.
- `updatedAt`: epoch milliseconds for delete/refetch conflict handling if future updates are added.

**Rectangle shape**:

```json
{
  "x": 120.5,
  "y": 240.25,
  "width": 180.75,
  "height": 18
}
```

**Validation rules**:

- `text.trim().length > 0`.
- `color` is one of the four supported swatches.
- `page` is a positive integer.
- `rects` parses as a non-empty array.
- Each rectangle has finite non-negative `x`, `y`, `width`, and `height`.
- `width` and `height` must be greater than 0.

**Indexes**:

- `highlights_book_page_idx` on `(book_id, page)` for page load.
- `highlights_book_created_idx` on `(book_id, created_at)` for later notes/review views.

**State transitions**:

```text
selection -> optimistic client highlight -> persisted highlight id returned
persisted highlight -> tooltip opened -> delete requested -> row deleted
other-tab deletion -> focus refetch removes stale local highlight
book deleted -> highlight removed by cascade
```

## Client Model: PdfReaderSession

**Storage**: React state only.

**Fields**:

- `bookId`
- `title`
- `pdfUrl`
- `pdfDoc`
- `totalPages`
- `currentPage`
- `zoom`
- `renderStatus`: `loading`, `ready`, `scanned`, or `error`
- `selectionDraft`: selected text, normalized rects, and picker position
- `highlightsByPage`
- `bookmarks`: flattened PDF outline entries with title, page, and depth

**Validation rules**:

- `currentPage` is clamped to `[1, totalPages]`.
- `zoom` is one of `0.75`, `1`, `1.25`, `1.5`, or `2`.
- Page changes cancel stale render tasks before starting a new one.
- Bookmarks are resolved from PDF outline destinations after the document loads
  and are kept in React state only.

## Client Model: ReaderBookmark

**Storage**: React state only, derived from `pdfDoc.getOutline()`.

**Fields**:

- `id`: stable outline path within the loaded PDF outline tree.
- `title`: normalized bookmark/table-of-contents label.
- `page`: resolved PDF page number in `[1, totalPages]`.
- `depth`: nesting depth for visual indentation.

**Validation rules**:

- Empty titles are ignored.
- Missing, external, or unsupported destinations are ignored.
- Named destinations are resolved with `pdfDoc.getDestination()`.
- Page references are resolved with `pdfDoc.getPageIndex()`.

## Client Model: ReaderPreferences

**Storage**: `localStorage`

**Fields**:

- `reader.zoom`: string value of the current zoom, one of `0.75`, `1`, `1.25`, `1.5`, or `2`.

**Validation rules**:

- Invalid or missing values fall back to `1`.
- Preference is read only on the client to avoid server/client render mismatch.
