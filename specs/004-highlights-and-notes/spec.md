# Feature Specification: Highlights and Notes

**Feature Branch**: `004-highlights-and-notes`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: `references/004-highlights-and-notes.md`

## User Scenarios & Testing

### User Story 1 - Review Highlights in a Notes Panel (Priority: P1)

As a reader, I want to open a side panel listing all highlights for the current
book so that I can review what I found important without leaving the reader.

**Why this priority**: The panel is the entry point for every note workflow and
must work before editing, export, or search can be useful.

**Independent Test**: Open a PDF and an EPUB with existing highlights, toggle
the notes panel, and verify highlights appear grouped by chapter with readable
location labels.

**Acceptance Scenarios**:

1. **Given** a reader page with highlights, **When** the bookmark icon is
   activated, **Then** a right-side notes panel opens at 320 px on desktop.
2. **Given** the panel is open, **When** highlights are loaded, **Then** they are
   grouped by stored chapter, with missing chapters under `Uncategorized`.
3. **Given** the viewport is narrow, **When** the panel opens, **Then** controls
   and text remain readable without overlapping the reader header.

---

### User Story 2 - Add and Edit Highlight Notes (Priority: P1)

As a reader, I want to write a Markdown note attached to a highlight so that I
can explain why the passage matters.

**Why this priority**: Attached notes turn passive highlights into durable
memory artifacts and are the core value of this feature.

**Independent Test**: Add a note to a highlight, wait for autosave, reload the
book, edit the note, clear the note, and verify the database and panel state
match each step.

**Acceptance Scenarios**:

1. **Given** a highlight has no note, **When** `Add note` is activated, **Then**
   an inline monospace Markdown textarea opens below that item.
2. **Given** note content changes, **When** the user stops typing for 800 ms,
   **Then** the note is saved and a short-lived `Saved` indicator appears.
3. **Given** a note textarea is cleared to whitespace, **When** autosave runs,
   **Then** the note row is deleted and the item returns to `Add note`.

---

### User Story 3 - Create Standalone Page Notes (Priority: P2)

As a reader, I want to write a standalone note for my current page or EPUB
location so that I can capture thoughts that are not tied to selected text.

**Why this priority**: Technical reading often produces page-level thoughts
that do not map to a single highlight.

**Independent Test**: Navigate to a PDF page and an EPUB CFI, add a standalone
page note, reload, and verify the note appears at the same location in the
panel.

**Acceptance Scenarios**:

1. **Given** the notes panel is open, **When** `Add page note` is activated,
   **Then** a standalone note editor opens at the top of the panel.
2. **Given** the current book is a PDF, **When** the standalone note is saved,
   **Then** it stores `highlightId = null` and the current `page`.
3. **Given** the current book is an EPUB, **When** the standalone note is saved,
   **Then** it stores `highlightId = null` and the current `cfi`.

---

### User Story 4 - Navigate Back to a Highlight or Note (Priority: P2)

As a reader, I want to click a highlight or standalone note in the panel so that
I can jump back to the source location.

**Why this priority**: Review only works when every memory artifact remains
anchored to the book text.

**Independent Test**: Click panel items for PDF highlights, PDF standalone
notes, EPUB highlights, and EPUB standalone notes; verify the reader navigates
to the expected page or CFI.

**Acceptance Scenarios**:

1. **Given** a PDF highlight item, **When** it is clicked, **Then** the reader
   scrolls to that page and keeps the panel open.
2. **Given** an EPUB highlight item, **When** it is clicked, **Then** the
   rendition displays the stored CFI.
3. **Given** a target location can no longer be resolved, **When** it is
   clicked, **Then** the panel shows a visible non-blocking error.

---

### User Story 5 - Export Highlights and Notes to Markdown (Priority: P3)

As a reader, I want to export all highlights and notes for a book as Markdown so
that I can paste them into Obsidian or Notion.

**Why this priority**: Export preserves local ownership and gives the user a
portable memory artifact, but it can be layered after the panel and save flows.

**Independent Test**: Download the export for a book with grouped highlights,
attached notes, standalone notes, and no-note highlights; verify the Markdown
structure, filename, and empty-book state.

**Acceptance Scenarios**:

1. **Given** a book has highlights and notes, **When** Export is activated,
   **Then** `GET /api/books/[id]/export` downloads a `.md` file.
2. **Given** annotations span multiple chapters, **When** export completes,
   **Then** chapters are level-2 headings and highlights render as blockquotes.
3. **Given** a book has no highlights or notes, **When** export runs, **Then**
   the file contains the header and `No highlights or notes yet.`

### Edge Cases

- Note content over 50,000 characters is blocked client-side and rejected by the
  API with `Note content exceeds the maximum length of 50 000 characters.`
- If a highlight is deleted while its note editor is open, the next save
  converts the note to a standalone page note at the last known page or CFI and
  shows a visible explanation.
- Very long highlight text is truncated to 120 characters in the panel but is
  stored and exported in full.
- Concurrent edits from two tabs use last-write-wins based on `updatedAt`.
- Failed autosave shows `Save failed. Your changes are not saved.` and retries
  on the next keystroke.
- A malformed or stale CFI target remains in the database but shows a
  non-blocking navigation failure in the panel.
- Panel open state is restored from `localStorage` under `reader.notesPanel`.

