# Quickstart: Highlights and Notes

## Prerequisites

- Run `npm install` if `node_modules/` is missing.
- Ensure migrations through `0003_epub_reader.sql` have already been applied.
- Add and run `0004_highlights_notes.sql` after implementing note indexes,
  optional `created_at`, and `notes_fts` triggers.
- Have at least one ready PDF and one ready EPUB in the local library.
- Create at least one highlight in each format before verifying the panel.

## Manual Verification

1. Start the app with `npm run dev`.
2. Open a ready PDF book with existing highlights.
3. Activate the bookmark icon in the reader header and confirm the notes panel
   opens on the right.
4. Confirm the PDF reader area shrinks on desktop rather than being covered by
   the panel.
5. Reload the reader and confirm the panel open/closed state restores from
   `localStorage.reader.notesPanel`.
6. Confirm highlight rows are grouped by chapter or `Uncategorized`, show a
   color bar, excerpt, page label, and note indicator.
7. Click a PDF highlight row and confirm the reader scrolls to its page.
8. Open `Add note`, type Markdown text, wait 800 ms, and confirm the saved
   indicator appears.
9. Reload and confirm the note remains attached to the highlight.
10. Edit the note, wait for autosave, reload, and confirm the updated content.
11. Clear the note to whitespace, wait for autosave, and confirm the note is
    deleted and the action changes back to `Add note`.
12. Use `Add page note` on a PDF page, type text, wait for save, reload, and
    confirm the standalone note appears interleaved by page.
13. Repeat panel open, note save, standalone note, and source navigation checks
    in an EPUB book; EPUB items should display a CFI reference when no page is
    available.
14. Delete a highlight while its editor is open, type another character, and
    confirm the next save converts the note to standalone with the documented
    message.
15. Simulate a save failure and confirm the textarea border turns red and shows
    `Save failed. Your changes are not saved.`
16. Enter more than 50,000 characters or paste over the limit and confirm the
    client blocks additional input and the API rejects oversized content.
17. Activate Export and confirm `/api/books/[id]/export` downloads a `.md` file
    named from the book title.
18. Open the export and confirm title, author, exported timestamp, chapter
    headings, blockquoted highlight text, metadata, attached notes, standalone
    notes, and separators.
19. Export a book with no highlights or notes and confirm the file contains
    `No highlights or notes yet.`
20. Resize to mobile width and confirm the panel behaves as a drawer without
    overlapping header controls or trapping focus incorrectly.

## Automated Checks

- `npm run lint`
- `npm test`
- `npm run build`

Recommended targeted tests after implementation:

- Unit: note content validation, whitespace delete behavior, 50,000 character
  limit, panel preference parsing, annotation sorting, excerpt truncation,
  filename sanitization, Markdown export formatting, and FTS query sanitation.
- Integration: whole-book highlight listing for PDF and EPUB, include-notes
  highlight listing, create attached note, update note, whitespace delete,
  standalone PDF note, standalone EPUB note, highlight-deleted detach fallback,
  notes search, and Markdown export response headers/body.
- Browser: PDF panel toggle and shrink behavior, EPUB panel toggle and shrink
  behavior, autosave saved/error states, source navigation, standalone notes,
  panel preference restore, mobile drawer behavior, keyboard flow, and export
  download.
- Regression: existing PDF highlight create/list/delete, EPUB highlight
  create/list/delete, PDF progress saving, EPUB CFI progress saving, PDF
  outline, and EPUB ToC navigation.

## Accessibility Checks

- Bookmark toggle has an accessible name and visible focus ring.
- Tab order reaches panel close, export, item buttons, textareas, delete
  controls, and source navigation targets.
- Textareas announce save failure through an accessible status or alert region.
- `Escape` closes transient editor/error affordances without losing unsaved
  content.
- Icon-only controls have `aria-label` and title text.
- Panel content remains scrollable with keyboard and touch input.
- Focus is not trapped on desktop; mobile drawer focus behavior is deterministic
  and returns to the toggle on close.

## Data Checks

- Attached notes have `book_id`, `highlight_id`, `content`, `updated_at`, and
  either inherited or supplied `page`/`cfi`.
- Standalone notes have `highlight_id IS NULL` and a valid `page` or `cfi`.
- One highlight has at most one attached note.
- Whitespace saves remove the note row.
- `notes_fts` contains a matching row after insert/update and removes it after
  delete.
- Deleting a book removes notes by cascade.
- Deleting a highlight sets attached note `highlight_id` to null or allows the
  next save to detach the note as standalone without data loss.

## Implementation Validation Notes

- `npm run lint`: Passed on 2026-06-01 via `tsc --noEmit`.
- `npm test`: Passed on 2026-06-01 with 32 test files and 109 tests passing.
  Vitest printed its existing `vite-tsconfig-paths` deprecation warning.
- `npm run build`: First run compiled but failed page-data collection with stale
  `.next` route metadata for `/api/books/[id]`; after safely removing `.next`,
  the rerun passed and listed `/api/books/[id]/export`, `/api/notes`, and
  `/api/notes/[id]`. Final verification reruns of `npm run lint`, `npm test`,
  and `npm run build` also passed from the completed task tree.
- Fixture coverage added for PDF highlights, EPUB highlights, attached notes,
  standalone PDF notes, standalone EPUB notes, highlight-deleted detach fallback,
  FTS note search, deletion cascade cleanup, Markdown export, empty export, and
  missing-book export errors.
- Browser smoke check on `http://127.0.0.1:3000`: library loaded, PDF reader
  opened, bookmark notes toggle appeared, notes panel opened with actions and an
  existing highlight row, and no console warnings or errors were reported.
