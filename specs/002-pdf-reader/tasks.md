# Tasks: PDF Reader

**Input**: Design documents from `specs/002-pdf-reader/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/`, `quickstart.md`

**Tests**: Required for this feature because it touches reader behavior, local
file streaming, SQLite mutations, resume persistence, annotation persistence,
accessibility, and renderer failure states.

**Organization**: Tasks are grouped by user story so each story can be
implemented and tested as an independent increment after shared foundation work.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish PDF.js worker and shared reader module boundaries.

- [X] T001 Copy PDF.js worker asset from `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` to `public/pdf.worker.min.mjs`
- [X] T002 [P] Create PDF.js worker configuration helper in `lib/pdf/worker.ts`
- [X] T003 [P] Create PDF document loading helper in `lib/pdf/client.ts`
- [X] T004 [P] Create shared reader type definitions in `lib/types/reader.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add persisted PDF progress/highlight storage and shared validation helpers that all stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Create `0002_pdf_reader.sql` to rebuild `reading_progress.percent` as `REAL`, add `reading_progress.page` constraints where possible, add `highlights.rects`, add `highlights.updated_at`, and add highlight indexes in `lib/db/migrations/0002_pdf_reader.sql`
- [X] T006 Register `0002_pdf_reader.sql` in the migration list in `lib/db/migrate.ts`
- [X] T007 Update Drizzle schema fields for real progress percentages and highlight rectangles in `lib/db/schema.ts`
- [X] T008 [P] Create reader progress math helpers for page clamping and one-decimal percentage calculation in `lib/reader/progress.ts`
- [X] T009 [P] Create highlight rectangle normalization and validation helpers in `lib/reader/highlightRects.ts`
- [X] T010 [P] Create reader database query module for progress and highlight operations in `lib/db/queries/reader.ts`
- [X] T011 [P] Add reader fixture guidance for PDF, scanned PDF, and render-error fixtures in `tests/fixtures/books/README.md`

**Checkpoint**: Database, worker, shared helpers, and fixture expectations are ready.

---

## Phase 3: User Story 1 - Open And Read A PDF (Priority: P1) MVP

**Goal**: A reader can open a local PDF and read the active page rendered with a canvas and selectable text layer.

**Independent Test**: Open a ready PDF book from the library, confirm `/api/books/[id]/file` streams PDF bytes, confirm page 1 renders with selectable text, and confirm scanned/render-error states do not break navigation.

### Tests for User Story 1

- [X] T012 [P] [US1] Add integration tests for PDF file streaming, non-PDF rejection, missing-book handling, and path safety in `tests/integration/pdf-file-route.test.ts`
- [X] T013 [P] [US1] Add browser coverage for first-page render, text-layer selection, scanned-page banner, and render-error placeholder in `tests/e2e/pdf-reader-render.spec.ts`

### Implementation for User Story 1

- [X] T014 [US1] Implement safe local PDF streaming with `Content-Type: application/pdf` in `app/api/books/[id]/file/route.ts`
- [X] T015 [US1] Replace the placeholder book page with PDF/unsupported/status routing and initial reader props in `app/book/[id]/page.tsx`
- [X] T016 [P] [US1] Create scanned-document banner component in `components/reader/ScannedPageBanner.tsx`
- [X] T017 [P] [US1] Create sticky reader header with title, page summary placeholder, and close action in `components/reader/ReaderHeader.tsx`
- [X] T018 [US1] Implement canvas rendering, HiDPI scaling, text-layer rendering, render cancellation, scanned detection, and render-error fallback in `components/reader/PdfCanvasPage.tsx`
- [X] T019 [US1] Implement PDF document lifecycle, active-page-only DOM mounting, and idle adjacent-page pre-rendering in `app/book/[id]/PdfReaderClient.tsx`
- [X] T020 [US1] Add reader shell, document stage, PDF text-layer, scanned banner, and render-error styles in `app/globals.css`

**Checkpoint**: User Story 1 can be demoed as a PDF reader MVP without highlights, saved progress, direct page input, or zoom persistence.

---

## Phase 4: User Story 2 - Highlight Selected Text (Priority: P2)

**Goal**: A reader can select text, choose yellow/green/blue/pink, see persisted overlays, and delete an existing highlight.

**Independent Test**: Select text on a PDF page, create one highlight in each color, reload the page to see persisted overlays, click a highlight, delete it, reload again, and confirm it remains deleted.

### Tests for User Story 2

- [X] T021 [P] [US2] Add unit tests for selection rectangle normalization, zero-size filtering, and invalid rectangle rejection in `tests/unit/highlight-rects.test.ts`
- [X] T022 [P] [US2] Add integration tests for `GET /api/highlights`, `POST /api/highlights`, and `DELETE /api/highlights/[id]` in `tests/integration/highlights-api.test.ts`
- [X] T023 [P] [US2] Add browser coverage for text selection, keyboard color picker use, overlay rendering, tooltip delete, and focus refetch in `tests/e2e/pdf-reader-highlights.spec.ts`

### Implementation for User Story 2

- [X] T024 [US2] Implement highlight create/list/delete database operations and validation mapping in `lib/db/queries/reader.ts`
- [X] T025 [US2] Implement highlight list and create route handlers in `app/api/highlights/route.ts`
- [X] T026 [US2] Implement highlight delete route handler in `app/api/highlights/[id]/route.ts`
- [X] T027 [P] [US2] Create keyboard-navigable four-color picker in `components/reader/HighlightColorPicker.tsx`
- [X] T028 [P] [US2] Create page-relative overlay renderer in `components/reader/HighlightLayer.tsx`
- [X] T029 [P] [US2] Create highlight delete tooltip in `components/reader/HighlightTooltip.tsx`
- [X] T030 [US2] Wire selection detection, picker placement, optimistic create, persisted page fetch, delete flow, and window-focus refetch in `app/book/[id]/PdfReaderClient.tsx`
- [X] T031 [US2] Add highlight overlay, color picker, tooltip, swatch focus, and opacity styles in `app/globals.css`

**Checkpoint**: User Story 2 works independently with persisted highlights on the active page.

---

## Phase 5: User Story 3 - Save And Resume Reading Position (Priority: P3)

**Goal**: A reader resumes at the last saved PDF page after leaving and reopening the book.

**Independent Test**: Navigate to page N, wait 1.5 seconds, reload or reopen the book, and confirm the reader opens on page N with the library progress summary updated.

### Tests for User Story 3

- [X] T032 [P] [US3] Add unit tests for page clamping, one-decimal progress calculation, and invalid total-page handling in `tests/unit/pdf-progress.test.ts`
- [X] T033 [P] [US3] Add integration tests for PDF progress upsert and library summary mirroring in `tests/integration/reader-progress.test.ts`
- [X] T034 [P] [US3] Add browser coverage for debounced save and reload resume behavior in `tests/e2e/pdf-reader-progress.spec.ts`

### Implementation for User Story 3

- [X] T035 [US3] Implement `updateProgress` server action with contract validation in `app/book/[id]/actions.ts`
- [X] T036 [US3] Implement current-progress lookup and PDF progress upsert in `lib/db/queries/reader.ts`
- [X] T037 [US3] Pass initial saved PDF page and percentage from the server page into the reader client in `app/book/[id]/page.tsx`
- [X] T038 [US3] Add 1500 ms debounced progress persistence that never blocks navigation in `app/book/[id]/PdfReaderClient.tsx`

**Checkpoint**: User Story 3 works independently once a PDF can render.

---

## Phase 6: User Story 4 - Jump To Any Page (Priority: P4)

**Goal**: A reader can navigate long PDFs with Previous/Next, direct page entry, and keyboard shortcuts.

**Independent Test**: Use Previous, Next, a page number plus `Enter`, `ArrowRight`, `j`, `ArrowLeft`, and `k`; verify page bounds clamp and disabled button states at page 1 and page N.

### Tests for User Story 4

- [X] T039 [P] [US4] Add unit tests for direct page input parsing and bounds snapping in `tests/unit/pdf-page-navigation.test.ts`
- [X] T040 [P] [US4] Add browser coverage for Previous/Next, direct input, keyboard shortcuts, and disabled boundary states in `tests/e2e/pdf-reader-navigation.spec.ts`

### Implementation for User Story 4

- [X] T041 [P] [US4] Create Previous/Next and direct page input controls in `components/reader/PageControls.tsx`
- [X] T042 [US4] Wire page button state, direct input `Enter` handling, page clamping, and keyboard shortcuts in `app/book/[id]/PdfReaderClient.tsx`
- [X] T043 [US4] Add stable navigation control layout and focus styles in `app/globals.css`

**Checkpoint**: User Story 4 works independently on top of the rendered PDF page.

---

## Phase 7: User Story 5 - Adjust Zoom Level (Priority: P5)

**Goal**: A reader can choose 75%, 100%, 125%, 150%, or 200%, and the choice persists across reader visits.

**Independent Test**: Change through every zoom option, confirm the canvas/text/highlight layers re-render together, reload the book, and confirm the last zoom level is restored.

### Tests for User Story 5

- [X] T044 [P] [US5] Add unit tests for zoom value normalization, invalid localStorage fallback, and storage serialization in `tests/unit/reader-zoom.test.ts`
- [X] T045 [P] [US5] Add browser coverage for zoom re-rendering and persisted zoom restoration in `tests/e2e/pdf-reader-zoom.spec.ts`

### Implementation for User Story 5

- [X] T046 [P] [US5] Create zoom constants, normalization, load, and save helpers in `lib/reader/zoom.ts`
- [X] T047 [P] [US5] Create zoom select control with accessible labels in `components/reader/ZoomControl.tsx`
- [X] T048 [US5] Wire zoom restore, localStorage persistence, current-page re-render, and overlay rescaling in `app/book/[id]/PdfReaderClient.tsx`
- [X] T049 [US5] Add zoom control and responsive wrapped header styles in `app/globals.css`

**Checkpoint**: All user stories are independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verify the whole reader surface against performance, accessibility, and Spec Kit expectations.

- [X] T050 [P] Add first-page and adjacent-navigation performance coverage for PDF fixtures in `tests/e2e/pdf-reader-performance.spec.ts`
- [X] T051 [P] Tune visual density, responsive header wrapping, text-layer selection affordances, and focus states against `DESIGN.md` in `app/globals.css`
- [X] T052 [P] Run the manual verification checklist and record any implementation-specific caveats in `specs/002-pdf-reader/quickstart.md`
- [X] T053 Run `npm run lint`, `npm test`, and `npm run build`, then document any unresolved failures in `specs/002-pdf-reader/quickstart.md`

---

## Phase 9: Refinement - Continuous Reader Navigation

**Purpose**: Apply the follow-up PDF reader UX refinements for wider library cards, a left reader navigation panel, and a continuous vertical PDF scroll flow.

- [X] T054 Refine `specs/002-pdf-reader/spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` for the added reader navigation and continuous-scroll behavior.
- [X] T055 [P] Add page-window unit coverage in `tests/unit/pdf-page-window.test.ts`.
- [X] T056 [P] Add dependency-free browser scenario coverage for continuous scrolling, left navigation, and wider library cards in `tests/e2e/`.
- [X] T057 [P] Create continuous page-window helpers in `lib/reader/pageWindow.ts`.
- [X] T058 [P] Create the left reader navigation panel in `components/reader/ReaderNavigationPanel.tsx`.
- [X] T059 Update selection draft typing and page rendering callbacks for per-page continuous rendering in `lib/types/reader.ts` and `components/reader/PdfCanvasPage.tsx`.
- [X] T060 Wire continuous vertical scroll, current-page observation, page jump scrolling, per-page highlight caches, and render-window mounting in `app/book/[id]/PdfReaderClient.tsx`.
- [X] T061 Tune minimalist reader navigation, continuous scroll, and wider book-card layout styles in `app/globals.css`.
- [X] T062 Run `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build`.
- [X] T063 Browser-smoke the library card layout and reader continuous-scroll surface.

---

## Phase 10: Refinement - Bookmarks Panel And Reliable Resume

**Purpose**: Replace the generated page-number rail with a PDF bookmarks/table-of-contents panel and make resume persistence reliable when the reader is closed before the debounce fires.

- [X] T064 Refine `specs/002-pdf-reader/spec.md`, `plan.md`, `data-model.md`, `contracts/`, `tasks.md`, and `quickstart.md` for bookmark navigation and leave-time progress persistence.
- [X] T065 [P] Add unit coverage for PDF outline/bookmark destination normalization in `tests/unit/pdf-bookmarks.test.ts`.
- [X] T066 [P] Add integration coverage for the keepalive progress route in `tests/integration/reader-progress.test.ts`.
- [X] T067 [P] Add PDF.js bookmark type declarations in `types/pdfjs-dist.d.ts`.
- [X] T068 [P] Create PDF bookmark loading and flattening helpers in `lib/pdf/bookmarks.ts`.
- [X] T069 Replace the left page-number rail with a bookmarks/table-of-contents panel in `components/reader/ReaderNavigationPanel.tsx`.
- [X] T070 Wire bookmark loading, outline destination jumps, guarded initial scroll restore, and leave-time progress flushing in `app/book/[id]/PdfReaderClient.tsx`.
- [X] T071 Add the keepalive progress route in `app/api/books/[id]/progress/route.ts`.
- [X] T072 Tune bookmark panel and mobile contents-strip styles in `app/globals.css`.
- [X] T073 Update browser scenario notes for bookmark navigation and leave-before-debounce resume in `tests/e2e/`.
- [X] T074 Run `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build`.
- [X] T075 Browser-smoke the bookmarks panel and saved-page resume behavior.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **User Stories (Phases 3-7)**: Depend on Foundational completion.
- **Polish (Phase 8)**: Depends on all implemented stories being complete.
- **Bookmark/resume refinement (Phase 10)**: Depends on continuous-scroll reader wiring from Phase 9.

### User Story Dependencies

- **US1 Open And Read A PDF (P1)**: Starts after Foundational; MVP scope.
- **US2 Highlight Selected Text (P2)**: Starts after Foundational, but browser validation needs US1 rendering.
- **US3 Save And Resume Reading Position (P3)**: Starts after Foundational, but browser validation needs US1 rendering.
- **US4 Jump To Any Page (P4)**: Starts after Foundational, but integration is clearest after US1.
- **US5 Adjust Zoom Level (P5)**: Starts after Foundational, but highlight overlay validation benefits from US2.

### Within Each User Story

- Write story tests first and confirm they fail before implementation.
- Implement shared data/query changes before route handlers or server actions.
- Implement lower-level components before wiring them into `PdfReaderClient`.
- Complete each story checkpoint before moving to lower-priority stories.

### Parallel Opportunities

- Setup tasks T002-T004 can run in parallel.
- Foundational tasks T008-T011 can run in parallel after the migration shape is known.
- Story test files within each story can be written in parallel.
- Independent components in US1, US2, and US5 can be implemented in parallel.
- US2 route work, US3 server action work, and US4/US5 control components can proceed in parallel after Foundation, with final wiring coordinated through `app/book/[id]/PdfReaderClient.tsx`.

---

## Parallel Example: User Story 2

```text
Task: "Add unit tests for selection rectangle normalization, zero-size filtering, and invalid rectangle rejection in tests/unit/highlight-rects.test.ts"
Task: "Add integration tests for GET /api/highlights, POST /api/highlights, and DELETE /api/highlights/[id] in tests/integration/highlights-api.test.ts"
Task: "Add browser coverage for text selection, keyboard color picker use, overlay rendering, tooltip delete, and focus refetch in tests/e2e/pdf-reader-highlights.spec.ts"
Task: "Create keyboard-navigable four-color picker in components/reader/HighlightColorPicker.tsx"
Task: "Create page-relative overlay renderer in components/reader/HighlightLayer.tsx"
Task: "Create highlight delete tooltip in components/reader/HighlightTooltip.tsx"
```

## Parallel Example: User Story 5

```text
Task: "Add unit tests for zoom value normalization, invalid localStorage fallback, and storage serialization in tests/unit/reader-zoom.test.ts"
Task: "Add browser coverage for zoom re-rendering and persisted zoom restoration in tests/e2e/pdf-reader-zoom.spec.ts"
Task: "Create zoom constants, normalization, load, and save helpers in lib/reader/zoom.ts"
Task: "Create zoom select control with accessible labels in components/reader/ZoomControl.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Stop and validate PDF streaming, canvas rendering, text selection, scanned-page handling, and render-error fallback.

### Incremental Delivery

1. Deliver US1 so the placeholder reader becomes a working PDF reader.
2. Add US2 highlights and verify persisted annotation behavior.
3. Add US3 progress saving and resume.
4. Add US4 navigation controls and keyboard shortcuts.
5. Add US5 zoom persistence and final overlay alignment.
6. Run Phase 8 quality checks before marking the feature complete.

### Notes

- `[P]` tasks touch different files or can be done before final integration.
- `[US#]` labels map tasks to the user stories in `spec.md`.
- `app/book/[id]/PdfReaderClient.tsx` is the main integration file; avoid overlapping edits there unless tasks are sequenced.
- Optional Spec Kit git commit hooks are configured for before/after task generation, but were not executed while generating this file.
