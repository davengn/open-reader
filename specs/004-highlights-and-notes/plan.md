# Implementation Plan: Highlights and Notes

**Branch**: `004-highlights-and-notes` | **Date**: 2026-06-01 | **Spec**: `specs/004-highlights-and-notes/spec.md`

**Input**: Feature specification from `specs/004-highlights-and-notes/spec.md`

## Summary

Add a collapsible 320 px notes panel to both PDF and EPUB reader clients so the
reader can review book highlights, attach autosaved Markdown notes, create
standalone page or CFI notes, navigate back to source locations, and export the
book's highlights and notes as a Markdown file. The implementation reuses the
existing `highlights` and `notes` SQLite tables, extends reader query functions
for note persistence and whole-book annotation listing, adds local note search
indexing, and keeps all data and exports local.

## Technical Context

**Language/Version**: TypeScript 5.9.3, Next.js App Router 15.5.18, React
19.1.0.

**Primary Dependencies**: Existing React, Next.js App Router, Tailwind CSS,
lucide-react icons, Drizzle ORM, better-sqlite3, PDF.js, `epubjs`, and Vitest.
No new runtime dependency is required for Markdown storage or export because
notes are plain text and export is generated server-side.

**Storage**: SQLite database at `reader.db`; existing `highlights` table for PDF
page and EPUB CFI annotations; existing `notes` table for attached and
standalone notes. Add migration `0004_highlights_notes.sql` for note indexes,
`created_at` compatibility if needed, one-note-per-highlight uniqueness, and
`notes_fts` triggers for local note search. Raw books remain under `books/`.
Panel preference stays in `localStorage` under `reader.notesPanel`.

**Testing**: Vitest unit tests for note validation, note sorting, Markdown
export formatting, filename sanitization, textarea autosave state helpers, and
localStorage preference parsing; integration tests for whole-book highlight
listing, note create/update/delete, highlight-deleted fallback, note search
querying, and Markdown export; browser checks for PDF and EPUB panel toggle,
autosave, standalone notes, source navigation, failed save messaging, and export
download behavior.

**Target Platform**: Self-hosted local Node.js web app in a modern desktop or
mobile browser with JavaScript enabled, iframe support for EPUB, and local file
downloads.

**Project Type**: Single Next.js web application with route handlers, server
actions, client components, and shared reader UI components.

**Performance Goals**: Panel open renders up to 500 annotation items within
300 ms after data arrives; note autosave debounce is 800 ms; local SQLite note
writes complete within 200 ms; Markdown export for 500 annotations completes
within 1 second on localhost.

**Constraints**: Local-first; no auth requirement in MVP; preserve existing PDF
and EPUB reader behavior; notes are plain Markdown text in a textarea; no
WYSIWYG editor; no cloud sync; UI follows `DESIGN.md` without shipping Claude or
Anthropic branding; PDF locators use pages and rectangles, EPUB locators use
CFIs.

**Scale/Scope**: Single-user local library with up to 500 annotations displayed
per current book in the panel. This feature does not implement multi-user
conflicts, rich Markdown preview, global search UI, backlinks, tags, note
version history, or cross-book export bundles.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Reading flow**: PASS. Notes are edited inside the reader, the panel is
  collapsible, and source navigation keeps the user in the book.
- **Local-first ownership**: PASS. Notes, highlights, and search index rows stay
  in SQLite; export is a local download; no external service is introduced.
- **Format fidelity**: PASS. PDF notes use page locators and optional highlight
  rectangles; EPUB notes use CFIs and chapter labels. Existing PDF/EPUB
  highlight semantics are preserved.
- **Searchable memory**: PASS. Notes are durable, queryable, linked to books and
  highlight IDs, and planned for a local FTS index.
- **Measurable quality**: PASS. The plan defines panel rendering, autosave,
  export, persistence, accessibility, reliability, and regression checks.

## Project Structure

### Documentation (this feature)

```text
specs/004-highlights-and-notes/
|-- spec.md
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
`-- contracts/
    |-- openapi.yaml
    `-- server-actions.md
```

### Source Code (repository root)

