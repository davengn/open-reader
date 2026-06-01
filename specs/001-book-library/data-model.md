# Data Model: Book Library

## Entity: Book

Represents one locally stored PDF or EPUB.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | text UUID | yes | Primary key; also used in file paths and `/book/[id]` route |
| title | text | yes | Extracted metadata or filename fallback |
| author | text | yes | Extracted metadata or "Unknown" |
| format | enum | yes | `pdf` or `epub` |
| status | enum | yes | `indexing`, `ready`, `error` |
| statusMessage | text | no | User-safe processing error or tooltip copy |
| filePath | text | yes | Relative path under `books/` |
| fileSizeBytes | integer | yes | Must be <= 200 MB |
| sha256 | text | yes | Unique byte-content hash |
| coverPath | text | no | Relative path under `books/covers/` |
| coverHash | text | no | Content hash used for cache-stable filename |
| totalPages | integer | no | PDF page count when available |
| totalLocations | integer | no | EPUB location estimate when available |
| readingPercent | integer | yes | Denormalized 0-100 summary for card display |
| lastReadAt | integer | no | Unix milliseconds |
| createdAt | integer | yes | Unix milliseconds |
| updatedAt | integer | yes | Unix milliseconds |

Validation rules:

- `format` is derived from validated extension/MIME inspection.
- `fileSizeBytes` must be greater than 0 and no more than 209,715,200 bytes.
- `sha256` must be unique.
- `readingPercent` must be between 0 and 100.
- `ready` status requires successful metadata processing and recoverable cover
  or placeholder cover generation.

State transitions:

```text
upload accepted -> indexing
indexing -> ready
indexing -> error
error -> deleted
ready -> deleted
```

## Entity: ReadingProgress

Stores the latest reading location for a book.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | integer | yes | Primary key |
| bookId | text UUID | yes | Foreign key to Book, cascade delete |
| locatorType | enum | yes | `pdf-page` or `epub-cfi` |
| page | integer | no | PDF page number |
| cfi | text | no | EPUB CFI |
| chapter | text | no | Best-effort chapter label |
| percent | integer | yes | 0-100 |
| updatedAt | integer | yes | Unix milliseconds |

Validation rules:

- PDF progress must include `page`.
- EPUB progress must include `cfi` when the reader feature writes precise
  progress.
- One current progress row per book for this feature.

## Entity: Highlight

Existing/future annotation row that must be preserved for cascade planning.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | integer | yes | Primary key |
| bookId | text UUID | yes | Foreign key to Book, cascade delete |
| text | text | yes | Selected quote |
| color | enum | yes | `yellow`, `green`, `blue`, or future token |
| page | integer | no | PDF location |
| cfi | text | no | EPUB location |
| chapter | text | no | Optional context |
| createdAt | integer | yes | Unix milliseconds |

## Entity: Note

Existing/future note row that must cascade when a book is deleted.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | integer | yes | Primary key |
| bookId | text UUID | yes | Foreign key to Book, cascade delete |
| highlightId | integer | no | Optional foreign key to Highlight |
| content | text | yes | Markdown content |
| page | integer | no | PDF location |
| cfi | text | no | EPUB location |
| updatedAt | integer | yes | Unix milliseconds |

## Entity: Flashcard

Existing/future review artifact that must cascade when a book is deleted.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | integer | yes | Primary key |
| bookId | text UUID | yes | Foreign key to Book, cascade delete |
| front | text | yes | Prompt side |
| back | text | yes | Answer side |
| nextReview | integer | no | Unix milliseconds |
| intervalDays | integer | yes | SM-2 interval |
| easeFactor | real | yes | SM-2 ease factor |
| createdAt | integer | yes | Unix milliseconds |
| updatedAt | integer | yes | Unix milliseconds |

## Entity: BookChunk

Extracted text chunk used by FTS5 search and future grounded AI features.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | integer | yes | Primary key |
| bookId | text UUID | yes | Foreign key to Book, cascade delete |
| content | text | yes | Approximately 500 tokens |
| chapter | text | no | Best-effort chapter label |
| page | integer | no | PDF page source |
| cfi | text | no | EPUB CFI or section locator |
| tokenStart | integer | no | Chunk offset within extracted text |
| tokenEnd | integer | no | Chunk offset within extracted text |
| createdAt | integer | yes | Unix milliseconds |

FTS5:

- `book_chunks_fts` indexes `content`, `chapter`, and unindexed `bookId`.
- Rebuild chunk and FTS rows inside processing transactions where possible.
- Delete cascades must remove both base chunks and FTS entries.

## Query Views

### BookCardSummary

Returned by `GET /api/books` for library rendering.

- `id`
- `title`
- `author`
- `format`
- `status`
- `statusMessage`
- `coverUrl`
- `readingPercent`
- `lastReadAt`
- `createdAt`

### BookStatus

Returned by `GET /api/books/[id]/status`.

- `id`
- `status`
- `statusMessage`
- `readingPercent`
- `updatedAt`

## Deletion Rules

Deleting a book must:

1. Resolve the book and dependent file paths.
2. Delete the raw file and cover file if they exist.
3. Delete the `books` row inside a SQLite transaction.
4. Cascade `reading_progress`, `highlights`, `notes`, `flashcards`,
   `book_chunks`, and FTS rows.
5. Return success only after database cleanup completes.

If file deletion fails but the file is already absent, continue cleanup. If file
deletion fails for another reason, return a recoverable error and leave the row
unchanged.
