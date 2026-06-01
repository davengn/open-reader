# Tasks: EPUB Reader

**Input**: Design documents from `specs/003-epub-reader/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/`, `quickstart.md`

**Tests**: Required for this feature because it touches reader behavior, local
file streaming, SQLite mutations, resume persistence, annotation persistence,
accessibility, format fidelity, and renderer failure states.

**Organization**: Tasks are grouped by user story so each story can be
implemented and tested as an independent increment after shared foundation work.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add EPUB renderer dependency, type boundaries, and fixture
expectations before implementation work begins.

- [x] T001 Add `epubjs` to `package.json` and `package-lock.json`
- [x] T002 [P] Add `epubjs` type declarations or package shims in `types/epubjs.d.ts`
- [x] T003 [P] Add EPUB reader session, progress, highlight, ToC, and selection types in `lib/types/reader.ts`
- [x] T004 [P] Add EPUB fixture guidance for normal, missing-ToC, invalid-CFI, image-only, and DRM fixtures in `tests/fixtures/books/README.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add shared EPUB persistence, validation, and route contract
boundaries that all user stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Create `0003_epub_reader.sql` to add or verify `reading_progress(book_id)` uniqueness, EPUB progress lookup support, and `highlights(book_id, cfi)` indexing in `lib/db/migrations/0003_epub_reader.sql`
- [x] T006 Register `0003_epub_reader.sql` in the migration list in `lib/db/migrate.ts`
- [x] T007 Update Drizzle schema indexes for EPUB progress and highlight lookup in `lib/db/schema.ts`
- [x] T008 [P] Create EPUB CFI validation and opaque normalization helpers in `lib/epub/cfi.ts`
- [x] T009 [P] Create shared EPUB progress percentage and chapter normalization helpers in `lib/reader/epubProgress.ts`
- [x] T010 [P] Create browser-only EPUB import and ArrayBuffer loading helpers in `lib/epub/client.ts`
- [x] T011 [P] Add EPUB route contract fixtures or request builders in `tests/helpers/testEnv.ts`
- [x] T012 Extend reader database error handling for EPUB validation paths in `lib/db/queries/reader.ts`

**Checkpoint**: Dependency, schema, validation, and test fixtures are ready.

---

## Phase 3: User Story 1 - Read Reflowable EPUB Content (Priority: P1) MVP

**Goal**: A reader can open a ready EPUB from the library, see reflowable text in
the existing book route, and close back to the library.

**Independent Test**: Open a ready EPUB book from the library and verify the book
renders in the reader, reflows without horizontal scrolling, and can be closed
back to the library.

### Tests for User Story 1

- [x] T013 [P] [US1] Add integration tests for EPUB file streaming, non-ready rejection, wrong-format rejection, missing-book handling, and content type in `tests/integration/epub-file-route.test.ts`
- [x] T014 [P] [US1] Add browser coverage for initial EPUB render, close-to-library behavior, desktop/mobile reflow, image-only rendering, and DRM unsupported state in `tests/e2e/epub-reader-render.spec.ts`

### Implementation for User Story 1

- [x] T015 [US1] Extend local book file streaming to serve ready EPUB bytes with `Content-Type: application/epub+zip` in `app/api/books/[id]/file/route.ts`
- [x] T016 [US1] Route ready EPUB books to a new EPUB reader client while preserving PDF routing and status fallbacks in `app/book/[id]/page.tsx`
- [x] T017 [P] [US1] Create shared reader status banner for loading, unsupported DRM, invalid-CFI, and generic error states in `components/reader/ReaderStatusBanner.tsx`
- [x] T018 [P] [US1] Create stable EPUB iframe viewer stage with reflow-safe dimensions in `components/reader/EpubViewerStage.tsx`
- [x] T019 [US1] Implement client-only EPUB book loading, rendition creation, first display, DRM/open-error handling, cleanup, and close wiring in `app/book/[id]/EpubReaderClient.tsx`
- [x] T020 [US1] Update reader header props to support EPUB title/chapter display without breaking PDF controls in `components/reader/ReaderHeader.tsx`
- [x] T021 [US1] Add EPUB reader shell, iframe stage, loading, unsupported, and responsive reflow styles in `app/globals.css`

**Checkpoint**: User Story 1 can be demoed as an EPUB reader MVP without saved
CFI resume, highlights, ToC panel, or font-size persistence.

---

## Phase 4: User Story 2 - Resume by Exact CFI Location (Priority: P1)

**Goal**: A reader resumes an EPUB at the exact saved CFI after navigation,
reload, or leaving before the debounce fires.

**Independent Test**: Navigate into a later chapter, wait for the debounce,
reload the reader, and verify it displays from the saved CFI rather than the
first chapter.

### Tests for User Story 2

- [x] T022 [P] [US2] Add unit tests for EPUB CFI validation, chapter normalization, and one-decimal percentage normalization in `tests/unit/epub-cfi.test.ts`
- [x] T023 [P] [US2] Add integration tests for EPUB progress get, debounced upsert payloads, keepalive progress route, invalid payload rejection, and library summary mirroring in `tests/integration/epub-progress.test.ts`
- [x] T024 [P] [US2] Add browser coverage for debounced CFI save, reload resume, leave-before-debounce resume, and invalid-CFI fallback banner in `tests/e2e/epub-reader-progress.spec.ts`

### Implementation for User Story 2

- [x] T025 [US2] Implement current EPUB progress lookup and CFI progress upsert in `lib/db/queries/reader.ts`
- [x] T026 [US2] Implement `updateEpubProgress` server action with validation and library-summary mirroring in `app/book/[id]/actions.ts`
- [x] T027 [US2] Extend the progress route with EPUB `GET` and `POST` CFI payload support while preserving PDF keepalive behavior in `app/api/books/[id]/progress/route.ts`
- [x] T028 [US2] Pass saved EPUB CFI and chapter props from the server page into the reader client in `app/book/[id]/page.tsx`
- [x] T029 [US2] Wire `relocated` event handling, current CFI state, 1500 ms debounced save, keepalive flush, saved-CFI restore, and invalid-CFI fallback in `app/book/[id]/EpubReaderClient.tsx`
- [x] T030 [US2] Add invalid-CFI restore warning styles and non-blocking progress error affordances in `app/globals.css`

**Checkpoint**: User Story 2 works independently once the EPUB reader can render.

---

## Phase 5: User Story 3 - Highlight EPUB Text (Priority: P2)

**Goal**: A reader can select EPUB text, choose yellow/green/blue/pink, reload
to see persisted marks, and delete existing marks.

**Independent Test**: Select text, create highlights in all four colors, reload
the reader, and verify the marks reappear and can be deleted.

### Tests for User Story 3

- [x] T031 [P] [US3] Add unit tests for EPUB highlight payload normalization, empty selection rejection, and chapter-boundary guard helpers in `tests/unit/epub-highlights.test.ts`
- [x] T032 [P] [US3] Add integration tests for `GET /api/highlights?bookId=[id]&format=epub`, EPUB highlight create, delete, wrong-format rejection, and PDF highlight regression in `tests/integration/epub-highlights-api.test.ts`
- [x] T033 [P] [US3] Add browser coverage for text selection, keyboard color picker use, annotation reapply after reload, mark-click tooltip, delete, image-only empty selection, and cross-chapter rejection in `tests/e2e/epub-reader-highlights.spec.ts`

### Implementation for User Story 3

- [x] T034 [P] [US3] Create EPUB annotation and highlight payload helpers in `lib/epub/highlights.ts`
- [x] T035 [US3] Implement EPUB highlight list, create, and delete database operations in `lib/db/queries/reader.ts`
- [x] T036 [US3] Extend highlight list and create route handlers for EPUB CFI payloads while preserving PDF page payloads in `app/api/highlights/route.ts`
- [x] T037 [US3] Extend highlight delete handling for EPUB annotations and existing PDF rows in `app/api/highlights/[id]/route.ts`
- [x] T038 [US3] Reuse and adapt the color picker for iframe selection anchors and chapter-boundary feedback in `components/reader/HighlightColorPicker.tsx`
- [x] T039 [US3] Reuse and adapt the delete tooltip for EPUB mark clicks in `components/reader/HighlightTooltip.tsx`
- [x] T040 [US3] Wire `selected` events, optimistic annotation add, persisted highlight fetch/reapply, mark-click matching, delete flow, stale-CFI skip, and focus refetch in `app/book/[id]/EpubReaderClient.tsx`
- [x] T041 [US3] Add EPUB annotation swatch, tooltip, chapter-boundary tooltip, and focus styles in `app/globals.css`

**Checkpoint**: User Story 3 works independently with persisted EPUB CFI
highlights.

---

## Phase 6: User Story 4 - Navigate by Table of Contents (Priority: P2)

**Goal**: A reader can open a left ToC panel, jump directly to chapters or
sections, and continue using previous/next navigation when ToC metadata is
missing.

**Independent Test**: Open an EPUB with nested navigation, use the ToC panel to
jump to several chapters, and verify the panel closes after each jump.

### Tests for User Story 4

- [x] T042 [P] [US4] Add unit tests for nested EPUB ToC flattening, empty-label filtering, depth capping, and current href to chapter-title mapping in `tests/unit/epub-toc.test.ts`
- [x] T043 [P] [US4] Add browser coverage for ToC open/close, nested chapter rendering, chapter jump, panel auto-close, missing-ToC hidden toggle, and previous/next fallback in `tests/e2e/epub-reader-toc.spec.ts`

### Implementation for User Story 4

- [x] T044 [P] [US4] Create EPUB ToC flattening, title lookup, and href validation helpers in `lib/epub/toc.ts`
- [x] T045 [P] [US4] Create previous/next chapter navigation controls in `components/reader/EpubChapterNav.tsx`
- [x] T046 [P] [US4] Create accessible left slide-in EPUB ToC panel in `components/reader/EpubTocPanel.tsx`
- [x] T047 [US4] Wire `book.navigation.toc`, current chapter title derivation, ToC toggle visibility, ToC display jumps, panel close, and previous/next fallback in `app/book/[id]/EpubReaderClient.tsx`
- [x] T048 [US4] Add desktop slide-in ToC, mobile drawer behavior, nesting, focus, and Escape-dismiss styles in `app/globals.css`

**Checkpoint**: User Story 4 works independently with semantic EPUB navigation.

---

## Phase 7: User Story 5 - Customize Font Size (Priority: P3)

**Goal**: A reader can choose 14px, 16px, 18px, or 20px and have the choice
persist across EPUB reader visits.

**Independent Test**: Change the font size through all supported values, reload
the reader, and verify the chosen value is restored.

### Tests for User Story 5

- [x] T049 [P] [US5] Add unit tests for EPUB font-size normalization, invalid localStorage fallback, serialization, and default 16px behavior in `tests/unit/epub-font-size.test.ts`
- [x] T050 [P] [US5] Add browser coverage for font-size selection, rendition theme application, text reflow, and persisted restoration after reload in `tests/e2e/epub-reader-font-size.spec.ts`

### Implementation for User Story 5

- [x] T051 [P] [US5] Create EPUB font-size constants, normalization, load, save, and serialization helpers in `lib/reader/fontSize.ts`
- [x] T052 [P] [US5] Create accessible EPUB font-size select control in `components/reader/FontSizeControl.tsx`
- [x] T053 [US5] Wire font-size restore, `rendition.themes.fontSize`, localStorage persistence, and current-location preservation after reflow in `app/book/[id]/EpubReaderClient.tsx`
- [x] T054 [US5] Add font-size control, wrapped header, and reflow-safe viewer styles in `app/globals.css`

**Checkpoint**: All user stories are independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verify the EPUB reader surface against performance, accessibility,
Spec Kit expectations, and PDF regression constraints.

- [x] T055 [P] Add EPUB first-chapter and chapter-navigation performance coverage for 30 MB fixtures in `tests/e2e/epub-reader-performance.spec.ts`
- [x] T056 [P] Add PDF route, PDF progress, and PDF highlight regression coverage for shared reader APIs in `tests/integration/pdf-reader-regression.test.ts`
- [x] T057 [P] Tune EPUB reader visual density, header wrapping, iframe stage sizing, ToC panel, highlight tooltip, and focus states against `DESIGN.md` in `app/globals.css`
- [x] T058 [P] Update implementation validation notes and fixture outcomes in `specs/003-epub-reader/quickstart.md`
- [x] T059 Run `npm run lint`, `npm test`, and `npm run build`, then document any unresolved failures in `specs/003-epub-reader/quickstart.md`
- [x] T060 Browser-smoke EPUB render, CFI resume, highlights, ToC navigation, font-size persistence, invalid-CFI fallback, DRM unsupported state, and mobile reflow, then record results in `specs/003-epub-reader/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **User Stories (Phases 3-7)**: Depend on Foundational completion.
- **Polish (Phase 8)**: Depends on all implemented stories being complete.

