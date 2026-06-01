# Tasks: Book Library

**Input**: Design documents from `D:\Projects\open-reader\specs\001-book-library\`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`

**Tests**: Required for file lifecycle, SQLite mutations, indexing/chunking, deletion cascades, library preferences, and accessibility-sensitive UI states touched by this feature.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested as an independent increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it targets different files and has no dependency on incomplete tasks
- **[Story]**: User story traceability label
- Every task includes concrete file paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the Next.js TypeScript application, styling system, and local storage basics.

- [X] T001 Create Next.js/TypeScript project configuration in `package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `tailwind.config.ts`, and `vitest.config.ts`
- [X] T002 Create root app shell and warm editorial global styles in `app/layout.tsx`, `app/globals.css`, and `app/not-found.tsx`
- [X] T003 Create local storage placeholders and ignore rules in `.gitignore`, `books/.gitkeep`, `books/covers/.gitkeep`, and `tests/fixtures/books/.gitkeep`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the local-first database, storage, validation, parser, and test infrastructure required by every story.

**Critical**: No user story work can begin until this phase is complete.

- [X] T004 Define Drizzle schema, SQLite connection, and migration runner in `lib/db/schema.ts`, `lib/db/index.ts`, `lib/db/migrate.ts`, and `lib/db/migrations/0001_book_library.sql`
- [X] T005 Implement book query and mutation helpers in `lib/db/queries/books.ts`
- [X] T006 Implement shared book validation constants and API response helpers in `lib/validation/books.ts` and `lib/api/responses.ts`
- [X] T007 Implement local book and cover storage helpers in `lib/storage/bookFiles.ts` and `lib/storage/covers.ts`
- [X] T008 Implement parser, placeholder cover, text chunking, and ingestion helpers in `lib/parsers/pdf.ts`, `lib/parsers/epub.ts`, `lib/ingestion/chunkText.ts`, `lib/ingestion/processBook.ts`, and `lib/ingestion/enqueueBookProcessing.ts`
- [X] T009 Configure test helpers for temporary SQLite and book roots in `tests/helpers/testEnv.ts`

---

## Phase 3: User Story 1 - Upload a Book (Priority: P1) MVP

**Goal**: Accept PDF/EPUB uploads, save them locally, reject invalid files, create an indexing book row, and transition processing status.

**Independent Test**: Upload one valid PDF and one valid EPUB, verify `202 Accepted`, local file persistence, indexing visibility, and processing completion or error state.

### Tests for User Story 1

- [X] T010 [P] [US1] Add file validation, hashing, and chunking unit tests in `tests/unit/file-validation.test.ts` and `tests/unit/chunk-text.test.ts`
- [X] T011 [P] [US1] Add upload and ingestion integration tests in `tests/integration/ingestion.test.ts`

### Implementation for User Story 1

- [X] T012 [US1] Implement `GET /api/books` and streamed `POST /api/books` upload route in `app/api/books/route.ts`
- [X] T013 [US1] Wire upload lifecycle through storage, duplicate detection, parser metadata fallback, chunk indexing, and status transitions in `lib/ingestion/processBook.ts` and `lib/db/queries/books.ts`
- [X] T014 [US1] Implement upload UI and upload error display in `components/library/UploadDropzone.tsx`
- [X] T015 [US1] Render the initial library page from server data and refresh after uploads in `app/(library)/page.tsx` and `components/library/LibraryClient.tsx`

---

## Phase 4: User Story 2 - Browse and Resume Reading (Priority: P1)

**Goal**: Render a scannable library grid with cover/placeholder, metadata, format badge, reading progress, and ready-book navigation.

**Independent Test**: Seed PDF and EPUB books with varied metadata and status, verify the cards render correctly and ready cards navigate to `/book/[id]`.

### Tests for User Story 2

- [X] T016 [P] [US2] Add placeholder cover and card sorting unit tests in `tests/unit/placeholder-cover.test.ts` and `tests/unit/book-sort.test.ts`

### Implementation for User Story 2

- [X] T017 [US2] Implement book cards, grid, and empty states in `components/library/BookCard.tsx`, `components/library/BookGrid.tsx`, and `components/library/EmptyLibrary.tsx`
- [X] T018 [US2] Implement cached cover image route in `app/api/covers/[name]/route.ts`
- [X] T019 [US2] Implement stable reader route placeholder in `app/book/[id]/page.tsx`

---

## Phase 5: User Story 3 - Filter and Sort the Library (Priority: P2)

**Goal**: Let readers filter by All/PDF/EPUB, sort by Title/Author/Last read/Date added, and preserve preferences in `localStorage`.

**Independent Test**: Seed mixed books, change filter/sort, hard refresh, and verify controls plus ordering persist.

### Tests for User Story 3

- [X] T020 [P] [US3] Add filter/sort preference tests in `tests/unit/library-preferences.test.ts`

### Implementation for User Story 3

- [X] T021 [US3] Implement preference helpers and sorting/filtering utilities in `lib/library/preferences.ts`
- [X] T022 [US3] Implement sticky toolbar controls in `components/library/LibraryToolbar.tsx`
- [X] T023 [US3] Implement no-match state and clear-filter action in `components/library/BookGrid.tsx`

---

## Phase 6: User Story 4 - Delete a Book (Priority: P2)

**Goal**: Confirm deletion, remove local files, and cascade SQLite rows for progress, highlights, notes, flashcards, chunks, and FTS rows.

**Independent Test**: Seed a book with dependent rows and files, delete it, and verify filesystem plus database cleanup.

### Tests for User Story 4

- [X] T024 [P] [US4] Add deletion cascade integration tests in `tests/integration/deletion-cascade.test.ts`

### Implementation for User Story 4

- [X] T025 [US4] Implement `DELETE /api/books/[id]` and `GET /api/books/[id]/status` in `app/api/books/[id]/route.ts` and `app/api/books/[id]/status/route.ts`
- [X] T026 [US4] Implement accessible delete confirmation flow in `components/library/BookCard.tsx`

---

## Phase 7: User Story 5 - Correct Book Metadata (Priority: P3)

**Goal**: Edit title and author inline on a book card and persist corrections.

**Independent Test**: Seed a book with missing metadata, edit title/author, refresh, and verify persisted values.

### Tests for User Story 5

- [X] T027 [P] [US5] Add metadata validation and update integration tests in `tests/integration/books-api.test.ts`

### Implementation for User Story 5

- [X] T028 [US5] Implement `PATCH /api/books/[id]` metadata update behavior in `app/api/books/[id]/route.ts`
- [X] T029 [US5] Implement inline metadata editor in `components/library/MetadataInlineEditor.tsx` and `components/library/BookCard.tsx`

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validate the full vertical slice against the constitution, quickstart, and visual system.

- [X] T030 Apply responsive visual/accessibility polish against `DESIGN.md` in `app/globals.css` and `components/library/*.tsx`
- [X] T031 Document local setup and validation scripts in `README.md`
- [X] T032 Run `npm run lint`, `npm run test`, and `npm run build`, then fix defects found during validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories
- **User Stories (Phase 3+)**: Depend on Foundational completion and can be delivered incrementally by priority
- **Polish (Phase 8)**: Depends on implemented stories

### User Story Dependencies

- **US1 Upload a Book (P1)**: Starts after foundation; MVP upload path
- **US2 Browse and Resume Reading (P1)**: Starts after foundation; can use seeded or uploaded books
- **US3 Filter and Sort (P2)**: Depends on the grid data model from US2
- **US4 Delete a Book (P2)**: Depends on book cards and database/file lifecycle helpers
- **US5 Correct Book Metadata (P3)**: Depends on book cards and metadata validation helpers

### Parallel Opportunities

- T010 and T011 can run in parallel after foundation
- T016 can run while US1 implementation is being verified
- T020, T024, and T027 target independent tests after shared helpers exist
- UI polish in T030 can proceed alongside README updates in T031

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 and validate upload/ingestion independently.
3. Complete US2 so uploaded books are usable from the library.

### Incremental Delivery

1. Add filter/sort persistence (US3).
2. Add safe deletion (US4).
3. Add inline metadata correction (US5).
4. Run quickstart validation and finish polish.
