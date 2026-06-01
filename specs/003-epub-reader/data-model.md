# Data Model: EPUB Reader

## Existing Entity: Book

**Table**: `books`

**Relevant fields**:

- `id`: stable book identifier.
- `format`: must be `epub` for the EPUB reader path.
- `status`: reader opens ready EPUBs; indexing/error states show fallback
  status instead of rendering a blank reader.
- `filePath`: relative path under the local book storage root.
- `totalLocations`: optional EPUB location/spine count when ingestion or reader
  processing can provide it.
- `readingPercent`: summary percentage shown in the library.
- `lastReadAt`: updated when EPUB progress is saved.

**Validation rules**:

- Only `format = "epub"` books can be opened by `EpubReaderClient`.
- File path resolution must stay inside the configured local book storage root.
- The file route must use `application/epub+zip` for EPUB bytes.
- DRM or unreadable EPUB failures must leave the book record intact and show a
  visible reader error.

## Entity: ReadingProgress

**Table**: `reading_progress`

**Purpose**: One durable resume row per book.

**Fields**:

- `id`: integer primary key.
- `bookId`: required, references `books.id`, cascades on delete.
- `locatorType`: `epub-cfi` for this feature.
- `page`: unused for EPUB; must be `null`.
- `cfi`: required current EPUB CFI.
- `chapter`: optional current chapter/title label derived from the ToC.
- `percent`: numeric percentage in `[0, 100]`, rounded to one decimal.
- `updatedAt`: epoch milliseconds.

**Migration notes**:

- The current schema already has `locator_type`, `cfi`, `chapter`, nullable
  `page`, and real `percent` fields.
- Add or verify an index for `reading_progress(book_id)` if the existing unique
  rule is not present in the active migration chain.
- `books.reading_percent`, `books.last_read_at`, and `books.updated_at` mirror
  the latest progress save for library cards.

**State transitions**:

```text
no row -> epub-cfi row created on first relocated save
epub-cfi row -> same row updated after navigation or scroll relocation
stale CFI restore error -> row remains, reader displays first chapter with banner
book deleted -> row removed by cascade
```

## Entity: Highlight

**Table**: `highlights`

**Purpose**: Persist selected EPUB text and CFI annotation anchors.

**Fields**:

- `id`: integer primary key.
- `bookId`: required, references `books.id`, cascades on delete.
- `text`: selected text snapshot, trimmed, non-empty.
- `color`: one of `yellow`, `green`, `blue`, or `pink`.
- `page`: unused for EPUB; must be `null`.
- `cfi`: required EPUB CFI range.
- `chapter`: optional chapter/title label at selection time.
- `rects`: `[]` for EPUB rows, retained for PDF compatibility.
- `createdAt`: epoch milliseconds.
- `updatedAt`: epoch milliseconds.

**Validation rules**:

- `text.trim().length > 0`.
- `color` is one of the four supported swatches.
- `cfi.trim().length > 0` and must be treated as an opaque `epubjs` CFI string.
- EPUB highlight create/list calls must reject books whose `format` is not
  `epub`.
- Delete by highlight ID must validate that the row exists and let cascade
  delete handle book removal.

**Indexes**:

- Reuse book-level highlight lookup and add `highlights_book_cfi_idx` on
  `(book_id, cfi)` if CFI lookup becomes slow.
- Existing `(book_id, page)` PDF lookup remains valid for PDF rows.

**State transitions**:

```text
selection -> annotation rendered optimistically -> highlight row persisted
reader load -> rows fetched by book -> annotations reapplied
mark clicked -> delete tooltip opened -> row deleted and annotation removed
invalid CFI on load -> row skipped for this session, data retained
book deleted -> highlight removed by cascade
```

## Client Model: EpubReaderSession

**Storage**: React state only.

**Fields**:

- `bookId`
- `title`
- `author`
- `epubUrl`
- `book`: loaded `epubjs` book instance.
- `rendition`: active `epubjs` rendition.
- `status`: `loading`, `ready`, `unsupported`, or `error`.
- `restoreWarning`: boolean/string for invalid saved CFI fallback.
- `currentCfi`
- `currentHref`
- `currentChapterTitle`
- `percentage`
- `tocItems`
- `tocOpen`
- `fontSize`
- `selectionDraft`: CFI range, selected text, anchor position, and contents
  reference needed for highlight creation.
- `highlightsByCfi`
- `tooltipState`

**Validation rules**:

- The rendition is created only after the ArrayBuffer is available on the client.
- `currentCfi` is updated only from relocated events or successful restore.
- Font size must be one of `14`, `16`, `18`, or `20`.
- Selection drafts are discarded if text is empty or the selected CFI cannot be
  mapped to a single chapter.
- Event listeners and rendition/book instances must be cleaned up on unmount.

## Client Model: EpubTocItem

**Storage**: React state only, derived from `book.navigation.toc`.

**Fields**:

- `id`: stable path within the loaded ToC tree.
- `label`: normalized chapter or section title.
- `href`: EPUB href passed to `rendition.display`.
- `depth`: nesting depth, capped visually at 2.
- `children`: optional nested items from the source navigation tree.

**Validation rules**:

- Empty labels are ignored.
- Items without usable `href` are ignored.
- Nesting deeper than 2 is flattened visually under the nearest visible parent.
- If no items remain, the ToC toggle is hidden.

## Client Model: EpubReaderPreferences

**Storage**: `localStorage`

**Fields**:

- `epub.fontSize`: string value of the current font size: `14`, `16`, `18`, or
  `20`.

**Validation rules**:

- Invalid or missing values fall back to `16`.
- Preference is read only on the client to avoid server/client render mismatch.
- Changing the value applies `rendition.themes.fontSize(size + "px")` after the
  rendition is ready.
