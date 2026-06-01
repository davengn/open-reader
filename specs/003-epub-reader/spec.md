# Feature Specification: EPUB Reader

**Feature Branch**: `003-epub-reader`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: `references/003-epub-reader.md`

## User Scenarios & Testing

### User Story 1 - Read Reflowable EPUB Content (Priority: P1)

As a reader, I want to open an EPUB and read reflowable text in the existing
book route so that the content adapts to the current screen width.

**Why this priority**: This is the minimum viable reader experience for the
EPUB format and removes the current unsupported-format fallback.

**Independent Test**: Open a ready EPUB book from the library and verify the
book renders in the reader, reflows without horizontal scrolling, and can be
closed back to the library.

**Acceptance Scenarios**:

1. **Given** a ready EPUB book, **When** the reader route opens, **Then** the first
   chapter renders inside the main reading surface with no horizontal scroll.
2. **Given** a rendered EPUB, **When** the viewport width changes, **Then** the
   text reflows inside the reader container and controls remain usable.
3. **Given** the EPUB reader is open, **When** the user activates Close, **Then**
   the app returns to the library without losing saved progress.

---

### User Story 2 - Resume by Exact CFI Location (Priority: P1)

As a reader, I want my reading position saved using EPUB CFI so that reopening a
book returns me to the exact passage where I stopped.

**Why this priority**: EPUB has no stable page numbers. CFI persistence is the
format-fidelity requirement that makes resume useful for reflowable books.

**Independent Test**: Navigate into a later chapter, wait for the debounce,
reload the reader, and verify it displays from the saved CFI rather than the
first chapter.

**Acceptance Scenarios**:

1. **Given** an EPUB is open, **When** `epubjs` emits a relocated event, **Then**
   the reader saves the current CFI and percentage after a 1500 ms debounce.
2. **Given** a saved CFI exists, **When** the book is reopened, **Then** the
   reader displays from that CFI after the rendition is ready.
3. **Given** the user leaves before the debounce fires, **When** the book is
   reopened, **Then** the latest known CFI is still flushed as the resume point.

---

### User Story 3 - Highlight EPUB Text (Priority: P2)

As a reader, I want to select EPUB text, choose a highlight color, and see the
highlight persist across sessions so that important passages become durable
annotations.

**Why this priority**: Highlighting is the primary memory workflow for a
technical reader and must work for EPUB as well as PDF.

**Independent Test**: Select text, create highlights in all four colors, reload
the reader, and verify the marks reappear and can be deleted.

**Acceptance Scenarios**:

1. **Given** selected text inside the EPUB rendition, **When** the user chooses
   yellow, green, blue, or pink, **Then** the highlight is saved with its CFI,
   text, and color and appears in the EPUB content.
2. **Given** existing highlights for the book, **When** the EPUB loads, **Then**
   each highlight is reapplied through the `epubjs` annotations API.
3. **Given** a highlighted passage, **When** the user clicks the mark and chooses
   Delete, **Then** the mark is removed from the rendition and SQLite.

---

### User Story 4 - Navigate by Table of Contents (Priority: P2)

As a reader, I want a table of contents panel so that I can jump directly to
chapters and sections.

**Why this priority**: Technical EPUBs are long, and chapter-level navigation is
the expected companion to CFI-based resume.

**Independent Test**: Open an EPUB with nested navigation, use the ToC panel to
jump to several chapters, and verify the panel closes after each jump.

**Acceptance Scenarios**:

1. **Given** an EPUB has navigation metadata, **When** the reader opens, **Then**
   the ToC toggle is visible and the panel lists chapter labels with nesting.
2. **Given** the ToC panel is open, **When** the user clicks a chapter, **Then**
   the rendition displays that chapter and the panel closes.
3. **Given** an EPUB has no usable ToC, **When** the reader opens, **Then** the
   ToC toggle is hidden and previous/next navigation remains available.

---

### User Story 5 - Customize Font Size (Priority: P3)

As a reader, I want to choose a font size so that EPUB text is comfortable to
read for long sessions.

**Why this priority**: Font sizing is important for comfort but can be layered
after core rendering, progress, and annotations.

**Independent Test**: Change the font size through all supported values, reload
the reader, and verify the chosen value is restored.

**Acceptance Scenarios**:

1. **Given** the EPUB reader is open, **When** the user chooses 14px, 16px,
   18px, or 20px, **Then** the rendition applies that font size.
2. **Given** a font-size preference was saved, **When** any EPUB is opened,
   **Then** the reader restores that preference from `localStorage`.

### Edge Cases

- DRM-protected EPUBs are not supported; the reader displays
  "This book uses DRM and cannot be opened."
- If the saved CFI no longer resolves after a replacement upload, the reader
  falls back to the first chapter and shows "Your saved position could not be restored."
- Selections that span chapter boundaries do not show the color picker and show
  "Highlights cannot span chapters."
- Image-only EPUBs still render, but empty text selections do not show the
  highlight picker.
- Very long single-chapter EPUBs remain readable if `epubjs` switches to scroll
  mode; progress continues to use CFI.
- Malformed or missing ToC metadata hides the ToC toggle while preserving
  previous/next chapter navigation.
- If highlight data exists for a CFI that no longer resolves, the reader skips
  that mark and keeps the rest of the book usable.

## Requirements

### Functional Requirements

- **FR-001**: The book route MUST render a ready `format = "epub"` book with an
  EPUB reader instead of the unsupported-format fallback.
- **FR-002**: The EPUB reader MUST load `epubjs` only on the client and initialize
  `ePub()` with an `ArrayBuffer` fetched from `GET /api/books/[id]/file`.