## Requirements

### Functional Requirements

- **FR-001**: PDF and EPUB reader headers MUST include an icon-only bookmark
  button that toggles the notes panel and has an accessible label.
- **FR-002**: The notes panel MUST render as an `<aside>` inside the reader
  layout, sticky to the viewport, 320 px wide on desktop, and scrollable.
- **FR-003**: Opening the panel MUST shrink the reader workspace instead of
  covering readable content on desktop; mobile may use a drawer-style overlay.
- **FR-004**: Panel open state MUST persist in `localStorage` under
  `reader.notesPanel`.
- **FR-005**: The panel MUST load all highlights for the current book on open
  through `GET /api/highlights?bookId=[id]`, preserving existing page-scoped
  PDF highlight requests.
- **FR-006**: Highlight panel items MUST show a 4 px color bar, 120-character
  excerpt with ellipsis, chapter label, page or CFI reference, and note
  indicator.
- **FR-007**: Highlight items MUST be grouped by chapter, with missing chapter
  values grouped under `Uncategorized`.
- **FR-008**: PDF highlights MUST sort by page ascending, then first rectangle
  position, then creation time; EPUB highlights MUST sort by chapter and CFI or
  creation time when exact spine order is unavailable.
- **FR-009**: Clicking a highlight item MUST navigate the active reader to its
  PDF page or EPUB CFI.
- **FR-010**: Each highlight item MUST expose an `Add note` or `Edit note`
  action that opens a plain `<textarea>` Markdown editor below the item.
- **FR-011**: The textarea MUST use a monospace font, auto-expand vertically,
  enforce `maxLength={50000}`, and avoid a WYSIWYG toolbar.
- **FR-012**: Note edits MUST autosave 800 ms after the last keystroke.
- **FR-013**: Note create/update MUST persist `{ bookId, highlightId, content,
  page, cfi }` through shared note query functions exposed by route handlers and
  server actions.
- **FR-014**: Whitespace-only note saves MUST delete the existing note instead
  of storing empty content.
- **FR-015**: Standalone page notes MUST save `highlightId = null` plus the
  current PDF page or EPUB CFI.
- **FR-016**: Standalone notes MUST appear interleaved with highlights by
  location and display a `Page [n]` or `CFI` label instead of a highlight color
  bar.
- **FR-017**: Deleting a note MUST clear the textarea state and call
  `DELETE /api/notes/[id]`.
- **FR-018**: `GET /api/books/[id]/export` MUST return a Markdown attachment
  using the documented title, author, export timestamp, chapter headings,
  highlight blockquotes, metadata, notes, and separators.
- **FR-019**: Note content MUST be searchable through a local notes query/index
  so future global search can include note rows without reprocessing books.
- **FR-020**: This feature MUST NOT regress existing PDF page highlights, EPUB
  CFI highlights, progress saving, ToC navigation, or font-size/zoom
  preferences.

### Constitution Alignment

- **Reading Flow**: Notes are added inside the active reader without leaving the
  book, and the panel remains collapsible and secondary to the reading surface.
- **Local Data Ownership**: Highlights, notes, and exports remain local to
  SQLite, route handlers, and browser downloads; no cloud service is required.
- **PDF/EPUB Behavior**: The plan defines both PDF page locators and EPUB CFI
  locators for notes, navigation, and export metadata.
- **Search & Memory**: Notes and highlights remain durable, queryable, linked to
  book IDs, and anchored to precise PDF pages or EPUB CFIs.
- **Quality Gates**: The plan and quickstart define performance, persistence,
  reliability, accessibility, data, export, and visual checks.

### Key Entities

- **Book**: Existing library item whose title, author, format, and ready status
  are used for panel context and Markdown export.
- **Highlight**: Existing annotation row storing selected text, color, page or
  CFI, chapter, and book relationship.
- **Note**: Durable Markdown note with optional highlight relationship, page or
  CFI locator, content, and timestamps.
- **ReaderAnnotationItem**: Client-side panel row combining a highlight, an
  attached note, or a standalone note into one sortable review item.
- **NotesPanelPreference**: Browser-local open/closed state stored under
  `reader.notesPanel`.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Opening the notes panel renders up to 500 highlight/note items
  within 300 ms after data is received.
- **SC-002**: Autosave starts 800 ms after the last keystroke and local SQLite
  note mutations complete within 200 ms.
- **SC-003**: Attached and standalone notes persist across reloads for PDF and
  EPUB books in 100% of manual verification attempts.
- **SC-004**: Export downloads a valid Markdown file with the documented
  structure for books with annotations and books without annotations.
- **SC-005**: Keyboard-only users can toggle the panel, move through panel
  items, open editors, edit notes, delete notes, navigate to source locations,
  and activate export.
- **SC-006**: Existing PDF and EPUB highlight create/reload/delete flows remain
  green under existing integration tests.

## Assumptions

- The project remains a single-user local Next.js application backed by SQLite
  and local filesystem storage.
- The existing `notes` table is the intended persistence foundation for this
  feature.
- One note is attached to at most one highlight in the MVP; standalone notes are
  represented by `highlightId = null`.
- Markdown notes are stored as plain text and exported without rendering HTML.
- A full global search UI is covered by a separate search feature; this feature
  makes notes queryable and locally indexed for that future UI.
