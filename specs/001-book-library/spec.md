# Feature Specification: Book Library

**Feature Branch**: `codex/001-book-library`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description from `references/001-book-library.md`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload a Book (Priority: P1)

As a reader, I want to upload a PDF or EPUB file so that it appears in my
library and can be opened after processing.

**Why this priority**: The application has no value until the local library can
accept books and persist them safely.

**Independent Test**: Upload one valid PDF and one valid EPUB, then verify that
each creates a book record, saves a file under the local book storage root,
shows an indexing state, and appears in the library within 3 seconds.

**Acceptance Scenarios**:

1. **Given** an empty library, **When** I drag a valid PDF under 200 MB onto the
   upload zone, **Then** the API returns `202 Accepted` and the book appears in
   the grid with `status = indexing`.
2. **Given** an empty library, **When** I click the upload zone and select a
   valid EPUB under 200 MB, **Then** the file is saved locally and its metadata
   begins extraction.
3. **Given** any library, **When** I upload a file larger than 200 MB, **Then**
   the app displays "File exceeds the 200 MB limit" and does not write a final
   book record.
4. **Given** any library, **When** I upload a non-PDF/non-EPUB file, **Then**
   the app displays "Only PDF and EPUB files are supported".

---

### User Story 2 - Browse and Resume Reading (Priority: P1)

As a reader, I want to see each book's cover, title, author, format, and
reading progress so that I can pick up where I left off.

**Why this priority**: The library home screen must make a technical reading
collection scannable and actionable.

**Independent Test**: Seed books with different formats, covers, metadata, and
progress values, then verify the library grid renders the expected cards and
routes to `/book/[id]` when a ready book is selected.

**Acceptance Scenarios**:

1. **Given** a ready book with extracted metadata, **When** the library loads,
   **Then** its card shows cover, title, author, format badge, and progress
   from 0 to 100 percent.
2. **Given** a book without a cover, **When** the card renders, **Then** it shows
   a deterministic placeholder cover based on title initials.
3. **Given** a ready book, **When** I click its card, **Then** the app navigates
   to `/book/[id]`.
4. **Given** a corrupt processed book, **When** the card renders, **Then** it
   shows an error badge and cannot be opened.

---

### User Story 3 - Filter and Sort the Library (Priority: P2)

As a reader, I want to filter by format and sort by title, author, last read, or
date added so that I can find books quickly.

**Why this priority**: A technical book library becomes hard to scan once it
contains more than a few books.

**Independent Test**: Seed at least eight books across PDF and EPUB formats,
refresh the page after changing filter/sort, and verify the selected state and
result ordering are preserved.

**Acceptance Scenarios**:

1. **Given** a mixed-format library, **When** I select PDF, **Then** only PDF
   books are visible.
2. **Given** a filtered library, **When** I refresh the page, **Then** the same
   filter and sort controls remain selected from `localStorage`.
3. **Given** no matches for the active filter, **When** the grid renders,
   **Then** it shows "No books match your filter." with a clear-filter action.

---

### User Story 4 - Delete a Book (Priority: P2)

As a reader, I want to delete a book so that I can remove files and memory
artifacts I no longer need.

**Why this priority**: Local-first ownership includes safe removal and cleanup.

**Independent Test**: Seed a book with progress, highlights, notes, flashcards,
and chunks, delete it through the confirmation dialog, then verify the file and
all dependent rows are removed.

**Acceptance Scenarios**:

1. **Given** a book card, **When** I choose Delete from its context menu, **Then**
   I see a confirmation dialog naming the book.
2. **Given** the confirmation dialog, **When** I confirm deletion, **Then** the
   API removes the local file and deletes the `books` row with dependent rows.
3. **Given** the confirmation dialog, **When** I cancel, **Then** no file or
   database row is changed.

---

### User Story 5 - Correct Book Metadata (Priority: P3)

As a reader, I want to edit title and author inline on a book card so that books
with missing or incorrect embedded metadata remain useful.

**Why this priority**: Technical PDFs often have weak metadata, but correction
can follow upload and browsing.

**Independent Test**: Seed a book with missing author metadata, edit title and
author, refresh the library, and verify the corrected values persist.

**Acceptance Scenarios**:

1. **Given** a book card, **When** I activate the pencil action, **Then** title
   and author become editable controls.
2. **Given** edited metadata, **When** I save, **Then** the card and database
   record reflect the new title and author.

### Edge Cases

- Duplicate file upload is detected via SHA-256 content hash and shows
  "This file is already in your library as [title]."
- Interrupted upload deletes any partial file and does not create a final book
  record.
