# Implementation Plan: EPUB Reader

**Branch**: `003-epub-reader` | **Date**: 2026-06-01 | **Spec**: `specs/003-epub-reader/spec.md`

**Input**: Feature specification from `specs/003-epub-reader/spec.md`

## Summary

Replace the EPUB unsupported-format fallback in `app/book/[id]` with a
client-only `epubjs` reader that streams local EPUB bytes through the existing
book file route, renders reflowable content in an iframe-backed rendition,
derives chapter navigation from the EPUB table of contents, persists font size
in `localStorage`, stores exact resume positions as EPUB CFI, and saves
highlight annotations by CFI in the existing SQLite highlight table.

## Technical Context

**Language/Version**: TypeScript 5.9.3, Next.js App Router 15.5.18, React
19.1.0, and client-side `epubjs`.

**Primary Dependencies**: Existing React, Next.js App Router, Tailwind CSS,
lucide-react icons, Drizzle ORM, better-sqlite3, JSZip, Vitest, and PDF.js
reader dependencies. Add `epubjs` as the EPUB rendering engine; add local type
shims if the package types are incomplete.

**Storage**: SQLite database at `reader.db`; raw EPUB files under `books/`;
`reading_progress` stores `locator_type = "epub-cfi"`, `cfi`, optional
`chapter`, `percent`, and `updated_at`; `highlights` stores `cfi`, selected
text, color, optional chapter, and uses `rects = []` for EPUB rows; font size
stays in `localStorage` under `epub.fontSize`; ToC entries are derived from the
EPUB package at runtime and are not persisted.

**Testing**: Vitest for CFI/progress validation, font-size preference parsing,
ToC flattening, highlight payload validation, and database mutations;
integration tests for EPUB file streaming, progress save/load, highlight
create/list/delete, and invalid-format errors; browser tests for rendition
load, reflow, ToC navigation, highlight lifecycle, invalid-CFI fallback, DRM
error display, and font-size persistence.

**Target Platform**: Self-hosted local Node.js web app in a modern desktop or
mobile browser with iframe support, local route handlers, and JavaScript enabled.

**Project Type**: Single Next.js web application with route handlers, server
actions, client components, and shared reader UI components.

**Performance Goals**: First EPUB chapter renders within 2 seconds for local
EPUB files up to 30 MB; chapter navigation renders within 500 ms after the EPUB
book is loaded; relocation progress writes are debounced by 1500 ms; ToC loading
and highlight reapplication do not block the initial readable chapter.

**Constraints**: Local-first; no auth requirement in MVP; EPUB reader only for
this feature while preserving PDF reader behavior; use `epubjs` rather than a
custom EPUB renderer; no required cloud or DRM provider; UI follows `DESIGN.md`
without shipping Claude or Anthropic branding; stable EPUB locators are CFIs,
not generated page numbers.

**Scale/Scope**: Single-user library with EPUBs up to the existing upload limit,
with reader performance verified against practical EPUBs up to 30 MB. This
feature does not implement DRM/LCP, EPUB search UI, notes editing, font family or
theme controls, dual-page mode, or server-side EPUB re-rendering.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Reading flow**: PASS. The EPUB book route becomes a real reading surface
  with open, resume, ToC navigation, previous/next, highlighting, font size, and
  close-to-library actions. Reader chrome is compact and secondary to text.
- **Local-first ownership**: PASS. EPUB bytes stay in local `books/` storage;
  progress and highlights stay in SQLite; font size is a browser-local
  preference; no external service is required.
- **Format fidelity**: PASS. EPUB behavior uses `epubjs`, CFI progress, CFI
  highlights, ToC hrefs, and explicit malformed/DRM handling. PDF behavior
  remains scoped to PDF page and rectangle locators.
- **Searchable memory**: PASS. Highlight text and CFI locations are durable,
  queryable, and tied to book IDs for future notes, review, and citation flows.
  Existing FTS5 search/indexing is not weakened.
