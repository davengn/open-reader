<!--
Sync Impact Report
Version change: unversioned template -> 1.0.0
Modified principles:
- PRINCIPLE_1_NAME -> I. Reading Flow Is the Product
- PRINCIPLE_2_NAME -> II. Local-First Self-Hosted Ownership
- PRINCIPLE_3_NAME -> III. Format Fidelity and Parity
- PRINCIPLE_4_NAME -> IV. Searchable Knowledge and Durable Memory
- PRINCIPLE_5_NAME -> V. Measurable Quality Gates
Added sections:
- Technology and Data Constraints
- Development Workflow and Quality Gates
- Governance
Removed sections:
- Placeholder example comments from the initialized template
Templates requiring updates:
- .specify/templates/plan-template.md - updated
- .specify/templates/spec-template.md - updated
- .specify/templates/tasks-template.md - updated
- .specify/templates/commands/*.md - not present
Runtime guidance reviewed:
- AGENTS.md - reviewed, no update required
- DESIGN.md - reviewed, no update required
- references/001-book-library.md - reviewed, no update required
- references/swe_reader_ts_sqlite_architecture.html - reviewed, no update required
Follow-up TODOs:
- None
-->
# Open Reader Constitution

## Core Principles

### I. Reading Flow Is the Product
Open Reader exists to help a software engineer read, remember, search, and annotate
technical books. Every feature MUST preserve a fast path for the core loop: add a book,
open it, resume where reading stopped, search the text, highlight, and write notes.
Reader screens MUST prioritize document content over panels, marketing copy, or
decorative chrome. Controls that do not support the active reading task MUST be
collapsible, secondary, or moved out of the reading surface. Reading progress, current
location, library filters, sort order, and annotation state MUST persist whenever the
workflow implies continuity.

Rationale: technical books contain long chapters, code listings, diagrams, tables, and
cross-references. The product succeeds only when the reader can stay inside the book
without fighting the interface.

### II. Local-First Self-Hosted Ownership
Open Reader is a single-user, self-hosted application by default. Raw PDF and EPUB files
MUST remain on the configured local filesystem, and SQLite MUST remain the source of
truth for book metadata, reading progress, highlights, notes, flashcards, and searchable
chunks. Core reading, search, annotation, and review workflows MUST work without a
cloud storage service, hosted database, or external AI provider. Any feature that sends
book content outside the host machine MUST be optional, explicitly configured, and
documented in the feature spec. Deleting a book MUST remove its file and all dependent
database rows, or the spec MUST define a reversible archive flow instead.

Rationale: the library is a personal knowledge base built from purchased or private
books. Ownership, portability, and predictable backups matter more than multi-tenant
platform concerns.

### III. Format Fidelity and Parity
PDF and EPUB are first-class formats. Rendering and parsing MUST use proven libraries
instead of hand-rolled document engines unless a spec justifies the exception. Features
that affect reading, progress tracking, search, highlights, or notes MUST define behavior
for both PDF and EPUB, or explicitly state why the feature is scoped to one format. Every
persisted reading location MUST use a stable locator: PDF features MUST store page-level
location plus quote/context or coordinates when needed, and EPUB features MUST store
CFI plus chapter/context when available. Corrupt, unsupported, or partially processed
documents MUST fail with visible status and recoverable user actions.

Rationale: a mixed technical library is only useful when the reader can trust that both
fixed-layout and reflowable books keep their place, selections, and references.

### IV. Searchable Knowledge and Durable Memory
Uploaded book text MUST be indexed for full-text search before the book is marked ready
for search-dependent features. Highlights, notes, flashcards, summaries, and any future
learning artifacts MUST be durable, queryable, and linked back to a precise book
location. Search results and AI-assisted answers MUST cite the book title and location
they use. AI chat or summary features MUST ground responses in retrieved indexed chunks
and MUST degrade gracefully when indexing is incomplete or unavailable. Schema changes
that touch books, progress, annotations, flashcards, or chunks MUST include migrations
and backfill or compatibility handling for existing local data.

Rationale: remembering is the product's second half. Notes and search are not side data;
they are the personal memory layer over the library.

### V. Measurable Quality Gates
Every feature MUST define measurable success criteria for the user journey it changes.
Plans MUST include performance, persistence, reliability, and accessibility checks when
those concerns are touched. The baseline gates are: the library loads in under 1 second
for 200 books; accepted uploads appear in the library within 3 seconds; files up to 200
MB receive either a successful queued import or a deterministic error; background
indexing exposes status; and reader interactions remain usable with keyboard, pointer,
and touch input. Tests MUST cover changed data mutations, file lifecycle behavior,
indexing/search behavior, deletion cascades, and resume/annotation persistence.

Rationale: a self-hosted reader becomes hard to trust when failures are silent or
performance slowly degrades. Quality must be observable at the feature boundary.

## Technology and Data Constraints

- The target architecture is a TypeScript web application using Next.js App Router,
  React server/client components, API routes, and server actions. A separate backend
  process MUST NOT be added unless the implementation plan proves why the App Router
  model is insufficient.
- The UI MUST follow the visual system in `DESIGN.md`: warm editorial canvas, restrained
  coral accents, dark product surfaces for code/technical panels, documented spacing,
  radius, and typography scales. Product-specific Claude or Anthropic names, marks, and
  copy in that reference MUST NOT ship as Open Reader branding.
- PDF rendering SHOULD use `pdfjs-dist`; EPUB rendering SHOULD use `epubjs`. Server-side
  extraction MAY use focused parser libraries where background indexing or metadata
  extraction requires it.
- Persistent data MUST use SQLite with typed schema access, migrations, and FTS5 for
  full-text book search. Drizzle ORM and `better-sqlite3` are the preferred stack unless
  a plan documents a stronger local-first alternative.
- Raw book files MUST live under a configured local book storage root such as `books/`.
  Cover images and generated artifacts MUST be stored in deterministic subdirectories
  and referenced from SQLite.
- External AI integrations are optional learning accelerators. The base reader, library,
  annotation, search, and review experience MUST remain useful without provider keys.

## Development Workflow and Quality Gates

- Each feature spec MUST contain independently testable user stories with explicit
  acceptance scenarios for reading, storage, search, annotation, or review behavior
  when those areas are touched.
- Each plan MUST complete the Constitution Check before research and re-check it after
  design. Any failed gate MUST be tracked in Complexity Tracking with the rejected
  simpler alternative.
- Each plan that touches persisted data MUST identify affected SQLite tables, migrations,
  cascade behavior, and compatibility handling for existing local libraries.
- Each plan that touches UI MUST state how it applies `DESIGN.md`, including typography,
  surface color, density, responsive behavior, and keyboard/touch accessibility.
- Each task list MUST include concrete file paths and story traceability. Tasks for
  migrations, indexing, parser/renderer behavior, local file lifecycle, and visual QA
  MUST be explicit whenever the feature changes those areas.
- Reviews MUST block changes that hide reader content behind unnecessary UI, create
  cloud dependencies for core workflows, lose book-location fidelity, or make notes and
  highlights hard to recover.

## Governance

This constitution supersedes conflicting implementation habits, generated templates, and
ad hoc design choices. Amendments MUST include a rationale, a semantic version change,
and a Sync Impact Report covering affected templates and runtime guidance. If an
amendment changes data ownership, supported formats, or persistence guarantees, it MUST
include a migration or transition plan.

Versioning policy:

- MAJOR version changes redefine or remove a core principle or change local-first data
  ownership in a backward-incompatible way.
- MINOR version changes add a principle, add a governed section, or materially expand
  required checks.
- PATCH version changes clarify language, fix wording, or update references without
  changing obligations.

Compliance is reviewed during `/speckit-plan`, `/speckit-tasks`, code review, and final
feature verification. The Constitution Check in each plan is mandatory; unresolved
violations MUST be documented before implementation begins.

**Version**: 1.0.0 | **Ratified**: 2026-06-01 | **Last Amended**: 2026-06-01
