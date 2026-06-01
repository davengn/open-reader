# Quickstart: Book Library

This quickstart validates the first Open Reader feature once implementation
tasks are complete.

## Prerequisites

- Node.js version selected by the scaffold
- Package manager selected by the scaffold
- SQLite available through `better-sqlite3`
- Local write access to `reader.db` and `books/`
- Two small fixture books: one valid PDF and one valid EPUB

## Local Setup

```powershell
npm install
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`.

## Smoke Test

1. Start with an empty `books/` directory and fresh `reader.db`.
2. Open the library page.
3. Verify the first screen shows the usable library surface, not a marketing
   hero: upload control, filter/sort toolbar, and empty upload prompt.
4. Upload a valid PDF under 200 MB.
5. Verify the card appears within 3 seconds with `indexing` status.
6. Wait for processing to complete or poll `GET /api/books/[id]/status`.
7. Verify the card shows title, author, PDF badge, cover/placeholder, and
   reading progress.
8. Upload a valid EPUB and repeat the same checks.

## Validation Scenarios

### Upload Validation

- Upload a `.txt` file and verify "Only PDF and EPUB files are supported".
- Upload a file over 200 MB and verify "File exceeds the 200 MB limit".
- Upload the same PDF twice and verify duplicate detection names the existing
  book.
- Interrupt an upload and verify no final book row or partial file remains.

### Library Interaction

- Switch filters between All, PDF, and EPUB.
- Sort by Title, Author, Last read, and Date added.
- Refresh the page and verify selected filter/sort values persist.
- Use keyboard navigation to reach upload, filter, sort, book card menu,
  metadata edit controls, and delete dialog actions.

### Metadata Edit

- Open inline edit on a book card.
- Change title and author.
- Save, refresh, and verify the new values persist in SQLite and on the card.

### Deletion

- Delete a book that has progress, chunks, and generated cover data.
- Verify the raw file and cover file are removed.
- Verify `books`, `reading_progress`, `highlights`, `notes`, `flashcards`,
  `book_chunks`, and FTS rows no longer contain that book's data.
- Cancel a delete dialog and verify no data changes.

## Performance Checks

- Seed 200 book rows with mixed PDF/EPUB formats and varied progress.
- Load the library and verify the page renders in under 1 second after data is
  available.
- Confirm card dimensions remain stable while covers and status labels render.
- Confirm cover responses include long-lived cache headers.

## Design and Accessibility Checks

- Confirm the page uses `DESIGN.md` tokens: warm canvas, restrained coral
  primary action, hairline borders, 8-12 px radius, and the documented type
  hierarchy.
- Confirm no Claude or Anthropic brand names, marks, or product copy are
  visible.
- Confirm controls have visible focus states and at least 40 px target height
  where practical.
- Confirm error messages appear near the upload/edit control that caused them.
- Confirm loading, empty, indexing, ready, error, duplicate, and delete-cancel
  states are visually distinct.

## Expected Commands

```powershell
npm run lint
npm run test
npm run test:e2e
npm run build
```

Exact command names may change during scaffold, but implementation is not done
until linting, unit/integration tests, browser tests, and production build pass.
