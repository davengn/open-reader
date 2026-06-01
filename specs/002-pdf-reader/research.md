# Research: PDF Reader

## Decision: Render PDFs in the browser with `pdfjs-dist`

**Rationale**: The project already depends on `pdfjs-dist` 5.4.394 and the
constitution prefers proven document libraries. Browser rendering gives native
canvas output, PDF.js text extraction for selection, and worker-based parsing
without adding a backend process.

**Alternatives considered**:

- Server-render pages to images: rejected because it loses native text
  selection and adds expensive server work.
- Iframe/browser PDF viewer: rejected because highlights, text-layer geometry,
  and app-level progress are not controllable.
- Custom PDF parser/renderer: rejected by the constitution and too risky.

## Decision: Serve a public PDF.js worker asset

**Rationale**: `pdfjs-dist` 5 ships `pdf.worker.min.mjs`. The app should copy
that file to `public/pdf.worker.min.mjs` and configure
`GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"` from `lib/pdf/worker.ts`.
This keeps worker loading deterministic in Next.js and avoids bundler-specific
dynamic worker resolution.

**Alternatives considered**:

- Import worker through a bundler URL: rejected because App Router and package
  ESM worker handling can vary by build/runtime.
- CDN worker URL: rejected because core reading must work offline/local-first.
- Inline fake worker: rejected because large PDFs would block the UI thread.

## Decision: Stream local PDF bytes through `GET /api/books/[id]/file`

**Rationale**: Raw files already live under the local `books/` storage root, and
the reader needs a stable URL for PDF.js. A route handler can validate book
existence, format, and safe path resolution, then stream bytes with
`Content-Type: application/pdf`.

**Alternatives considered**:

- Expose filesystem paths to the browser: rejected because it is not portable
  and leaks local path details.
- Store PDFs in SQLite blobs: rejected because the existing storage design keeps
  raw books on disk.
- Read the full file into memory before responding: rejected for large PDFs.

## Decision: Mount only the active page and idle pre-render adjacent pages

**Rationale**: Very large PDFs should not create hundreds of canvases or text
layers. The DOM should contain the active page only; the client can cache the
loaded `PDFDocumentProxy` and queue adjacent page rendering during
`requestIdleCallback` with a timeout fallback.

**Alternatives considered**:

- Render all pages in a scrolling document: rejected for 500+ page memory cost.
- Keep current, previous, and next pages mounted: rejected because selection and
  highlight layers become more complex and the spec only requires one visible
  page.
- No pre-rendering: rejected because adjacent navigation would feel slower on
  large technical PDFs.

## Decision: Store highlight rectangles as page-relative JSON

**Rationale**: Selection rectangles from `Range.getClientRects()` can be
normalized against the page container and the current rendered viewport. Storing
relative `{ x, y, width, height }` values lets highlights render accurately at
different zoom levels and across HiDPI canvases.

**Alternatives considered**:

- Store only selected text: rejected because repeated text cannot be placed
  accurately.
- Store raw viewport pixels: rejected because zoom changes would misalign
  overlays.
- Store PDF quads: deferred because PDF.js text-layer DOM coordinates are enough
  for the MVP and simpler to test.

## Decision: Upsert PDF progress by book through a server action

**Rationale**: The current app already keeps one `reading_progress` row per
book. A server action in `app/book/[id]/actions.ts` can validate the book,
current page, total pages, and percentage, then upsert `locator_type =
"pdf-page"`, `page`, and `percent`. A 1500 ms client debounce avoids excessive
writes during rapid navigation.

**Alternatives considered**:

- Save progress on every key press/click with no debounce: rejected because it
  creates unnecessary synchronous mutations.
- Save only on unload: rejected because it is unreliable and misses crashes.
- Store only `books.reading_percent`: rejected because resume needs exact page.

## Decision: Flush progress with a keepalive route when leaving the reader

**Rationale**: A debounced server action is efficient during normal reading, but
closing the tab or navigating away before the 1500 ms debounce fires can lose
the last page. A small local route under `/api/books/[id]/progress` reuses the
same database mutation and can be called with `sendBeacon` or `fetch` with
`keepalive`.

**Alternatives considered**:

- Reduce the debounce to near-zero: rejected because continuous scrolling would
  create too many writes.
- Rely only on React unmount cleanup with the server action: rejected because
  navigation can cancel the underlying request.

## Decision: Use PDF outlines as the left navigation source

**Rationale**: Long technical PDFs are better navigated by chapters and
sections than by a generated list of every page. `pdfDoc.getOutline()` exposes
the PDF's bookmarks/table of contents, and destinations can be resolved with
`getDestination()` and `getPageIndex()` without persisting extra data.

**Alternatives considered**:

- Keep a generated page rail: rejected because it becomes noisy for 500+ page
  books and does not match the requested bookmarks panel.
- Persist the outline in SQLite: rejected for now because outline extraction is
  fast enough after PDF load and does not need local search semantics yet.

## Decision: Handle scanned PDFs through text-content detection

**Rationale**: If `page.getTextContent()` returns no text items, the text layer
is empty and selection cannot produce a useful highlight. A visible banner keeps
the limitation clear without blocking page reading.

**Alternatives considered**:

- OCR scanned pages automatically: rejected as out of scope and potentially
  compute-heavy for local MVP.
- Show the color picker for empty selections: rejected because it cannot create
  meaningful highlight anchors.