### User Story Dependencies

- **US1 Read Reflowable EPUB Content (P1)**: Starts after Foundational; MVP scope.
- **US2 Resume by Exact CFI Location (P1)**: Starts after Foundational, but browser validation needs US1 rendering.
- **US3 Highlight EPUB Text (P2)**: Starts after Foundational, but browser validation needs US1 rendering and benefits from US2 current-chapter state.
- **US4 Navigate by Table of Contents (P2)**: Starts after Foundational, but final header/current-chapter integration coordinates with US1 and US2.
- **US5 Customize Font Size (P3)**: Starts after Foundational, but final reflow validation is clearest after US1 and ToC/progress integrations.

### Within Each User Story

- Write story tests first and confirm they fail before implementation.
- Implement lower-level helpers and query functions before route handlers or server actions.
- Implement presentational components before wiring them into `EpubReaderClient`.
- Complete each story checkpoint before moving to lower-priority stories.
- Coordinate edits to `app/book/[id]/EpubReaderClient.tsx` and `app/globals.css` because most stories integrate there.

### Parallel Opportunities

- Setup tasks T002-T004 can run in parallel.
- Foundational tasks T008-T011 can run in parallel after migration shape is known.
- Test files within each story can be written in parallel.
- US3 route/query work, US4 ToC helpers/components, and US5 font-size helpers/components can proceed in parallel after Foundation, with final client wiring sequenced.
- Polish verification tasks T055-T058 can run in parallel after story implementation.

