# Spec 001 — Book library

## Summary

The book library is the home screen of the app. It lets the user upload PDF and EPUB files, browse their collection as a card grid, and open a book to read. Books are stored on the local filesystem; metadata and reading progress are persisted in SQLite.

## User stories

As a reader, I want to upload a PDF or EPUB file so that it appears in my library and I can open it.

As a reader, I want to see each book's cover, title, author, and reading progress at a glance so that I can pick up where I left off.

As a reader, I want to filter my library by format (PDF / EPUB) and sort by title, author, or last read so that I can find books quickly.

As a reader, I want to delete a book from the library so that I can remove books I no longer need.

## Acceptance criteria

- Drag-and-drop or click-to-browse upload accepts `.pdf` and `.epub` files only
- Files larger than 200 MB display the error: "File exceeds the 200 MB limit"
- Unsupported file types display the error: "Only PDF and EPUB files are supported"
- After a successful upload, the book appears in the library grid within 3 seconds
- Each book card shows: cover image (or a generated placeholder), title, author, format badge, and a reading progress bar (0–100%)
- Format filter has three states: All, PDF, EPUB
- Sort options: Title (A–Z), Author (A–Z), Last read (most recent first), Date added (newest first)
- Active filter and sort selections persist across page refreshes via `localStorage`
- Clicking a book card navigates to `/book/[id]`
- A book can be deleted via a confirmation dialog; deletion removes the file from disk and all related rows from the database
- An empty library shows an illustrated upload prompt instead of an empty grid

## Functional requirements

### Upload

- The upload zone accepts files via drag-and-drop and via a native file picker
- On file selection, the app calls `POST /api/books` with a `multipart/form-data` body
- The API route saves the file to `/books/[uuid].[ext]` on disk
- After saving the file, the route spawns a background indexing job (see Spec 005 — Full-text search) and returns a `202 Accepted` response immediately so the UI is not blocked
- The book record is inserted into the `books` table with `status = 'indexing'`; the status updates to `'ready'` once indexing completes
- During indexing, the book card shows a subtle spinner; once ready, it renders normally

### Cover extraction

- For PDF files, the server renders page 1 at 300×400 px using `pdfjs-dist` in a Node worker and stores the image at `/books/covers/[uuid].jpg`
- For EPUB files, the server extracts the cover image declared in the manifest; if none is declared, falls back to a generated placeholder
- Placeholder covers use the book's title initials on a muted background color derived from the title string

### Metadata

- Title and author are extracted from the file's embedded metadata (PDF `Info`, EPUB `dc:title` / `dc:creator`)
- If metadata is missing, title defaults to the filename (without extension) and author defaults to "Unknown"
- The user can edit title and author inline on the library card via a pencil icon

### Grid and filtering

- The grid uses `auto-fill` columns with a minimum card width of 160 px
- Filter and sort controls sit above the grid in a sticky toolbar
- Filtering is client-side (no additional API calls after the initial page load)
- Books without a `lastReadAt` value sort to the bottom when sorting by "Last read"

### Deletion

- The delete action is exposed via a `⋯` context menu on each card
- Clicking Delete opens a modal: "Delete [title]? This will remove the file and all highlights, notes, and flashcards." with Cancel and Delete buttons
- On confirmation, the app calls `DELETE /api/books/[id]`
- The API deletes the file from disk, then deletes the `books` row (cascades to `reading_progress`, `highlights`, `notes`, `flashcards`, `book_chunks`)

## Non-functional requirements

### Performance

- The library page loads in under 1 second for up to 200 books
- Cover images are served with a `Cache-Control: max-age=31536000` header and a content-based hash in the filename to enable long-term caching

### Storage

- Uploaded files are stored at `/books/[uuid].[ext]`; the path is stored in `books.filePath`
- Cover images are stored at `/books/covers/[uuid].jpg`
- The app enforces no total storage quota; if disk write fails, the upload returns a 500 with: "Upload failed: disk write error"

### Security

- The app runs as a single-user local server; no authentication is required in the MVP

## Edge cases

### Duplicate file upload

- If the user uploads a file with the same byte content as an existing book (detected via SHA-256 hash), the app displays a warning: "This file is already in your library as [title]." and does not create a duplicate

### Upload interrupted mid-transfer

- If the HTTP request is interrupted, the partially written file is deleted from disk and the database row is not created
- The user sees: "Upload failed. Please try again."

### Corrupt or invalid PDF/EPUB

- If `pdf-parse` or `epub2` throws during text extraction, `books.status` is set to `'error'`
- The book card shows an error badge; the user can still delete the book but cannot open it
- The card tooltip reads: "This file could not be processed. It may be corrupt."

### Indexing takes longer than 30 seconds

- If the background indexing job exceeds 30 seconds (e.g., a 200 MB PDF), the status remains `'indexing'`; no timeout error is shown
- The book becomes openable once indexing finishes; the spinner disappears automatically via a polling `GET /api/books/[id]/status` every 3 seconds

### Empty search/filter result

- If the active filter or sort returns zero books, the grid shows: "No books match your filter." with a button to clear the filter
