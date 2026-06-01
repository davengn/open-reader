# Spec 003 — EPUB reader

## Summary

The EPUB reader renders reflowable EPUB books in the browser using `epubjs`, enables text highlighting in four colors, and saves reading position using EPUB CFI (Canonical Fragment Identifier) so the user resumes at exactly the same location in the text.

## User stories

As a reader, I want to open an EPUB and read it with reflowable text so that it adapts to any screen width.

As a reader, I want to highlight selected text in the EPUB and have it persist across sessions so that I can review my annotations later.

As a reader, I want my reading position saved by CFI so that I return to the exact paragraph I stopped at, not just the chapter.

As a reader, I want to customize font size so that I can read comfortably.

As a reader, I want a table of contents panel so that I can navigate between chapters directly.

## Acceptance criteria

- EPUB content renders in a full-width iframe managed by `epubjs`
- Text reflows to fit the container; no horizontal scrolling
- The reader shows a sticky header with: book title, chapter title, font size control, ToC toggle, and a close button
- The table of contents panel lists all chapters; clicking a chapter navigates to it and closes the panel
- Selecting text shows a highlight color picker (yellow, green, blue, pink)
- Clicking a color saves the highlight and renders a colored mark in the text
- Existing highlights render on load via `epubjs` annotations API
- Clicking an existing highlight mark opens a tooltip with a Delete option
- Reading position (CFI) is saved 1 500 ms after the last navigation, via a debounced server action
- On reopening a book, the reader displays from the saved CFI location
- Font size options: 14px, 16px, 18px, 20px; default 16px; persisted in `localStorage`

## Functional requirements

### Rendering

- The EPUB file is fetched from `GET /api/books/[id]/file` as an `ArrayBuffer`
- `ePub()` is initialized with the `ArrayBuffer`; the book renders into a `<div id="epub-viewer">` via `book.renderTo('epub-viewer', { width: '100%', flow: 'paginated' })`
- `epubjs` is loaded as a client-side-only module (`'use client'` + dynamic import with `ssr: false`)
- Chapter title displayed in the header is read from `rendition.currentLocation().start.href` mapped against the ToC

### Highlights

- On text selection, `rendition.on('selected', (cfiRange, contents))` fires; the color picker is shown at the cursor position
- On color selection: `rendition.annotations.add('highlight', cfiRange, {}, null, 'hl-[color]', { fill: colorHex, 'fill-opacity': '0.4' })` renders the mark
- `POST /api/highlights` is called with `{ bookId, cfi: cfiRange, text: selectedText, color }`
- On page load, all highlights for the book are fetched from `GET /api/highlights?bookId=[id]` and re-applied via `rendition.annotations.add` for each row
- Clicking a highlight mark triggers `rendition.on('markClicked', (cfiRange))` which identifies the matching highlight by CFI and shows the Delete tooltip
- Deletion: `rendition.annotations.remove(cfiRange, 'highlight')`, then `DELETE /api/highlights/[id]`

### Progress tracking

- CFI location is read on every `rendition.on('relocated', location)` event: `location.start.cfi`
- A 1 500 ms debounced server action upserts `reading_progress` with `{ bookId, currentCfi, percentage: location.start.percentage * 100 }`
- On book open, `GET /api/books/[id]/progress` returns `{ currentCfi }`; if non-null, `rendition.display(currentCfi)` is called after render

### Table of contents

- ToC is built from `book.navigation.toc` after the book loads
- The panel renders as a slide-in sidebar (not a modal) on the left, 280 px wide
- Each ToC item shows its label and is indented to reflect nesting level (max 2 levels shown)
- Clicking an item calls `rendition.display(item.href)` and closes the panel

### Font size

- Font size is applied via `rendition.themes.fontSize(size + 'px')` after render
- The chosen value is saved to `localStorage` under `epub.fontSize` and restored on next open

## Non-functional requirements

### Performance

- EPUB renders first chapter within 2 seconds for files up to 30 MB on localhost
- Chapter navigation renders within 500 ms

### Compatibility

- EPUB 2 and EPUB 3 files are both supported
- DRM-protected (LCP) EPUBs are not supported; the reader displays: "This book uses DRM and cannot be opened."

## Edge cases

### EPUB with missing or malformed ToC

- If `book.navigation.toc` is empty, the ToC button is hidden
- The reader remains functional; navigation is limited to Next / Previous chapter buttons

### CFI becomes invalid after re-upload

- If a book is re-uploaded (same ID, new file), stored CFIs may not resolve in the new content
- On a CFI resolution error, `epubjs` throws; the reader catches it and falls back to displaying chapter 1
- A banner shows: "Your saved position could not be restored."

### Highlight CFI range spans chapter boundary

- `epubjs` does not support cross-chapter CFI ranges; selection is clamped to within a single chapter
- The color picker does not appear if the selection crosses a chapter boundary; a tooltip reads: "Highlights cannot span chapters."

### EPUB with no text content (image-only comic EPUB)

- If all spine items are image-only, text selection returns nothing
- The color picker does not appear; the reader functions as an image viewer

### Very long single-chapter EPUB

- If the chapter is too long to paginate, `epubjs` switches to scroll mode automatically
- Reading position is still tracked via CFI; no special handling required