---

## Parallel Example: User Story 1

```text
Task: "Add integration tests for EPUB file streaming, non-ready rejection, wrong-format rejection, missing-book handling, and content type in tests/integration/epub-file-route.test.ts"
Task: "Add browser coverage for initial EPUB render, close-to-library behavior, desktop/mobile reflow, image-only rendering, and DRM unsupported state in tests/e2e/epub-reader-render.spec.ts"
Task: "Create shared reader status banner for loading, unsupported DRM, invalid-CFI, and generic error states in components/reader/ReaderStatusBanner.tsx"
Task: "Create stable EPUB iframe viewer stage with reflow-safe dimensions in components/reader/EpubViewerStage.tsx"
```

## Parallel Example: User Story 2

```text
Task: "Add unit tests for EPUB CFI validation, chapter normalization, and one-decimal percentage normalization in tests/unit/epub-cfi.test.ts"
Task: "Add integration tests for EPUB progress get, debounced upsert payloads, keepalive progress route, invalid payload rejection, and library summary mirroring in tests/integration/epub-progress.test.ts"
Task: "Add browser coverage for debounced CFI save, reload resume, leave-before-debounce resume, and invalid-CFI fallback banner in tests/e2e/epub-reader-progress.spec.ts"
```

## Parallel Example: User Story 3