```text
app/
|-- book/
|   `-- [id]/
|       |-- PdfReaderClient.tsx
|       |-- EpubReaderClient.tsx
|       `-- actions.ts
`-- api/
    |-- books/
    |   `-- [id]/
    |       `-- export/
    |           `-- route.ts
    |-- highlights/
    |   |-- route.ts
    |   `-- [id]/
    |       `-- route.ts
    `-- notes/
        |-- route.ts
        `-- [id]/
            `-- route.ts

components/
`-- reader/
    |-- NotesPanel.tsx
    |-- NotesPanelItem.tsx
    |-- NoteEditor.tsx
    |-- ReaderHeader.tsx
    |-- HighlightColorPicker.tsx
    `-- HighlightTooltip.tsx

lib/
|-- db/
|   |-- migrations/
|   |   `-- 0004_highlights_notes.sql
|   |-- queries/
|   |   |-- reader.ts
|   |   `-- notes.ts
|   `-- schema.ts
|-- reader/
|   |-- annotationSort.ts
|   |-- noteExport.ts
|   |-- noteValidation.ts
|   |-- notesPanelPreference.ts
|   `-- textareaAutosize.ts
`-- types/
    `-- reader.ts

tests/
|-- integration/
|   |-- notes-api.test.ts
|   |-- notes-export.test.ts
|   `-- highlights-panel-api.test.ts
|-- unit/
|   |-- annotation-sort.test.ts
|   |-- note-export.test.ts
|   |-- note-validation.test.ts
|   `-- notes-panel-preference.test.ts
`-- e2e/
    `-- highlights-notes-panel.spec.ts
```

**Structure Decision**: Keep the panel inside the existing reader route so PDF
and EPUB share one annotation review surface. Put reusable UI in
`components/reader`, persistence in `lib/db/queries`, and formatting/sorting
helpers in `lib/reader`. Add route handlers for notes and export while
preserving the existing `/api/highlights` contract for page-scoped PDF calls.

## Design Direction

The notes panel should feel like a compact review rail, not a second app inside
the reader. The book remains the main surface; the panel is dense, scannable,
and easy to collapse.

- **Dials**: design variance 3, motion intensity 2, visual density 7.
- **Theme**: warm editorial canvas, light cream panel surface, coral focus and
  saved states, dark text only for compact metadata and errors.
- **Header**: add a bookmark icon button beside existing outline/navigation
  controls. Tooltip and accessible label switch between `Show notes` and
  `Hide notes`.
- **Panel**: right-side sticky `<aside>` at 320 px on desktop, full-height,
  independent vertical scroll, subtle hairline left border, no nested cards.
- **Reader shrink behavior**: desktop layouts reserve panel width in the reader
  workspace; mobile uses a drawer overlay with a clear close button.
- **Items**: each highlight row uses a 4 px color bar, compact excerpt, chapter,
  location label, and a small note indicator. Standalone notes use a document
  icon treatment instead of a color bar.
- **Editor**: plain auto-growing monospace textarea, saved/error microstatus,
  delete affordance, no Markdown preview or toolbar.
- **Accessibility**: keyboard-reachable toggle, export, item, editor, and delete
  controls; Escape closes transient editor/error states; focus rings remain
  visible against cream surfaces.

## Phase 0: Research

Research output is captured in `research.md`. All technical unknowns are
resolved for this feature.

## Phase 1: Design & Contracts

Design output is captured in:

- `data-model.md`
- `contracts/openapi.yaml`
- `contracts/server-actions.md`
- `quickstart.md`

### Post-Design Constitution Check

- **Reading flow**: PASS. Contracts support panel review, inline notes,
  standalone notes, source navigation, and Markdown export without leaving the
  reader.
- **Local-first ownership**: PASS. All mutations and export generation use local
  route handlers, server actions, SQLite, and browser downloads.
- **Format fidelity**: PASS. Data model stores PDF page and EPUB CFI locators,
  keeps highlight linkage optional, and defines stale-target behavior.
- **Searchable memory**: PASS. Note text is persisted, indexed locally, and
  queryable by book while preserving book and highlight relationships.
- **Measurable quality**: PASS. Quickstart defines performance, autosave,
  export, persistence, accessibility, failure, and regression checks.

## Complexity Tracking

No constitution violations.
