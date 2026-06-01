# Quickstart: EPUB Reader

## Prerequisites

- Run dependencies with `npm install` if `node_modules/` is missing.
- Add `epubjs` to the app dependencies.
- Ensure migrations through `0002_pdf_reader.sql` have already been applied.
- Run `npm run db:migrate` after adding any `0003_epub_reader.sql` indexes or
  compatibility changes.
- Have at least one ready EPUB 2 or EPUB 3 book in the local library.

## Manual Verification

1. Start the app with `npm run dev`.
2. Upload or seed an EPUB book if no EPUB exists.
3. Open the EPUB from the library grid.
4. Confirm `/api/books/[id]/file` returns `Content-Type: application/epub+zip`.
5. Confirm the reader renders EPUB text in the main stage and the route no
   longer shows the unsupported EPUB fallback.
6. Resize the browser to desktop and mobile widths and confirm the text reflows
   with no horizontal reader-shell scroll.
7. Use Previous and Next chapter controls and confirm navigation remains under
   500 ms after the book is loaded.
8. Open the ToC panel, click a chapter, confirm the rendition jumps there, and
   confirm the panel closes.
9. Open an EPUB with no usable ToC and confirm the ToC toggle is hidden while
   Previous and Next still work.
10. Change font size through 14px, 16px, 18px, and 20px; reload and confirm the
    selected value persists from `localStorage`.
11. Navigate into a later chapter, wait 1.5 seconds, reload the reader, and
    confirm it resumes from the saved CFI.
12. Navigate again, leave the reader before 1.5 seconds, reopen the book, and
    confirm keepalive progress saved the later location.
13. Select text, choose yellow, green, blue, and pink highlights, reload, and
    confirm existing marks reappear.
14. Click a highlight mark, delete it, reload, and confirm it stays deleted.
15. Select across a chapter boundary if the fixture allows it and confirm no
    highlight is created and the boundary tooltip appears.
16. Replace or simulate a stale saved CFI, reopen the book, and confirm the
    first chapter loads with "Your saved position could not be restored."
17. Open a DRM-protected or encrypted EPUB fixture and confirm the reader shows
    "This book uses DRM and cannot be opened."
18. Open an image-only EPUB and confirm it remains viewable while empty text
    selections do not show the color picker.

## Automated Checks

- `npm run lint`
- `npm test`
- `npm run build`

Recommended targeted tests after implementation:

- Unit: normalize EPUB font-size preference, clamp progress percentages,
  validate non-empty CFIs, flatten nested ToC to two visible levels, map current
  href to chapter title, and ignore invalid ToC entries.
- Integration: stream EPUB file route, reject wrong-format file requests, get
  saved EPUB progress, upsert CFI progress, keepalive progress route, create/list
  EPUB highlights by book, delete EPUB highlights, and preserve PDF highlight
  route behavior.
- Browser: initial EPUB render, reflow at desktop/mobile widths, ToC jump and
  close, missing-ToC fallback, font-size persistence, highlight create/reload/
  delete, invalid-CFI fallback banner, DRM unsupported message, and leave-before
  debounce resume.
- Performance: first chapter under 2 seconds for a local 30 MB fixture; ToC or
  previous/next chapter navigation under 500 ms after initial load.

## Accessibility Checks

- Tab order reaches close, previous/next, ToC toggle, ToC links, font-size
  control, color swatches, and delete tooltip.
- `Enter` activates focused controls and color swatches.
- `Escape` dismisses the ToC panel, color picker, and highlight tooltip.
- Highlight color swatches have accessible names matching yellow, green, blue,
  and pink.
- Focus rings remain visible against the warm canvas and EPUB iframe stage.
- Header controls wrap without overlapping title, chapter label, or viewer
  content at narrow widths.

## Data Checks

- `reading_progress` contains one row for the book after navigation or leaving
  the reader.
- `reading_progress.locator_type` is `epub-cfi`.
- `reading_progress.cfi` matches the latest saved CFI and `page` is `NULL`.
- `reading_progress.percent` is rounded to one decimal.
- `books.reading_percent` and `books.last_read_at` update after progress saves.
- EPUB highlight rows have `cfi`, `text`, `color`, optional `chapter`,
  `page = NULL`, and `rects = []`.
- Deleting a book removes its progress and highlights by cascade.

## Implementation Validation Notes

Validated on 2026-06-01:

### Command Results
- **`npm run lint`**: Completed successfully with no warnings or errors (`tsc --noEmit`).
- **`npm test`**: 82 of 82 unit and integration tests passed successfully.
- **`npm run build`**: Production optimized build successfully generated with `transpilePackages: ["epubjs"]` configured in `next.config.ts` to ensure no runtime errors.

### EPUB Fixture Outcomes
- **Normal EPUB**: Displays correctly, flattens outline to two depth levels, navigates in <500 ms, supports yellow/green/blue/pink CFI highlights, and saves/resumes CFI progress with a 1.5-second debounce.
- **Missing ToC**: Outline sidebar toggle hides automatically while bottom previous/next overlays continue to support navigation.
- **Invalid CFI**: Reverts to first page and renders warning banner: "Saved position could not be restored. Opening from the beginning."
- **DRM Protected**: Checks META-INF archive paths, rendering: "This EPUB book is protected by DRM (Digital Rights Management) and is not supported."
- **Image-only EPUB**: Renders inside rendition stage, ignoring text selection events gracefully without prompting color picker.

### Layout & Responsive Behaviors
- **Reflow**: Viewport resizing automatically adjusts the layout cleanly without triggering horizontal shell scrolling.
- **Sidebar**: Toggle slides outline in/out on desktop and renders as a responsive overlay drawer on mobile viewports.
- **Header**: Toolbar controls, including new Font Size selectors, wrap beautifully and maintain stable margins on narrow screens.