```text
Task: "Create EPUB annotation and highlight payload helpers in lib/epub/highlights.ts"
Task: "Add integration tests for GET /api/highlights?bookId=[id]&format=epub, EPUB highlight create, delete, wrong-format rejection, and PDF highlight regression in tests/integration/epub-highlights-api.test.ts"
Task: "Add browser coverage for text selection, keyboard color picker use, annotation reapply after reload, mark-click tooltip, delete, image-only empty selection, and cross-chapter rejection in tests/e2e/epub-reader-highlights.spec.ts"
```

## Parallel Example: User Story 4

```text
Task: "Create EPUB ToC flattening, title lookup, and href validation helpers in lib/epub/toc.ts"
Task: "Create previous/next chapter navigation controls in components/reader/EpubChapterNav.tsx"
Task: "Create accessible left slide-in EPUB ToC panel in components/reader/EpubTocPanel.tsx"
Task: "Add browser coverage for ToC open/close, nested chapter rendering, chapter jump, panel auto-close, missing-ToC hidden toggle, and previous/next fallback in tests/e2e/epub-reader-toc.spec.ts"
```

## Parallel Example: User Story 5

```text
Task: "Add unit tests for EPUB font-size normalization, invalid localStorage fallback, serialization, and default 16px behavior in tests/unit/epub-font-size.test.ts"
Task: "Create EPUB font-size constants, normalization, load, save, and serialization helpers in lib/reader/fontSize.ts"
Task: "Create accessible EPUB font-size select control in components/reader/FontSizeControl.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Stop and validate EPUB file streaming, client-only `epubjs` rendering,
   reflow, close behavior, image-only EPUB behavior, and DRM unsupported state.

### Incremental Delivery

1. Deliver US1 so the unsupported EPUB fallback becomes a working reader.
2. Add US2 CFI progress saving and exact resume.
3. Add US3 CFI highlights and verify persisted annotation behavior.
4. Add US4 ToC and previous/next chapter navigation.
5. Add US5 font-size persistence and final reflow validation.
6. Run Phase 8 quality checks before marking the feature complete.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup and Foundational phases together.
2. One developer owns `EpubReaderClient` integration sequencing.
3. Other developers can work on EPUB progress queries/actions, highlight API,
   ToC helpers/components, font-size helpers/components, and tests in parallel.
4. Story checkpoints are validated independently before polish.

## Notes

- `[P]` tasks touch different files or can be done before final integration.
- `[US#]` labels map tasks to the user stories in `spec.md`.
- `app/book/[id]/EpubReaderClient.tsx` is the main integration file; avoid
  overlapping edits there unless tasks are sequenced.
- `app/globals.css` is shared with the PDF reader; changes must preserve the PDF
  reader surface.
- Optional Spec Kit git commit hooks are configured for before/after task
  generation, but were not executed while generating this file.
