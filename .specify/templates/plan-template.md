# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript + Next.js App Router, or NEEDS CLARIFICATION

**Primary Dependencies**: React, pdfjs-dist, epubjs, Drizzle ORM, better-sqlite3, Tailwind/shadcn UI, or NEEDS CLARIFICATION

**Storage**: SQLite reader.db plus local books/ filesystem, or NEEDS CLARIFICATION

**Testing**: [unit/integration/browser strategy for reader, storage, indexing, and UI flows or NEEDS CLARIFICATION]

**Target Platform**: Self-hosted web app, or NEEDS CLARIFICATION

**Project Type**: Single Next.js web application, or NEEDS CLARIFICATION

**Performance Goals**: [e.g., library under 1s for 200 books, upload visible within 3s, responsive reader or NEEDS CLARIFICATION]

**Constraints**: [e.g., local-first, 200 MB file limit, PDF/EPUB parity, no required cloud service or NEEDS CLARIFICATION]

**Scale/Scope**: [e.g., single-user local library size, number of books, indexing volume or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Reading flow**: Does the plan preserve the core loop of add/open/resume/search/highlight/note without unnecessary reader chrome?
- **Local-first ownership**: Does the plan keep raw books on the local filesystem and metadata/memory artifacts in SQLite, with no required cloud dependency?
- **Format fidelity**: Does the plan define PDF and EPUB behavior, stable locators, corrupt-file handling, and explicit scope if only one format is changed?
- **Searchable memory**: Does the plan describe indexing/FTS5 impact and how highlights, notes, flashcards, summaries, or AI answers link back to book locations?
- **Measurable quality**: Does the plan define performance, persistence, reliability, accessibility, test, and `DESIGN.md` visual checks for touched areas?

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
app/
├── (library)/page.tsx           # book grid and upload entry
├── book/[id]/page.tsx           # reader view
├── book/[id]/notes/page.tsx     # book notes view
├── flashcards/page.tsx          # review flow when in scope
└── api/                         # Next.js route handlers

components/
├── library/
├── reader/
└── notes/

lib/
├── db/                          # Drizzle schema, migrations, typed queries
├── parsers/                     # PDF/EPUB metadata and text extraction
├── search/                      # FTS5 indexing/query helpers
└── storage/                     # local filesystem lifecycle helpers

books/                           # local uploaded files and generated covers
tests/                           # unit, integration, and browser tests
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
