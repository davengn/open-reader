# Quickstart: PDF Reader

## Prerequisites

- Run dependencies with `npm install` if `node_modules/` is missing.
- Ensure the first feature migration has already created `reader.db`.
- Run `npm run db:migrate` after adding `0002_pdf_reader.sql`.
- Copy the PDF.js worker from `node_modules/pdfjs-dist/build/pdf.worker.min.mjs`
  to `public/pdf.worker.min.mjs`, or add a project script that performs the
  copy before `next dev` and `next build`.

## Manual Verification

1. Start the app with `npm run dev`.
2. Upload a PDF through the library if no PDF book exists.
3. Open the PDF from the library grid.
4. Confirm `/api/books/[id]/file` returns `Content-Type: application/pdf`.
5. Confirm page 1 renders as a canvas with selectable text over it.
6. Change zoom through 75%, 100%, 125%, 150%, and 200%; the page re-renders and the selected zoom persists after reload.
7. Navigate with Previous, Next, direct page input, `ArrowRight`, `j`, `ArrowLeft`, and `k`.
8. Use the left bookmarks panel to jump to a chapter or section and confirm the destination page scrolls into view.
9. Scroll vertically through the document and confirm the current page, page input, and progress label update as pages pass through the viewport.
10. Open a PDF with no outline and confirm the left panel shows an empty bookmarks state rather than a generated `1, 2, 3...` list.
11. Return to the library and confirm book cards have enough width for covers, titles, badges, progress, and actions without feeling compressed.
12. Wait 1.5 seconds after a page change, reload the book, and confirm it opens to the last saved page.
13. Navigate to a later page, leave the reader before 1.5 seconds, reopen the book, and confirm it resumes at that later page.
14. Select text, choose each highlight color once, reload the page, and confirm existing highlights reappear.
15. Click a highlight, delete it, reload, and confirm it stays deleted.
16. Open the same book in a second tab, delete a highlight there, focus the first tab, and confirm the current rendered page window refetches.
17. Test a scanned/image-only PDF page and confirm the scanned-page banner appears and no color picker opens.
18. Force or mock a `page.render()` failure and confirm the page placeholder appears while navigation still works.

## Automated Checks

- `npm run lint`
- `npm test`
- `npm run build`

Recommended targeted tests after implementation:

- Unit: normalize zoom preference, clamp page input, compute one-decimal progress, normalize selection rects, flatten PDF bookmarks.
- Integration: stream PDF route, highlight create/list/delete, progress upsert, keepalive progress route, cascade delete.
- Browser: keyboard navigation, selection color picker, highlight delete tooltip, scanned-page banner, render-error fallback.
- Browser: left bookmarks panel jump, empty bookmark state, vertical continuous scroll current-page updates, leave-before-debounce resume, and library card width at desktop/mobile breakpoints.
- Performance: first page under 2 seconds for a local 50 MB fixture; adjacent navigation under 500 ms after initial load.

## Accessibility Checks

- Tab order reaches close, previous/next, page input, zoom, color swatches, and delete tooltip.
- `Enter` selects a focused color swatch.
- `Escape` dismisses color picker and tooltip.
- Native text selection and `Ctrl+C` copy selected text from the PDF text layer.
- Focus rings are visible against the warm canvas and document stage.

## Data Checks

- `reading_progress` contains one row for the book after navigation or leaving the reader.
- `reading_progress.locator_type` is `pdf-page`.
- `reading_progress.page` matches the last saved page.
- `reading_progress.percent` is rounded to one decimal.
- `highlights.rects` parses as a non-empty JSON array.
- Deleting a book removes its progress and highlights by cascade.

## Implementation Validation Notes

Validated on 2026-06-01:

- `npm.cmd test`: 17 test files passed, 47 tests passed.
- `npm.cmd run lint`: TypeScript completed with no errors.
- `npm.cmd run build`: Next.js production build completed successfully.
- Local browser smoke test: opened `http://127.0.0.1:3000`, verified the library renders, opened the unsupported EPUB fallback, then created and removed a disposable one-page PDF fixture to verify the PDF reader header, page controls, zoom select, rendered canvas/text layer, and lack of console errors.
- Refinement browser smoke test: verified desktop book cards render at 260 px, opened a 754-page PDF, confirmed the left navigation panel renders, page 20 navigation scrolls into view, vertical scrolling updates the current page to 21, the stage remains viewport-height, and only five PDF canvases are mounted near the active page.
- Bookmark/resume refinement: replaced the generated page rail with PDF outline bookmarks, added a keepalive progress save for tab hide/unmount, refreshed stale stored PDF page counts during progress saves, and guarded initial scroll restore so page 1 cannot overwrite the saved page before the restored page is scrolled into view.
- Bookmark/resume browser smoke test: opened a 754-page PDF with 495 outline entries, jumped through the bookmarks panel to page 66, closed and reopened the reader, confirmed it resumed on page 66, and confirmed there were no console errors. Screenshot: `.tmp/pdf-reader-bookmarks-resume-smoke.png`.

Current caveat:

- The repository still has no Playwright dependency or executable e2e runner. The `tests/e2e/*.spec.ts` files capture the required browser scenarios as dependency-free specs so they do not break TypeScript; converting them to executable browser automation should happen when the project adopts an e2e harness.