- Corrupt or invalid PDF/EPUB files set `books.status = error` and remain
  deletable.
- Indexing longer than 30 seconds leaves the card in `indexing`; the UI polls
  `GET /api/books/[id]/status` every 3 seconds until the status changes.
- Missing metadata falls back to filename title and "Unknown" author.
- Books without `lastReadAt` sort to the bottom when sorting by Last read.
- Disk write failure returns "Upload failed: disk write error".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept PDF and EPUB files via drag-and-drop and native
  file picker.
- **FR-002**: System MUST reject files over 200 MB with "File exceeds the 200 MB
  limit".
- **FR-003**: System MUST reject unsupported file types with "Only PDF and EPUB
  files are supported".
- **FR-004**: System MUST save accepted files to `books/[uuid].[ext]` on the
  local filesystem.
- **FR-005**: System MUST compute a SHA-256 hash before finalizing a new book
  record and prevent duplicate byte-identical uploads.
- **FR-006**: System MUST insert a book row with `status = indexing` and return
  `202 Accepted` after the file is saved and processing is queued.
- **FR-007**: System MUST extract title and author from embedded PDF/EPUB
  metadata, with filename and "Unknown" fallbacks.
- **FR-008**: System MUST extract or generate a cover image for every book card.
- **FR-009**: System MUST show indexing, ready, and error states on book cards.
- **FR-010**: System MUST render cover, title, author, format badge, and reading
  progress for each book card.
- **FR-011**: System MUST provide All, PDF, and EPUB filters.
- **FR-012**: System MUST provide Title, Author, Last read, and Date added sort
  options.
- **FR-013**: System MUST persist active filter and sort selections across page
  refreshes via `localStorage`.
- **FR-014**: System MUST navigate ready book cards to `/book/[id]`.
- **FR-015**: System MUST support inline editing of title and author.
- **FR-016**: System MUST delete the local file and cascade dependent database
  rows when the user confirms deletion.
- **FR-017**: System MUST remove partial files and avoid final book rows when an
  upload is interrupted.
- **FR-018**: System MUST serve cover images with long-lived cache headers and
  content-hashed filenames.
- **FR-019**: System MUST run without authentication for the MVP single-user
  local server.

### Constitution Alignment *(mandatory for Open Reader)*

- **Reading Flow**: This feature establishes add, browse, resume entry,
  filtering, metadata correction, and deletion. It does not implement the full
  reader surface, highlights, or notes creation.
- **Local Data Ownership**: Files are stored under `books/`; metadata,
  progress, status, hashes, and deletion cascades are stored in SQLite.
- **PDF/EPUB Behavior**: Upload, metadata extraction, cover extraction,
  indexing status, and card rendering apply to both PDF and EPUB. Corrupt files
  become visible error cards.
- **Search & Memory**: The upload processing job creates book chunks and FTS5
  index entries needed by future search. This spec does not expose the search
  UI.
- **Quality Gates**: Library load under 1 second for 200 books; accepted uploads
  visible within 3 seconds; deterministic errors for invalid inputs; keyboard,
  pointer, and touch operation for upload, filters, menus, dialogs, and inline
  editing.

### Key Entities *(include if feature involves data)*

- **Book**: A local PDF or EPUB with metadata, file path, cover path, status,
  hash, progress summary, and timestamps.
- **ReadingProgress**: The latest known location and percentage for a book.
- **Highlight**: Existing/future annotation rows that must cascade on deletion.
- **Note**: Existing/future note rows that must cascade on deletion.
- **Flashcard**: Existing/future review rows that must cascade on deletion.
- **BookChunk**: Extracted text chunks used for FTS5 search and future AI
  grounding.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A valid PDF or EPUB under 200 MB appears in the library within 3
  seconds of upload completion.
- **SC-002**: The library renders 200 book cards in under 1 second on a local
  development machine after data is loaded.
- **SC-003**: Filter and sort selections survive a hard refresh in all supported
  desktop and mobile viewport widths.
- **SC-004**: Confirmed deletion removes the book file and all dependent rows in
  a single user-visible operation.
- **SC-005**: Upload, filtering, sorting, inline edit, context menu, and delete
  dialog are usable with keyboard and pointer input.

## Assumptions

- The MVP is single-user and self-hosted on a trusted local network or machine.
- Total library quota is out of scope; only per-file upload limit is enforced.
- Full text search UI is out of scope for this feature, but ingestion must
  prepare index data for it.
- The reader view at `/book/[id]` may be a placeholder until the reader feature
  is specified, but the route contract must be stable.
