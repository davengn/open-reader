---
description: "Task list for highlights and notes implementation"
---

# Tasks: Highlights and Notes

**Input**: Design documents from `specs/004-highlights-and-notes/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/openapi.yaml`, `contracts/server-actions.md`, `quickstart.md`

**Tests**: Required. This feature touches reader behavior, SQLite mutations, FTS indexing/search, deletion cascades, export file generation, annotation persistence, and accessibility.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested as an independent increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on incomplete tasks
- **[Story]**: User story label, only used in user story phases
- Every task includes exact repository paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add shared storage, types, and fixtures needed by all stories.

- [X] T001 Create `lib/db/migrations/0004_highlights_notes.sql` with `notes.created_at` compatibility, `notes_book_updated_idx`, `notes_book_page_idx`, `notes_book_cfi_idx`, `notes_highlight_unique`, `notes_fts`, and insert/update/delete FTS triggers
- [X] T002 [P] Extend `lib/types/reader.ts` with `ReaderNote`, `ReaderAnnotationItem`, `ReaderAnnotationKind`, `NoteSaveStatus`, and panel/export location fields
- [X] T003 [P] Add reusable highlight, attached-note, standalone-note, stale-CFI, and empty-book fixtures to `tests/helpers/testEnv.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schema and shared helper boundaries that must exist before any user story work begins.

**CRITICAL**: No user story work should begin until this phase is complete.

- [X] T004 Update `lib/db/schema.ts` to expose `notes.createdAt`, note indexes, the one-note-per-highlight constraint, and the `notes_fts` virtual table shape used by Drizzle helpers
- [X] T005 Implement shared note row mappers, `ReaderNoteQueryError`, transaction helpers, and exported function signatures in `lib/db/queries/notes.ts`
- [X] T006 [P] Add note validation constants and pure guards for max length, empty content, PDF page locators, EPUB CFI locators, and same-book highlight ownership in `lib/reader/noteValidation.ts`
- [X] T007 [P] Add the `reader.notesPanel` localStorage parser and serializer in `lib/reader/notesPanelPreference.ts`
- [X] T008 [P] Add textarea autosave state and autosize helpers for the plain Markdown editor in `lib/reader/textareaAutosize.ts`

**Checkpoint**: Foundation ready. User story implementation can now begin.

---

## Phase 3: User Story 1 - Review Highlights in a Notes Panel (Priority: P1) MVP

**Goal**: Open a collapsible notes panel in PDF and EPUB readers, list all current-book highlights grouped by chapter, and preserve the panel preference.

**Independent Test**: Open a PDF and an EPUB with existing highlights, toggle the notes panel, and verify highlights appear grouped by chapter with readable location labels.

### Tests for User Story 1

- [X] T009 [P] [US1] Add unit tests for chapter grouping, PDF page sort, EPUB CFI fallback sort, 120-character excerpt truncation, and location labels in `tests/unit/annotation-sort.test.ts`
- [X] T010 [P] [US1] Add unit tests for valid, missing, and malformed `reader.notesPanel` preference values in `tests/unit/notes-panel-preference.test.ts`
- [X] T011 [P] [US1] Add integration tests for `GET /api/highlights?bookId=[id]&includeNotes=true`, preserving existing PDF page-scoped behavior, in `tests/integration/highlights-panel-api.test.ts`
- [X] T012 [US1] Add browser checks for PDF and EPUB panel toggle, desktop 320 px layout, mobile drawer layout, grouping, and readable header controls in `tests/e2e/highlights-notes-panel.spec.ts`

### Implementation for User Story 1

- [X] T013 [US1] Implement combined annotation grouping, sorting, excerpt truncation, and location-label helpers in `lib/reader/annotationSort.ts`
- [X] T014 [US1] Extend `lib/db/queries/reader.ts` with whole-book highlight listing, optional attached-note inclusion, and unchanged page-scoped PDF listing semantics
- [X] T015 [US1] Extend `app/api/highlights/route.ts` to support `bookId` without `page`, `includeNotes=true`, and existing `format=epub` calls
- [X] T016 [P] [US1] Create `components/reader/NotesPanelItem.tsx` with highlight color bar, excerpt, chapter/location metadata, note indicator, and source navigation button shell
- [X] T017 [US1] Create `components/reader/NotesPanel.tsx` with grouped item rendering, loading/empty/error states, export button shell, and panel close control
- [X] T018 [US1] Wire the bookmark toggle, localStorage preference restore, desktop reader shrink behavior, and notes panel into `app/book/[id]/PdfReaderClient.tsx`
- [X] T019 [US1] Wire the bookmark toggle, localStorage preference restore, desktop reader shrink behavior, and notes panel into `app/book/[id]/EpubReaderClient.tsx`
- [X] T020 [US1] Add reader rail, mobile drawer, focus ring, and no-overlap responsive styles for the panel in `app/globals.css`

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Add and Edit Highlight Notes (Priority: P1)

**Goal**: Attach one Markdown note to a highlight, autosave after 800 ms, delete on whitespace-only save, and keep notes locally searchable.

**Independent Test**: Add a note to a highlight, wait for autosave, reload the book, edit the note, clear the note, and verify the database and panel state match each step.

### Tests for User Story 2

- [X] T021 [P] [US2] Add unit tests for note max length, empty-delete normalization, standalone locator validation, and highlight-detached fallback validation in `tests/unit/note-validation.test.ts`
- [X] T022 [P] [US2] Add integration tests for attached note create, update, whitespace delete, highlight-deleted detach fallback, and note search query behavior in `tests/integration/notes-api.test.ts`
- [X] T023 [P] [US2] Extend book and highlight deletion cascade coverage for attached notes and `notes_fts` cleanup in `tests/integration/deletion-cascade.test.ts`
- [X] T024 [US2] Add browser checks for inline editor open, 800 ms autosave, saved status, failed save message, whitespace delete, and reload persistence in `tests/e2e/highlights-notes-panel.spec.ts`

### Implementation for User Story 2

- [X] T025 [US2] Complete note content, locator, ownership, and detach-fallback validation behavior in `lib/reader/noteValidation.ts`
- [X] T026 [US2] Implement attached note create, update, delete, whitespace-delete, highlight-detach fallback, and FTS-backed search in `lib/db/queries/notes.ts`
- [X] T027 [US2] Add `saveReaderNote` and `deleteReaderNote` server actions with the documented return union in `app/book/[id]/actions.ts`
- [X] T028 [US2] Add `GET /api/notes` and `POST /api/notes` route-handler behavior using shared query functions in `app/api/notes/route.ts`
- [X] T029 [US2] Add `PATCH /api/notes/[id]` and `DELETE /api/notes/[id]` route-handler behavior using shared query functions in `app/api/notes/[id]/route.ts`
- [X] T030 [P] [US2] Create `components/reader/NoteEditor.tsx` with a plain monospace Markdown textarea, `maxLength={50000}`, autosize behavior, save status, delete control, and accessible error messaging
- [X] T031 [US2] Integrate `NoteEditor` attached-note open, edit, delete, detached-message, and unsaved-error states into `components/reader/NotesPanelItem.tsx`
- [X] T032 [US2] Wire debounced autosave, cancellation on new keystrokes, optimistic status updates, and panel refetch behavior into `components/reader/NotesPanel.tsx`

**Checkpoint**: User Story 2 is independently functional and testable with User Story 1.

---

## Phase 5: User Story 3 - Create Standalone Page Notes (Priority: P2)

**Goal**: Create standalone notes for the current PDF page or EPUB CFI and show them interleaved with highlights by location.

**Independent Test**: Navigate to a PDF page and an EPUB CFI, add a standalone page note, reload, and verify the note appears at the same location in the panel.

### Tests for User Story 3

- [X] T033 [US3] Add integration tests for standalone PDF notes, standalone EPUB notes, list ordering, and reload persistence in `tests/integration/notes-api.test.ts`
- [X] T034 [US3] Add browser checks for `Add page note`, PDF page locator persistence, EPUB CFI persistence, and interleaved standalone-note display in `tests/e2e/highlights-notes-panel.spec.ts`

### Implementation for User Story 3

- [X] T035 [US3] Implement standalone note create, update, delete, and list ordering paths in `lib/db/queries/notes.ts`
- [X] T036 [US3] Add the standalone draft editor, document-icon treatment, and `Add page note` flow to `components/reader/NotesPanel.tsx`
- [X] T037 [US3] Pass the current PDF page and chapter context into the notes panel from `app/book/[id]/PdfReaderClient.tsx`
- [X] T038 [US3] Pass the current EPUB CFI and chapter context into the notes panel from `app/book/[id]/EpubReaderClient.tsx`

**Checkpoint**: User Story 3 is independently functional and testable with prior stories.

---

## Phase 6: User Story 4 - Navigate Back to a Highlight or Note (Priority: P2)

**Goal**: Click any highlight or standalone note in the panel and jump back to the PDF page or EPUB CFI while keeping the panel open.

**Independent Test**: Click panel items for PDF highlights, PDF standalone notes, EPUB highlights, and EPUB standalone notes; verify the reader navigates to the expected page or CFI.

### Tests for User Story 4

- [X] T039 [US4] Add browser checks for PDF highlight navigation, PDF standalone navigation, EPUB highlight navigation, EPUB standalone navigation, and stale-target failure messaging in `tests/e2e/highlights-notes-panel.spec.ts`

### Implementation for User Story 4

- [X] T040 [US4] Implement `onNavigate` payloads and keyboard activation for highlight and standalone note items in `components/reader/NotesPanelItem.tsx`
- [X] T041 [US4] Wire PDF panel navigation to page scrolling and current-page state without closing the panel in `app/book/[id]/PdfReaderClient.tsx`
- [X] T042 [US4] Wire EPUB panel navigation to `rendition.display(cfi)` and chapter/progress state without closing the panel in `app/book/[id]/EpubReaderClient.tsx`
- [X] T043 [US4] Add visible non-blocking navigation failure state for unresolved pages or malformed CFIs in `components/reader/NotesPanel.tsx`
- [X] T044 [US4] Add accessible styling for navigation failures and keyboard focus states in `app/globals.css`

**Checkpoint**: User Story 4 is independently functional and testable with prior stories.

---

## Phase 7: User Story 5 - Export Highlights and Notes to Markdown (Priority: P3)

**Goal**: Download all highlights, attached notes, and standalone notes for a book as a deterministic Markdown file.

**Independent Test**: Download the export for a book with grouped highlights, attached notes, standalone notes, and no-note highlights; verify the Markdown structure, filename, and empty-book state.

### Tests for User Story 5

- [X] T045 [P] [US5] Add unit tests for Markdown export formatting, chapter headings, highlight blockquotes, attached notes, standalone notes, empty exports, and filename sanitization in `tests/unit/note-export.test.ts`
- [X] T046 [P] [US5] Add integration tests for `GET /api/books/[id]/export` response headers, body, empty-book export, and missing-book errors in `tests/integration/notes-export.test.ts`
- [X] T047 [US5] Add browser checks for panel export activation and `.md` download behavior in `tests/e2e/highlights-notes-panel.spec.ts`

### Implementation for User Story 5

- [X] T048 [US5] Implement Markdown export view-model formatting and safe filename generation in `lib/reader/noteExport.ts`
- [X] T049 [US5] Implement export data loading for grouped highlights, attached notes, standalone notes, book title, author, and empty-book state in `lib/db/queries/notes.ts`
- [X] T050 [US5] Add the Markdown attachment route at `app/api/books/[id]/export/route.ts`
- [X] T051 [US5] Wire the notes panel export button to download from `/api/books/[id]/export` in `components/reader/NotesPanel.tsx`

**Checkpoint**: User Story 5 is independently functional and testable with prior stories.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Regression, accessibility, performance, and final validation across all stories.

- [X] T052 [P] Add or refresh existing PDF highlight create/list/delete regression assertions after whole-book listing changes in `tests/integration/highlights-api.test.ts`
- [X] T053 [P] Add or refresh existing EPUB highlight create/list/delete regression assertions after whole-book listing changes in `tests/integration/epub-highlights-api.test.ts`
- [X] T054 Tune reader panel density, responsive behavior, visible focus rings, contrast, and no-overlap layout against `DESIGN.md` in `app/globals.css`
- [X] T055 Run `npm run lint`, `npm test`, and `npm run build`; record exact results and any remaining gaps in `specs/004-highlights-and-notes/quickstart.md`
- [X] T056 Run the PDF/EPUB manual quickstart, including fixtures for attached notes, standalone notes, stale CFI, save failure, mobile drawer, and export download; record verification notes in `specs/004-highlights-and-notes/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies, can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 and blocks all user stories.
- **User Stories (Phase 3+)**: Depend on Phase 2. Stories should be completed in priority order for MVP delivery, but US3, US4, and US5 can be staffed independently after the P1 stories stabilize.
- **Polish (Phase 8)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundation. No dependency on other stories.
- **US2 (P1)**: Starts after Foundation. Depends on US1 panel surfaces for full browser verification, but API and query work can begin independently.
- **US3 (P2)**: Starts after US2 note persistence is available.
- **US4 (P2)**: Starts after US1 panel items and US3 standalone locators are available.
- **US5 (P3)**: Starts after note persistence and annotation listing are available.

