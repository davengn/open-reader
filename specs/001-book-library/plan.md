# Implementation Plan: Book Library

**Branch**: `codex/001-book-library` | **Date**: 2026-06-01 | **Spec**: `specs/001-book-library/spec.md`

**Input**: Feature specification from `specs/001-book-library/spec.md`

## Summary

Build the Open Reader home screen and ingestion path: upload PDF/EPUB files,
store them locally, persist metadata and reading state in SQLite, show a
scannable library grid, support filter/sort persistence, inline metadata edits,
and safe deletion with cascade cleanup. The implementation uses a single
Next.js App Router app with route handlers/server actions, Drizzle plus SQLite,
a local `books/` storage root, and a restrained editorial product UI based on
`DESIGN.md`.

## Technical Context

**Language/Version**: TypeScript with Next.js App Router. Exact Next.js,
React, and TypeScript versions will be pinned during project scaffold.

**Primary Dependencies**: React, Next.js App Router, Tailwind CSS, shadcn/Radix
primitives, lucide-react icons, Drizzle ORM, better-sqlite3, busboy-compatible
multipart streaming, pdfjs-dist, epubjs, a server-side EPUB metadata/parser
library, and Node `crypto`/`fs` APIs.

**Storage**: SQLite database at `reader.db`; raw uploaded files under `books/`;
cover images under `books/covers/`; generated text chunks stored in SQLite and
indexed with SQLite FTS5.

**Testing**: Vitest for pure functions and database/storage integration tests;
React Testing Library for component states; Playwright for upload, filter,
inline edit, delete dialog, keyboard navigation, and responsive visual checks.

**Target Platform**: Self-hosted Node.js web app on a local machine or trusted
single-user server.

**Project Type**: Single Next.js web application with API routes and server
actions, no separate backend process for this feature.

**Performance Goals**: Library page renders 200 books in under 1 second after
data is available; accepted uploads appear in the grid within 3 seconds of
upload completion; route handler returns `202 Accepted` after file save and job
queueing; cover assets use long-lived cache headers.

**Constraints**: Local-first storage; no required auth in MVP; 200 MB per-file
limit; PDF/EPUB only; deterministic cleanup for interrupted uploads; deletion
must remove file and dependent rows; filter/sort persisted in `localStorage`;
UI must follow `DESIGN.md` without shipping Claude/Anthropic branding.

**Scale/Scope**: Single-user library sized for at least 200 books in MVP;
background processing may take longer for 200 MB files but must keep status
visible and recoverable.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Reading flow**: PASS. The feature owns add, browse, resume entry, filter,
  sort, edit metadata, and delete. The library surface stays task-first: upload
  rail, sticky controls, book grid, and contextual card actions.
- **Local-first ownership**: PASS. Files stay under `books/`; SQLite stores
  metadata, progress summary, hashes, processing status, and search chunks.
  No cloud service is required.
- **Format fidelity**: PASS. PDF and EPUB are both accepted, processed, shown,
  and placed into error states when corrupt. Stable locators for full reading
  are deferred to the reader spec, but progress summary fields exist now.
- **Searchable memory**: PASS. Upload processing creates text chunks and FTS5
  entries even though search UI is out of scope, so future search and notes can
  ground in local indexed text.
- **Measurable quality**: PASS. Performance, upload timing, file cleanup,
  cascade deletion, cache behavior, accessibility, and design checks are
  defined in the spec and quickstart.

## Project Structure

### Documentation (this feature)

```text
specs/001-book-library/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── openapi.yaml
```

### Source Code (repository root)

```text
app/
├── (library)/
│   └── page.tsx
├── book/
│   └── [id]/
│       └── page.tsx
└── api/
    └── books/
        ├── route.ts
        ├── [id]/
        │   └── route.ts
        └── [id]/
            └── status/
                └── route.ts

components/
└── library/
    ├── BookCard.tsx
    ├── BookGrid.tsx
    ├── EmptyLibrary.tsx
    ├── LibraryToolbar.tsx
    ├── MetadataInlineEditor.tsx
    └── UploadDropzone.tsx

lib/
├── db/
│   ├── index.ts
│   ├── schema.ts
│   ├── migrations/
│   └── queries/
│       └── books.ts
├── ingestion/
│   ├── enqueueBookProcessing.ts
│   ├── processBook.ts
│   └── chunkText.ts
├── parsers/
│   ├── epub.ts
│   └── pdf.ts
├── storage/
│   ├── bookFiles.ts
│   └── covers.ts
└── validation/
    └── books.ts

books/
├── covers/
└── .gitkeep

tests/
├── fixtures/
│   └── books/
├── integration/
│   ├── books-api.test.ts
│   ├── ingestion.test.ts
│   └── deletion-cascade.test.ts
├── unit/
│   ├── book-sort.test.ts
│   ├── file-validation.test.ts
│   └── placeholder-cover.test.ts
└── e2e/
    └── library.spec.ts
```

**Structure Decision**: Use the constitution's single Next.js application
layout. Library UI lives under `app/(library)` and `components/library`; all
file/database/indexing behavior lives under `lib` to keep route handlers thin
and testable.

## Design Direction

Reading this as a local-first product UI for a technical reader, with a warm
editorial workspace language, leaning toward Next.js plus shadcn/Radix patterns
shaped by `DESIGN.md`.

- **Dials**: design variance 5, motion intensity 3, visual density 6.
- **Theme**: one light warm-canvas theme for the library. Dark surfaces are
  reserved for small technical status/details panels, not whole-section flips.
- **Typography**: use the `DESIGN.md` hierarchy: editorial display treatment
  for page title, humanist sans for controls, JetBrains Mono only for file
  hashes, paths, or technical status.
- **Layout**: no marketing hero. First viewport is the usable library:
  compact top bar, sticky filter/sort toolbar, upload affordance, and grid.
- **Cards**: book cards are functional objects, not decorative nested cards.
  They use stable dimensions, 8-12 px radius, visible status, and no layout
  shift while covers or indexing status change.
- **States**: loading skeletons match the grid; empty state is an upload-first
  panel; corrupt books keep delete access; duplicate/validation errors stay
  near the upload control.
- **Accessibility**: upload, filters, sort, card menu, confirmation dialog, and
  inline metadata editor must support keyboard and visible focus states.

## Phase 0: Research

Research output is captured in `research.md`. All technical unknowns are
resolved for this feature.

## Phase 1: Design & Contracts

Design output is captured in:

- `data-model.md`
- `contracts/openapi.yaml`
- `quickstart.md`

### Post-Design Constitution Check

- **Reading flow**: PASS. The data model and API support upload, visible
  processing status, browse, resume summary, filters, edits, and deletion.
- **Local-first ownership**: PASS. API and data model define filesystem paths,
  hashes, SQLite rows, and deletion cascade behavior.
- **Format fidelity**: PASS. Contracts and model include `format`, status,
  cover metadata, parser error state, and room for progress per format.
- **Searchable memory**: PASS. `BookChunk` plus FTS5 are modeled; processing
  status blocks search-dependent readiness without blocking library visibility.
- **Measurable quality**: PASS. Quickstart includes validation, performance,
  persistence, accessibility, and visual checks.

## Complexity Tracking

No constitution violations.
