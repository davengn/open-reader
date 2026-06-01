# Spec 002 — PDF reader

## Summary

The PDF reader renders PDF pages in the browser using `pdfjs-dist`, enables the user to highlight selected text in one of four colors, and automatically saves reading progress (current page) so the user resumes at the same page on every visit.

## User stories

As a reader, I want to open a PDF and read it page by page with smooth rendering so that the reading experience feels natural.

As a reader, I want to select text and assign a highlight color so that I can mark important passages for later review.

As a reader, I want my reading position saved automatically so that I resume exactly where I stopped.

As a reader, I want to jump to any page by typing a page number so that I can navigate long technical books quickly.

As a reader, I want to adjust zoom level so that I can read comfortably on any screen.

## Acceptance criteria

- PDF pages render as a canvas layer with a transparent text layer on top for selection
- Pages render at the user's chosen zoom level (75%, 100%, 125%, 150%, 200%); default 100%
- The reader shows a sticky header with: book title, current page / total pages, zoom control, and a close button
- Selecting text and releasing the mouse shows a highlight color picker (yellow, green, blue, pink)
- Clicking a color creates a highlight and dismisses the picker
- Highlights are visually rendered on the page as colored overlays
- Existing highlights are visible when the page loads
- Clicking an existing highlight opens a tooltip with a Delete option
- Reading progress (current page) is saved automatically via a debounced server action 1.5 seconds after the last page change
- On opening a book, the reader scrolls to the last saved page
- Page navigation via Previous / Next buttons and a direct page number input
- Keyboard shortcuts: `ArrowRight` / `j` = next page, `ArrowLeft` / `k` = previous page

## Functional requirements

### Rendering

- The PDF is fetched from `GET /api/books/[id]/file` which streams the raw bytes with `Content-Type: application/pdf`
- `pdfjs-dist` loads the document via `pdfjsLib.getDocument({ url })` with the worker configured at `/pdf.worker.min.js`
- Each page renders into a `<canvas>` element sized to the page's natural dimensions multiplied by `devicePixelRatio` for sharp rendering on HiDPI screens
- A transparent `<div>` with class `pdf-text-layer` is positioned absolutely over the canvas and populated by `pdfjs-dist`'s `TextLayer` API to enable native text selection
- Only the visible page (or two pages in dual-page mode) is rendered at a time; adjacent pages are queued for pre-render

### Highlights

- On `mouseup`, if `window.getSelection().toString().trim()` is non-empty, the color picker floats at the midpoint of the selection bounding rect
- Highlight data stored: `bookId`, `page`, `text`, `color`, `rects` (JSON array of `{x, y, width, height}` relative to the page)
- Highlight overlays are absolutely-positioned `<div>` elements with 40% opacity over the canvas, rendered by a React component that reads from local state (populated on page load from `GET /api/highlights?bookId=[id]&page=[n]`)
- Saving a highlight calls `POST /api/highlights` and optimistically adds it to local state
- Deleting a highlight calls `DELETE /api/highlights/[id]` and removes it from local state

### Progress tracking

- `reading_progress` has one row per book (upserted)
- On page change, a `useEffect` sets a 1 500 ms debounce timer; on expiry it calls the `updateProgress` server action with `{ bookId, currentPage, percentage }`
- `percentage` = `currentPage / totalPages * 100` rounded to one decimal

### Navigation

- Previous / Next buttons are disabled at page 1 and page N respectively
- The page number input accepts any integer in `[1, totalPages]`; out-of-range values snap to the nearest bound
- Typing in the page input and pressing `Enter` navigates immediately (no debounce)

### Zoom

- Zoom levels offered: 75%, 100%, 125%, 150%, 200%
- The chosen zoom level is stored in `localStorage` under `reader.zoom` and restored on next open
- Changing zoom re-renders the current page at the new scale

## Non-functional requirements

### Performance

- First page renders within 2 seconds for PDFs up to 50 MB on localhost
- Page navigation renders the next page within 500 ms
- Pre-rendering the adjacent page must not block the UI thread; use `requestIdleCallback`

### Accessibility

- Text layer supports native browser text selection and copy (`Ctrl+C`)
- Color picker is keyboard-navigable; `Tab` moves between colors, `Enter` selects

## Edge cases

### PDF with no text layer (scanned document)

- If a page has no extractable text (image-only), the text layer is empty
- The color picker does not appear on mouse release (no selection)
- A banner displays: "This page appears to be a scanned image. Text selection is not available."

### PDF rendering error on a page

- If `page.render()` rejects, the canvas shows a gray placeholder with: "Page [n] could not be rendered."
- Other pages remain functional

### Selection spans across line breaks / columns

- The color picker appears using the bounding rect of the full selection, even if it wraps multiple lines
- All constituent rects are stored in `highlights.rects` to allow accurate overlay rendering

### Very large PDFs (500+ pages)

- The reader does not pre-load all pages; only the current and ±1 pages are in the DOM
- Total pages are read from `pdfDoc.numPages` immediately after load; no full scan needed

### Highlight deleted from another tab

- Local state may be stale if the user has two tabs open; a `focus` event on the window triggers a re-fetch of highlights for the current page