### Within Each User Story

- Tests should be written first and fail before implementation.
- Pure helpers and query functions before route handlers and server actions.
- Route handlers and server actions before client integration.
- Client components before browser verification.
- Each story reaches its checkpoint before moving to the next priority story.

---

## Parallel Opportunities

- Phase 1 tasks T002 and T003 can run in parallel after T001 is understood.
- Phase 2 tasks T006, T007, and T008 can run in parallel while T004 and T005 establish schema/query boundaries.
- US1 tests T009, T010, and T011 can run in parallel; T016 can run while T014 and T015 are in progress.
- US2 tests T021, T022, and T023 can run in parallel; T030 can run while query and route work proceed.
- US5 tests T045 and T046 can run in parallel before export implementation.
- Polish regression tasks T052 and T053 can run in parallel.

---

## Parallel Example: User Story 1

```bash
Task: "Add unit tests for chapter grouping, PDF page sort, EPUB CFI fallback sort, 120-character excerpt truncation, and location labels in tests/unit/annotation-sort.test.ts"
Task: "Add unit tests for valid, missing, and malformed reader.notesPanel preference values in tests/unit/notes-panel-preference.test.ts"
Task: "Add integration tests for GET /api/highlights?bookId=[id]&includeNotes=true, preserving existing PDF page-scoped behavior, in tests/integration/highlights-panel-api.test.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Add unit tests for note max length, empty-delete normalization, standalone locator validation, and highlight-detached fallback validation in tests/unit/note-validation.test.ts"
Task: "Add integration tests for attached note create, update, whitespace delete, highlight-deleted detach fallback, and note search query behavior in tests/integration/notes-api.test.ts"
Task: "Create components/reader/NoteEditor.tsx with a plain monospace Markdown textarea, maxLength={50000}, autosize behavior, save status, delete control, and accessible error messaging"
```

