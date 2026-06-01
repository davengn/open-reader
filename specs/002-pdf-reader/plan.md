# Implementation Plan: PDF Reader

**Branch**: `002-pdf-reader` | **Date**: 2026-06-01 | **Spec**: `specs/002-pdf-reader/spec.md`

**Input**: Feature specification from `specs/002-pdf-reader/spec.md`

## Summary

Replace the placeholder `app/book/[id]` shell with a PDF-first reader that
streams local PDF files through a Next.js route handler, renders the active page
with `pdfjs-dist`, layers selectable text and persisted highlight rectangles
over the canvas, upserts page-level reading progress through a debounced server
action plus a keepalive route, and presents the PDF in a continuous vertical
scroll surface with a left bookmarks/table-of-contents panel. The feature
extends the existing local-first SQLite schema and book file storage rather than
adding a separate backend or cloud service.

## Technical Context

**Language/Version**: TypeScript 5.9.3, Next.js App Router 15.5.18, React
19.1.0, and `pdfjs-dist` 5.4.394.

**Primary Dependencies**: Existing React, Next.js App Router, Tailwind CSS,
lucide-react icons, Drizzle ORM, better-sqlite3, and `pdfjs-dist`. Add browser
test dependencies only if needed for the reader verification pass.

**Storage**: SQLite database at `reader.db`; raw PDF files under `books/`;
`reading_progress` keeps the latest PDF page and percentage; `highlights` gains
page-relative rectangle JSON for overlay rendering; zoom preference stays in
`localStorage` under `reader.zoom`; PDF bookmarks are read from the PDF outline
at runtime and are not persisted.

**Testing**: Vitest for highlight-rectangle normalization, progress math,
validation, and database mutations; React/browser tests for reader controls,
selection, deletion, keyboard navigation, scanned-page banner, and render-error
fallback; Playwright visual/performance checks once the reader route is live.

**Target Platform**: Self-hosted local Node.js web app in a modern desktop
browser with worker support and standard PDF.js canvas/text-layer rendering.

**Project Type**: Single Next.js web application with route handlers, client
components, and server actions.

**Performance Goals**: First page renders within 2 seconds for local PDFs up to
50 MB; page navigation renders within 500 ms after the PDF document is loaded;
only the active continuous-scroll window is mounted as PDF canvases; adjacent
page work runs during idle time and never blocks user input; outline/bookmark
loading does not block page rendering or resume scrolling.

**Constraints**: Local-first; no auth requirement in MVP; PDF reader only for
this feature; preserve EPUB schema compatibility for later `003-epub-reader`;
use `pdfjs-dist` rather than a custom PDF renderer; highlight positions must be
page-relative and stable across zoom changes; UI follows `DESIGN.md` without
shipping Claude or Anthropic branding.

**Scale/Scope**: Single-user library with PDFs up to the existing 200 MB upload
limit and reader behavior verified against 500+ page documents. This feature
does not implement EPUB reading, notes editing, search UI, or dual-page mode.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Reading flow**: PASS. The plan makes the book route the actual reading
  surface: open, resume, page navigation, zoom, highlight, and return to
  library are all in the primary workflow. The left panel favors semantic book
  structure from PDF bookmarks over a generated page-number rail.
- **Local-first ownership**: PASS. PDF bytes are streamed from local `books/`
  storage and all progress/highlight data remains in SQLite. Zoom is a local
  browser preference.
- **Format fidelity**: PASS. The feature is intentionally scoped to PDF, with
  page-level locators and coordinate highlights. EPUB behavior is left unchanged
  and reserved for the separate EPUB reader spec.
- **Searchable memory**: PASS. Highlights link back to precise book/page/rect
  locations and remain queryable in SQLite. Existing indexing and FTS5 book
  chunks are not weakened.
- **Measurable quality**: PASS. Performance, persistence, accessibility,
  render-error handling, scanned-PDF behavior, and browser verification are
  specified in the plan and quickstart.

## Project Structure

### Documentation (this feature)

