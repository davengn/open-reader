# Research: Highlights and Notes

## Decision: Reuse the Existing `notes` Table

**Rationale**: The schema already includes `notes` with `book_id`,
`highlight_id`, `content`, `page`, `cfi`, and `updated_at`, which maps directly
to attached highlight notes and standalone page or CFI notes. Reusing it keeps
book deletion cascades intact and avoids migrating annotation rows into a new
store.

**Alternatives considered**:

- Add a new `annotations` table combining highlights and notes. Rejected because
  existing highlight APIs, PDF rectangle storage, EPUB CFI storage, and delete
  cascades already work.
- Store note content directly on `highlights`. Rejected because standalone notes
  need `highlight_id = null` and notes need independent search/export behavior.

## Decision: One Attached Note Per Highlight

**Rationale**: The UI exposes a singular `Add note` or `Edit note` action per
highlight item. A partial unique index on `notes(highlight_id)` where
`highlight_id IS NOT NULL` keeps the data model aligned with the UI while still
allowing unlimited standalone notes.

**Alternatives considered**:

- Allow multiple notes per highlight. Rejected for MVP because it would require
  thread-like UI, extra ordering controls, and ambiguous note indicators.
- Store attached note drafts only in localStorage. Rejected because notes must be
  durable, searchable, and exportable.

## Decision: Add a Dedicated Notes Query Module

**Rationale**: `lib/db/queries/reader.ts` already handles progress and
highlight mutations. Note-specific create/update/delete/list/search/export
logic is broad enough to justify `lib/db/queries/notes.ts`, while shared
highlight listing can continue to live in reader queries or delegate to the new
module.

**Alternatives considered**:

- Put all note logic into `reader.ts`. Rejected because it would turn a large
  mixed query module into a less navigable persistence bucket.
- Put note logic into route handlers directly. Rejected because server actions,
  export, integration tests, and route handlers should share the same validation
  and transaction behavior.

## Decision: Keep Route Handlers as Public Contracts and Add Server Actions for Reader Autosave

**Rationale**: The reference requires `POST /api/notes`, `PATCH /api/notes/[id]`,
`DELETE /api/notes/[id]`, and `GET /api/books/[id]/export`. The current reader
also uses server actions for progress saves. Implementing `saveReaderNote` and
`deleteReaderNote` in `app/book/[id]/actions.ts` lets the panel follow current
reader patterns while route handlers satisfy API contracts and download flows.

**Alternatives considered**:

- Use only route handlers from the client. Accepted as a possible
  implementation detail, but server actions remain documented because the
  feature explicitly calls out debounced server-action saves.
- Use only server actions. Rejected because export and `DELETE /api/notes/[id]`
  are explicit route contracts.

## Decision: Extend `/api/highlights` for Whole-Book Panel Listing

**Rationale**: Existing PDF highlight listing is page-scoped and EPUB listing is
book-scoped. The notes panel needs all highlights for the current book via
`GET /api/highlights?bookId=[id]`. Preserve existing PDF page behavior when
`page` is supplied, and add a whole-book path when only `bookId` is supplied.
An `includeNotes=true` flag can attach the current note summary to each
highlight.

**Alternatives considered**:

- Add `/api/books/[id]/annotations`. Rejected because it conflicts with the
  provided acceptance criteria and duplicates highlight list semantics.
- Fetch every PDF page independently. Rejected because a 500-highlight book
  should not require hundreds of requests.

## Decision: Use Local FTS for Note Search

**Rationale**: The constitution requires durable searchable memory, and the
feature summary says notes are searchable. Add `notes_fts` backed by the
`notes` table, with triggers for insert/update/delete and `bookId` as an
unindexed filter column. This mirrors the existing `book_chunks_fts` approach
and makes future global search integration straightforward.

**Alternatives considered**:

- Use SQL `LIKE` queries only. Rejected because the project already uses SQLite
  FTS5 and note content can grow to 50,000 characters.
- Delay note search until the global search feature. Rejected because creating
  notes without a queryable local index weakens the memory layer.

## Decision: Generate Markdown Export Server-Side

**Rationale**: The export route needs book metadata, highlight rows, attached
notes, standalone notes, chapter grouping, and a deterministic attachment
filename. Server-side generation keeps local data access simple, avoids exposing
raw query composition to the client, and works without any Markdown library.

**Alternatives considered**:

- Generate Markdown in the browser after fetching panel data. Rejected because
  it duplicates export formatting and would require the client to fetch all
  export data anyway.
- Store export files on disk. Rejected because exports should be generated on
  demand and not become another artifact lifecycle to clean up.

## Decision: Autosave with Last-Write-Wins

**Rationale**: The reference defines an 800 ms debounce and last-write-wins for
concurrent tabs. `updated_at` is sufficient for user feedback and future
conflict diagnostics, while avoiding conflict UI in the MVP.

**Alternatives considered**:

- Add optimistic concurrency tokens. Rejected because conflict handling is
  explicitly out of scope for MVP.
- Save on blur only. Rejected because long notes should not be lost when the
  reader is closed or navigated unexpectedly.
