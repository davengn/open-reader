# Spec 005 — Full-text search

## Summary

Full-text search lets the user search for any word or phrase across all books in the library using SQLite's built-in FTS5 engine. At upload time, book text is chunked and indexed. At query time, the search returns ranked results with highlighted snippets, grouped by book.

## User stories

As a reader, I want to search for a term across all my books so that I can find every place where a concept like "two-phase commit" is discussed.

As a reader, I want to see a highlighted snippet around each search result so that I can judge relevance without opening the book.

As a reader, I want to click a search result and jump directly to that page in the reader so that I do not have to scroll to find the passage.

As a reader, I want to filter search results to a single book so that I can search within the book I am currently reading.

## Acceptance criteria

- A search icon in the global header opens a full-width search modal
- The search input auto-focuses when the modal opens
- Results appear within 300 ms of the user stopping typing (300 ms debounce)
- Each result shows: book title, chapter name, page number, and a snippet of up to 200 characters with the matching term(s) wrapped in `<mark>` tags
- Results are grouped by book with a book header row showing the book title and total match count
- Results are sorted within each book by relevance (FTS5 `rank`)
- A book filter dropdown above the results limits results to a single selected book
- Clicking a result navigates to `/book/[id]?page=[page]` and closes the modal
- The modal closes on `Escape` key or clicking the backdrop
- If no results are found, the modal shows: "No results for '[query]'"
- Books with `status = 'indexing'` are excluded from search and a notice reads: "Some books are still being indexed."

## Functional requirements

### Indexing (runs at upload time)

- After saving the file, the server calls `lib/extract/pdf.ts` or `lib/extract/epub.ts` to extract full text
- The extractor splits text into chunks of approximately 500 tokens (≈ 2 000 characters), respecting paragraph boundaries where possible
- Each chunk is inserted as a row in `book_chunks` with `bookId`, `chunkIndex`, `chapter`, `page`, and `content`
- After all chunks are inserted, the FTS5 virtual table `book_chunks_fts` is populated by:
  ```sql
  INSERT INTO book_chunks_fts (rowid, content)
  SELECT id, content FROM book_chunks WHERE bookId = ?;
  ```
- `books.status` is updated to `'ready'` on completion or `'error'` on failure
- Indexing runs synchronously in a background `setImmediate` chain to avoid blocking the upload response

### Query (search endpoint)

- `GET /api/search?q=[query]&bookId=[optional]` handles search
- The endpoint executes:
  ```sql
  SELECT bc.bookId, bc.chapter, bc.page,
         snippet(book_chunks_fts, 0, '<mark>', '</mark>', '…', 32) AS snippet,
         rank
  FROM book_chunks_fts
  JOIN book_chunks bc ON book_chunks_fts.rowid = bc.id
  JOIN books b ON bc.bookId = b.id
  WHERE book_chunks_fts MATCH ? AND b.status = 'ready'
  [AND bc.bookId = ? -- if bookId filter is provided]
  ORDER BY rank
  LIMIT 50;
  ```
- The query string is sanitized: special FTS5 characters (`"`, `*`, `-`, `(`, `)`, `^`) are escaped before being passed to `MATCH`
- Results are grouped client-side by `bookId` before rendering
- The response is `{ results: [{ bookId, bookTitle, chapter, page, snippet }] }`

### Text extraction

**PDF (`lib/extract/pdf.ts`)**
- Uses `pdf-parse` to extract raw text per page
- Each page's text is split into chunks; `page` is the 1-based page number
- `chapter` is left empty for PDFs (PDF chapter detection is out of scope for the MVP)

**EPUB (`lib/extract/epub.ts`)**
- Uses `epub2` to iterate over spine items in order
- Each spine item corresponds to one chapter; `chapter` is the item's `title` from the ToC
- Text is extracted from each item's HTML by stripping tags (`[text content only]`)
- `page` is estimated as `Math.ceil(cumulativeCharCount / 2000)` (approximately 2 000 characters per page)

### Search UI

- The modal is a `<dialog>` element opened via `showModal()`
- The search input has `type="search"` with `placeholder="Search across all books…"`
- While waiting for results (between keypress and API response), a subtle loading spinner appears in the input's trailing slot
- Each result row is a `<button>` (for keyboard navigability) with the book title, chapter/page, and snippet
- Matching terms in the snippet are wrapped in `<mark>` elements styled with the amber highlight color

## Non-functional requirements

### Performance

- Search returns results within 300 ms for a library of 50 books (≈ 5 000 chunks) on localhost
- FTS5 indexing for a 400-page PDF completes within 10 seconds

### Relevance

- FTS5 `rank` (BM25) orders results; no custom ranking in the MVP
- Multi-word queries use `AND` by default (FTS5 default): all terms must appear in the chunk

## Edge cases

### Query is only special characters

- After sanitization, if the query is empty, the search returns no results without executing SQL
- The UI shows: "Type at least one word to search."

### Book deleted while search results are displayed

- The result rows for that book remain visible until the next search
- Clicking such a row calls `GET /api/books/[id]` which returns 404; the app shows: "This book has been deleted."

### Very short query (1–2 characters)

- Queries shorter than 3 characters are not sent to the API (client-side guard)
- The UI shows: "Enter at least 3 characters to search."

### FTS5 index out of sync with book_chunks

- If a chunk is deleted from `book_chunks` (e.g., on book deletion) but the FTS5 row is not removed, the `JOIN` on `rowid` returns no match and the orphaned FTS5 row is silently ignored
- Book deletion triggers `DELETE FROM book_chunks_fts WHERE rowid IN (SELECT id FROM book_chunks WHERE bookId = ?)` before deleting `book_chunks`

### Query returns more than 50 results

- Results are capped at 50 per query; a notice reads: "Showing the top 50 results. Refine your search for more specific results."