```text
specs/002-pdf-reader/
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
|       |-- page.tsx
|       |-- PdfReaderClient.tsx
|       `-- actions.ts
`-- api/
    |-- books/
    |   `-- [id]/
    |       |-- file/
    |       |   `-- route.ts
    |       `-- progress/
    |           `-- route.ts
    `-- highlights/
        |-- route.ts
        `-- [id]/
            `-- route.ts

components/
`-- reader/
    |-- HighlightColorPicker.tsx
    |-- HighlightLayer.tsx
    |-- HighlightTooltip.tsx
    |-- PageControls.tsx
    |-- PdfCanvasPage.tsx
    |-- ReaderHeader.tsx
    |-- ReaderNavigationPanel.tsx
    |-- ScannedPageBanner.tsx
    `-- ZoomControl.tsx

lib/
|-- db/
|   |-- migrations/
|   |   `-- 0002_pdf_reader.sql
|   |-- queries/
|   |   `-- reader.ts
|   `-- schema.ts
|-- pdf/
|   |-- bookmarks.ts
|   |-- client.ts
|   `-- worker.ts
`-- reader/
    |-- highlightRects.ts
    |-- pageWindow.ts
    |-- progress.ts
    `-- zoom.ts

public/
`-- pdf.worker.min.mjs

tests/
|-- integration/
|   |-- highlights-api.test.ts
|   `-- reader-progress.test.ts
|-- unit/
|   |-- highlight-rects.test.ts
|   |-- pdf-progress.test.ts
|   `-- reader-zoom.test.ts
`-- e2e/
    `-- pdf-reader.spec.ts
```

**Structure Decision**: Keep the route under the existing `app/book/[id]`
entry point and add a focused `components/reader` surface. Database work belongs
in `lib/db/queries/reader.ts` and the second migration. Client-only PDF.js,
selection, zoom, and rectangle helpers live under `lib/pdf` and `lib/reader` so
route handlers and React components stay small.

## Design Direction

The reader is a work surface, not a landing page. It should use the warm canvas
from `DESIGN.md`, but the document remains the first visual priority.

- **Dials**: design variance 4, motion intensity 2, visual density 6.
- **Theme**: warm canvas around a neutral document stage; dark surfaces only for
  compact technical/status fallbacks, not the whole reader.
- **Header**: sticky, compact, and readable. Include title, page count, zoom
  select, close button, and page controls without hiding document content.
- **Left navigation**: persistent bookmarks/table-of-contents panel on desktop
  with a compact horizontal contents strip on mobile. It shows progress, current
  page, semantic section titles, and destination pages without generating a long
  numeric page list.
- **Document stage**: continuous vertical page slots with centered page canvases
  and stable dimensions per zoom. Text layer, highlights, scanned-page banner,
  and render-error placeholder must not shift surrounding controls.
- **Controls**: icon buttons from lucide where appropriate; native select/input
  controls for zoom and page entry; visible focus rings for keyboard use.
- **Highlights**: four color swatches with labels for assistive tech. Highlight
  overlays use 40% opacity and preserve text legibility.
- **Responsive**: on narrow screens, header controls wrap into predictable rows
  while keeping page input, zoom, and close action reachable.

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

- **Reading flow**: PASS. Data model and contracts support opening a PDF,
  rendering the page, navigating by page or bookmark, resuming, highlighting,
  deleting highlights, and closing back to the library.
- **Local-first ownership**: PASS. File streaming, progress, and highlights all
  stay within local route handlers, server actions, local files, and SQLite.
- **Format fidelity**: PASS. PDF locators use page numbers and relative rects;
  EPUB fields remain available for later CFI-based reader work.
- **Searchable memory**: PASS. Highlight text and locations are persisted with
  precise book references and can be joined with existing book metadata/search
  chunks later.
- **Measurable quality**: PASS. Quickstart defines persistence, performance,
  accessibility, scanned PDF, render failure, and multi-tab checks.

## Complexity Tracking

No constitution violations.