- **Measurable quality**: PASS. The plan defines performance, persistence,
  invalid-CFI recovery, DRM failure, accessibility, visual, unit, integration,
  and browser verification checks.

## Project Structure

### Documentation (this feature)

```text
specs/003-epub-reader/
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
|       |-- EpubReaderClient.tsx
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
    |-- EpubChapterNav.tsx
    |-- EpubTocPanel.tsx
    |-- EpubViewerStage.tsx
    |-- FontSizeControl.tsx
    |-- HighlightColorPicker.tsx
    |-- HighlightTooltip.tsx
    |-- ReaderHeader.tsx
    `-- ReaderStatusBanner.tsx

lib/
|-- db/
|   |-- migrations/
|   |   `-- 0003_epub_reader.sql
|   |-- queries/
|   |   `-- reader.ts
|   `-- schema.ts
|-- epub/
|   |-- cfi.ts
|   |-- client.ts
|   |-- highlights.ts
|   `-- toc.ts
`-- reader/
    |-- epubProgress.ts
    |-- fontSize.ts
    `-- progress.ts

tests/
|-- integration/
|   |-- epub-file-route.test.ts
|   |-- epub-highlights-api.test.ts
|   `-- epub-progress.test.ts
|-- unit/
|   |-- epub-cfi.test.ts
|   |-- epub-font-size.test.ts
|   `-- epub-toc.test.ts
`-- e2e/
    `-- epub-reader.spec.ts
```

**Structure Decision**: Keep EPUB under the existing `app/book/[id]` route so
PDF and EPUB share the library entry point, file route, highlight APIs, progress
route, and reader chrome patterns. EPUB-specific browser integration lives under
`lib/epub` and `EpubReaderClient.tsx`; persistence changes remain in
`lib/db/queries/reader.ts` using the schema fields already reserved for CFI.

## Design Direction

The EPUB reader should feel like a quiet text workbench. The book text is the
main surface; navigation and annotation controls stay compact, predictable, and
secondary.

- **Dials**: design variance 4, motion intensity 2, visual density 6.
- **Theme**: warm editorial canvas with a neutral reading column; use dark
  surfaces only for small status/error panels, not the main text stage.
- **Header**: sticky and compact, with title, current chapter, previous/next,
  font-size select, ToC toggle, and close button. Controls wrap into stable rows
  on narrow screens.
- **ToC panel**: left slide-in sidebar at 280 px on desktop; compact overlay or
  drawer behavior on mobile. It lists real chapter titles, not generated page
  numbers.
- **Reader stage**: full-width responsive EPUB viewer without cards inside
  cards. The iframe area keeps stable min-height so loading, banners, and errors
  do not jump the layout.
- **Highlights**: reuse the four accessible swatches, 40% fill opacity, and the
  existing delete tooltip language/pattern.
- **Accessibility**: visible focus rings, keyboard-reachable controls, Escape to
  close transient UI, and screen-reader labels for icon-only actions.

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

- **Reading flow**: PASS. Data model and contracts support opening an EPUB,
  rendering reflowable text, navigating by ToC or previous/next, resuming by
  CFI, changing font size, highlighting, deleting highlights, and closing back
  to the library.
- **Local-first ownership**: PASS. File streaming, progress, highlights, and
  preferences all remain local to route handlers, SQLite, local files, and
  browser storage.
- **Format fidelity**: PASS. EPUB locators use CFI, ToC hrefs, and chapter
  labels; invalid CFI and unsupported DRM states are explicit; PDF locators
  remain unchanged.
- **Searchable memory**: PASS. EPUB highlight text and CFI locations remain
  durable and queryable, with book linkage for future search, notes, and review.
- **Measurable quality**: PASS. Quickstart defines persistence, performance,
  accessibility, DRM, invalid-CFI, ToC, reflow, and highlight lifecycle checks.

## Complexity Tracking

No constitution violations.
