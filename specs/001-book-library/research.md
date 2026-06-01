# Research: Book Library

## Decision: Use one Next.js App Router application

**Rationale**: The feature needs a web UI, upload route handlers, server-side
file/database mutations, and a local self-hosted deployment. A single App Router
app keeps the MVP simple and matches the project constitution.

**Alternatives considered**:

- Separate Express/Fastify backend: rejected for MVP because it adds a second
  process without a current scaling need.
- Static frontend plus local API service: rejected because route handlers and
  server actions cover the required local mutations.

## Decision: Stream multipart uploads instead of buffering entire files

**Rationale**: The upload limit is 200 MB. A streaming multipart parser lets the
route enforce size/type limits, compute SHA-256 while writing, and delete partial
files on interruption without holding the whole file in memory.

**Alternatives considered**:

- `request.formData()`: simple, but risks high memory usage for 200 MB files.
- Client-side hashing only: rejected because server-side validation is still
  required for local data integrity.

## Decision: Store raw files on disk and all metadata in SQLite

**Rationale**: This is the core local-first ownership model. Files are easy to
back up and inspect; SQLite keeps book metadata, progress, annotations, chunks,
and processing state transactionally queryable.

**Alternatives considered**:

- Storing books as SQLite blobs: rejected because large PDFs/EPUBs are better
  managed by the filesystem and served directly.
- Object storage: rejected because the MVP must not require a cloud service.

## Decision: Use Drizzle ORM with better-sqlite3

**Rationale**: Drizzle gives typed schema and migrations while keeping SQLite
close to the metal. `better-sqlite3` fits a self-hosted single-user workload and
works well for simple synchronous local transactions.

**Alternatives considered**:

- Prisma: rejected for this feature because Drizzle is lighter for SQLite and
  has a smaller runtime surface.
- Raw SQL only: rejected because migrations and type-safe query helpers will
  reduce schema drift as annotations/search expand.

## Decision: Create a lightweight in-process ingestion queue

**Rationale**: The route handler must return `202 Accepted` quickly after file
save. A local queue can process metadata, covers, text extraction, chunking, and
FTS5 indexing while the UI polls status. On app startup, interrupted `indexing`
rows can be retried or marked recoverable.

**Alternatives considered**:

- Redis-backed queue: rejected because it violates MVP simplicity and adds an
  external service.
- Synchronous extraction in upload route: rejected because large books would
  block the response and violate the 3-second visibility target.

## Decision: Use proven PDF/EPUB libraries for parsing and rendering support

**Rationale**: The project constitution requires proven document engines.
`pdfjs-dist` supports PDF page rendering and can support cover generation/text
workflows; EPUB metadata/cover extraction should use a maintained EPUB parser.
Client reader rendering will later use `pdfjs-dist` and `epubjs`.

**Alternatives considered**:

- Hand-rolled PDF/EPUB parsing: rejected as high-risk and unnecessary.
- Treat EPUB as ZIP plus custom XML parsing everywhere: rejected except for
  narrow fallback extraction paths because EPUB edge cases accumulate quickly.

## Decision: Prepare FTS5 chunks during upload processing

**Rationale**: Search UI is out of scope for this feature, but the constitution
requires durable searchable memory. Creating `book_chunks` and FTS5 rows during
ingestion lets future search and AI features attach to the same local source of
truth.

**Alternatives considered**:

- Defer all indexing to a future spec: rejected because the library already
  exposes processing status and "ready" semantics.
- Use a vector database first: rejected because FTS5 is built into SQLite and
  sufficient for first search.

## Decision: Keep filter/sort client-side for the MVP

**Rationale**: The target library size is at least 200 books, which is small
enough to fetch summaries once and filter/sort locally. This keeps controls
instant and allows `localStorage` persistence without extra API complexity.

**Alternatives considered**:

- Server-side filtering/sorting: useful later for very large libraries, but
  unnecessary for the stated MVP scale.

## Decision: Use an editorial product UI, not a landing-page hero

**Rationale**: The library is the first screen of a working reading app. It must
show the collection and upload workflow immediately. The design should borrow
the warm canvas, serif display tone, restrained coral actions, and compact
controls from `DESIGN.md`, but remove Claude/Anthropic brand content.

**Alternatives considered**:

- Marketing-style hero plus feature cards: rejected because it delays the
  primary task.
- Dense dashboard aesthetic: rejected because the app should feel like a calm
  technical reading workspace, not an admin console.

## Decision: Test storage and lifecycle behavior at integration level

**Rationale**: The highest-risk paths combine filesystem writes, hashing,
SQLite mutations, queue status, and cleanup. Integration tests with temporary
book roots and SQLite databases give confidence without needing cloud services.

**Alternatives considered**:

- Unit tests only: rejected because lifecycle failures happen across boundaries.
- End-to-end tests only: rejected because they are slower and harder to isolate
  for disk/database edge cases.