## Parallel Example: User Story 5

```bash
Task: "Add unit tests for Markdown export formatting, chapter headings, highlight blockquotes, attached notes, standalone notes, empty exports, and filename sanitization in tests/unit/note-export.test.ts"
Task: "Add integration tests for GET /api/books/[id]/export response headers, body, empty-book export, and missing-book errors in tests/integration/notes-export.test.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: US1 Review Highlights in a Notes Panel.
4. Complete Phase 4: US2 Add and Edit Highlight Notes.
5. Stop and validate the P1 MVP with unit, integration, browser, and manual checks.

### Incremental Delivery

1. Deliver US1 so readers can review highlights without leaving the book.
2. Deliver US2 so highlights become durable note artifacts with autosave and local search indexing.
3. Deliver US3 so page-level PDF and CFI-level EPUB thoughts are supported.
4. Deliver US4 so every artifact remains anchored to source text.
5. Deliver US5 so all annotations can leave the app as Markdown.

### Final Validation

1. Run `npm run lint`.
2. Run `npm test`.
3. Run `npm run build`.
4. Run the manual quickstart in `specs/004-highlights-and-notes/quickstart.md`.
5. Record exact results and fixture notes in `specs/004-highlights-and-notes/quickstart.md`.

---

## Notes

- `[P]` tasks touch different files and can run concurrently after dependencies are satisfied.
- `[US#]` labels map directly to user stories in `specs/004-highlights-and-notes/spec.md`.
- Existing PDF page highlight, EPUB CFI highlight, progress saving, ToC navigation, and zoom/font-size preferences must remain green throughout implementation.
- Optional extension hook available before and after task generation: `/speckit-git-commit`.
