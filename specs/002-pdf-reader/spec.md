# Spec 002 - PDF Reader

## Summary

The PDF reader renders PDF pages in the browser using `pdfjs-dist`, enables the
user to highlight selected text in one of four colors, and automatically saves
reading progress so the user resumes at the same page on every visit. The
reader uses a Sumatra-style continuous vertical page flow with a persistent left
bookmarks panel that shows the PDF table of contents for quick jumps.

## User Stories

As a reader, I want to open a PDF and read it page by page with smooth rendering
so that the reading experience feels natural.

As a reader, I want to select text and assign a highlight color so that I can
mark important passages for later review.

As a reader, I want my reading position saved automatically so that I resume
exactly where I stopped.

As a reader, I want to jump to any page by typing a page number so that I can
navigate long technical books quickly.

As a reader, I want to adjust zoom level so that I can read comfortably on any
screen.

As a reader, I want a left bookmarks panel with the book's table of contents so
that I can jump to chapters and sections without scanning hundreds of page
numbers.

As a reader, I want pages to continue vertically as I scroll so that moving
through a PDF feels like a desktop PDF reader rather than a single-page viewer.

## Acceptance Criteria

- PDF pages render as a canvas layer with a transparent text layer on top for selection.
- Pages render at the user's chosen zoom level: 75%, 100%, 125%, 150%, or 200%. Default is 100%.
- The reader shows a sticky header with book title, current page / total pages, zoom control, and a close button.
- Selecting text and releasing the mouse shows a highlight color picker: yellow, green, blue, pink.
- Clicking a color creates a highlight and dismisses the picker.
- Highlights are visually rendered on the page as colored overlays.
- Existing highlights are visible when the page loads.
- Clicking an existing highlight opens a tooltip with a Delete option.
- Reading progress is saved automatically via a debounced server action 1.5 seconds after the last page change.
- On opening a book, the reader scrolls to the last saved page without briefly
  overwriting progress with page 1.
- If the reader is closed or hidden before the debounce fires, the current page
  is still flushed as the next resume point.
- Page navigation supports Previous / Next buttons and a direct page number input.
- Keyboard shortcuts: `ArrowRight` / `j` navigate to next page; `ArrowLeft` / `k` navigate to previous page.
- The reading page includes a left bookmarks panel with PDF table-of-contents entries, destination pages, and current reading progress.
- Scrolling vertically reveals the next or previous page and updates the current page indicator.
- The reader keeps a small window of nearby PDF canvases mounted while maintaining scrollable page slots for the full document.
- Home page book cards are wide enough for covers, title text, badges, progress, and actions to scan comfortably on desktop and mobile.

## Functional Requirements

### Rendering

- The PDF is fetched from `GET /api/books/[id]/file`, which streams the raw bytes with `Content-Type: application/pdf`.
- `pdfjs-dist` loads the document via `pdfjsLib.getDocument({ url })` with the worker configured from the app's public worker asset.
- Each page renders into a `<canvas>` element sized to the page's natural dimensions multiplied by `devicePixelRatio` for sharp rendering on HiDPI screens.
- A transparent `<div>` with class `pdf-text-layer` is positioned absolutely over the canvas and populated by `pdfjs-dist`'s `TextLayer` API to enable native text selection.
- The reader presents every page as a vertical scroll slot, but only the current
  page and nearby pages are mounted as PDF canvas/text-layer renders.
  Non-rendered slots use stable placeholders so the scroll flow remains
  continuous without preloading the whole PDF.
- The current page is the visible page nearest the scroll viewport reading
  center, updated through `IntersectionObserver`.

### Highlights

- On `mouseup`, if `window.getSelection().toString().trim()` is non-empty, the color picker floats at the midpoint of the selection bounding rect.
- Highlight data stored: `bookId`, `page`, `text`, `color`, `rects` as a JSON array of `{ x, y, width, height }` relative to the rendered page.
- Highlight overlays are absolutely positioned `<div>` elements with 40% opacity over the canvas and rendered from local React state populated by `GET /api/highlights?bookId=[id]&page=[n]`.
- Saving a highlight calls `POST /api/highlights` and optimistically adds it to local state.
- Deleting a highlight calls `DELETE /api/highlights/[id]` and removes it from local state.

### Progress Tracking

- `reading_progress` has one row per book and is upserted by `bookId`.
- On page change, a `useEffect` sets a 1500 ms debounce timer. On expiry it calls the `updateProgress` server action with `{ bookId, currentPage, percentage }`.
- `percentage` equals `currentPage / totalPages * 100` rounded to one decimal.
- While scrolling continuously, progress is saved for the page nearest the
  viewport reading center.

### Navigation

- Previous / Next buttons are disabled at page 1 and page N respectively.
- The page number input accepts any integer in `[1, totalPages]`; out-of-range values snap to the nearest bound.
- Typing in the page input and pressing `Enter` navigates immediately.
- The left bookmarks panel lists PDF outline/bookmark entries from
  `pdfDoc.getOutline()`, resolves named destinations to pages, and clicking an
  entry scrolls its destination page into view.
- The panel does not synthesize a `1, 2, 3, 4...` page list. If a PDF has no
  outline, it shows an empty bookmarks state while direct page input remains in
  the header.
- On narrow screens, the bookmarks panel collapses to a compact horizontal
  contents strip.

### Zoom

- Zoom levels offered: 75%, 100%, 125%, 150%, and 200%.
- The chosen zoom level is stored in `localStorage` under `reader.zoom` and restored on next open.
- Changing zoom re-renders the current page at the new scale.

## Non-Functional Requirements

### Performance

- First page renders within 2 seconds for PDFs up to 50 MB on localhost.
- Page navigation renders the next page within 500 ms.
- Pre-rendering the adjacent page must not block the UI thread; use `requestIdleCallback` with a timeout fallback.

### Accessibility

- Text layer supports native browser text selection and copy with `Ctrl+C`.
- Color picker is keyboard navigable; `Tab` moves between colors, `Enter` selects.
- Reader header, page input, zoom control, close button, highlight tooltip, and delete action have visible focus states.

## Edge Cases

### PDF With No Text Layer

- If a page has no extractable text, the text layer is empty.
- The color picker does not appear on mouse release.
- A banner displays: "This page appears to be a scanned image. Text selection is not available."

### PDF Rendering Error On A Page

- If `page.render()` rejects, the canvas area shows a gray placeholder with: "Page [n] could not be rendered."
- Other pages remain functional.

### Selection Spans Across Line Breaks Or Columns

- The color picker appears using the bounding rect of the full selection, even if it wraps multiple lines.
- All constituent rects are stored in `highlights.rects` to allow accurate overlay rendering.

### Very Large PDFs

- The reader does not pre-load all pages; only the current page window is
  rendered as PDF canvases while lightweight page slots preserve vertical scroll.
- Total pages are read from `pdfDoc.numPages` immediately after load; no full scan is required.

### PDF With No Bookmarks

- The left panel shows that no bookmarks are available.
- Direct page input, Previous / Next, keyboard shortcuts, and continuous scroll
  remain functional.

### Highlight Deleted From Another Tab

- Local state may be stale if the user has two tabs open; a `focus` event on the window triggers a re-fetch of highlights for the current page.