- **FR-003**: The file route MUST stream EPUB files with a suitable EPUB content
  type and MUST reject non-ready or wrong-format books with deterministic JSON
  errors.
- **FR-004**: EPUB content MUST render into a full-width viewer managed by
  `epubjs` with reflowable text and no horizontal scrolling in normal reading.
- **FR-005**: The reader header MUST show book title, current chapter title,
  font-size control, ToC toggle when a ToC exists, previous/next controls, and a
  close button.
- **FR-006**: The reader MUST derive the current chapter title from the current
  rendition location and the loaded ToC when available.
- **FR-007**: The reader MUST build a left slide-in ToC panel from
  `book.navigation.toc`, render at most two visible nesting levels, and close the
  panel after a chapter is selected.
- **FR-008**: The reader MUST keep previous/next chapter navigation available
  even when ToC metadata is missing or malformed.
- **FR-009**: Selecting non-empty EPUB text MUST show the shared four-color
  highlight picker at the selection anchor.
- **FR-010**: Creating a highlight MUST call the `epubjs` annotations API and
  persist `bookId`, `cfi`, selected `text`, `color`, and optional chapter title.
- **FR-011**: Existing EPUB highlights MUST be fetched by `bookId` on load and
  reapplied through the `epubjs` annotations API.
- **FR-012**: Clicking an existing EPUB highlight MUST open a tooltip with a
  Delete action, and deletion MUST remove both the annotation and the SQLite row.
- **FR-013**: Reading progress MUST be saved as `locator_type = "epub-cfi"` with
  the current CFI, percentage, optional chapter, and timestamp.
- **FR-014**: Progress saves MUST be debounced for 1500 ms after the latest
  relocation and flushed through a keepalive-compatible route when the reader is
  hidden or unmounted.
- **FR-015**: On reopen, the reader MUST display the saved CFI after the rendition
  is ready; invalid CFI restoration MUST fall back to the first chapter with a
  visible banner.
- **FR-016**: Font size options MUST be exactly 14px, 16px, 18px, and 20px, with
  16px as the default.
- **FR-017**: The selected font size MUST be persisted in `localStorage` under
  `epub.fontSize` and restored on subsequent EPUB opens.
- **FR-018**: The reader MUST display a deterministic DRM unsupported message
  instead of a blank stage when an EPUB cannot be opened because of DRM.
- **FR-019**: EPUB reader UI MUST remain keyboard and pointer accessible,
  including focus states for header controls, ToC entries, color swatches, and
  highlight deletion.
- **FR-020**: This feature MUST NOT regress the PDF reader route, PDF page
  progress, or PDF page-rectangle highlight behavior.

### Constitution Alignment

- **Reading Flow**: EPUB books can be opened, resumed, navigated, highlighted,
  and closed from the same `app/book/[id]` route used by PDF. Notes and search UI
  are not changed by this feature.
- **Local Data Ownership**: Raw EPUB files stay under `books/`. Progress and
  highlights are stored in SQLite using existing CFI-capable columns. Deleting a
  book continues to cascade progress and highlight rows.
- **PDF/EPUB Behavior**: This feature is scoped to EPUB and uses stable EPUB CFI
  locators. PDF behavior remains page/rectangle based and is protected from
  regression by shared contract tests.
- **Search & Memory**: EPUB highlights persist selected text, CFI, color, and
  book linkage so future notes/search/review flows can cite exact EPUB passages.
  Existing FTS5 indexing is not weakened.
- **Quality Gates**: Performance, persistence, invalid-CFI recovery, DRM
  handling, accessibility, and design-system checks are defined in the plan and
  quickstart.

### Key Entities

- **Book**: Existing library item with `format = "epub"`, local file path,
  readiness status, reading percentage, and optional location count.
- **ReadingProgress**: One row per book storing `locator_type = "epub-cfi"`,
  the current CFI, optional chapter, percentage, and update timestamp.
- **Highlight**: Durable annotation storing selected text, color, EPUB CFI,
  optional chapter, and book relationship.
- **EpubTocItem**: Client-derived navigation entry with label, href, depth, and
  child entries flattened for the side panel.
- **EpubReaderPreference**: Browser-local font-size preference stored under
  `epub.fontSize`.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Ready EPUB files up to 30 MB render the first chapter within 2
  seconds on localhost in a modern desktop browser.
- **SC-002**: Chapter navigation from ToC, previous, or next renders the target
  location within 500 ms after the EPUB book has loaded.
- **SC-003**: After navigating to a later CFI and waiting 1500 ms, reopening the
  book resumes at that CFI in 100% of manual verification attempts.
- **SC-004**: Creating, reloading, and deleting highlights in all four supported
  colors succeeds without leaving stale marks in the rendition or database.
- **SC-005**: EPUB content reflows at desktop and mobile widths without
  horizontal page scroll caused by the reader shell.
- **SC-006**: Keyboard-only users can reach and operate close, ToC toggle, ToC
  links, previous/next, font-size control, highlight color choices, and delete.

## Assumptions

- The project continues as a single-user local Next.js application backed by
  SQLite and local filesystem storage.
- EPUB ingestion already accepts or will continue accepting EPUB files as
  `format = "epub"` and marks them `ready` before the reader opens.
- This feature adds `epubjs` as a browser dependency and does not add a separate
  backend service.
- DRM/LCP support is out of scope for MVP.
- Font family, theme, margin controls, notes editing, EPUB search UI, and
  dual-page layouts are out of scope for this feature.
