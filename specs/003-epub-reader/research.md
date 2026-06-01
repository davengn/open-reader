# Research: EPUB Reader

## Decision: Render EPUBs in the browser with `epubjs`

**Rationale**: The constitution calls for proven format libraries, and EPUB
reading needs reflowable layout, CFI generation, ToC parsing, relocated events,
and annotation support. `epubjs` provides those browser primitives without a
custom document engine or a second backend service.

**Alternatives considered**:

- Server-render EPUB chapters to HTML: rejected because it would recreate CFI,
  rendition, and annotation behavior already provided by `epubjs`.
- Parse EPUB ZIP contents directly in React: rejected because OPF, spine,
  navigation, and CFI edge cases are easy to get wrong.
- Embed a generic browser iframe to the raw EPUB file: rejected because browsers
  do not provide consistent EPUB rendering or app-level progress/highlighting.

## Decision: Load `epubjs` as a client-only dependency

**Rationale**: EPUB rendering depends on DOM, iframe, selection, and layout APIs.
The Next.js route should import the EPUB reader component from the client side
and dynamically load `epubjs` so the server render never touches browser-only
globals.

**Alternatives considered**:

- Static server import: rejected because server execution can fail on DOM
  assumptions and increase the route bundle.
- Global script tag: rejected because dependency loading becomes implicit and
  harder to test.
- Separate EPUB reader page outside `app/book/[id]`: rejected because it splits
  the core open/resume/close reading flow.

## Decision: Stream local EPUB bytes through `GET /api/books/[id]/file`

**Rationale**: Raw book files already live under local `books/` storage, and the
PDF reader uses the same route shape. Extending the route to return
`application/epub+zip` for EPUB books keeps file access local, hides filesystem
paths from the browser, and gives `epubjs` a stable source for an ArrayBuffer.

**Alternatives considered**:

- Expose local filesystem paths: rejected because it leaks host details and is
  not portable across browsers.
- Store EPUB bytes in SQLite: rejected because the project stores raw books on
  disk.
- Add an EPUB-only file route: rejected because the existing route can safely
  validate format and content type.

## Decision: Persist EPUB progress as CFI

**Rationale**: Reflowable EPUB text has no stable page numbers. `epubjs`
relocated events expose `location.start.cfi` and percentage, which match the
schema's existing `locator_type = "epub-cfi"` and `cfi` fields. Saving after a
1500 ms debounce avoids excess writes while keeping resume accurate.

**Alternatives considered**:

- Store chapter href only: rejected because it resumes too coarsely for long
  chapters.
- Store generated page index: rejected because it changes with viewport and font
  size.
- Save every relocation immediately: rejected because paginated or scroll-mode
  movement can produce many writes in a short period.

## Decision: Reuse the progress keepalive route for leave-before-debounce

**Rationale**: The PDF reader already needs a keepalive-compatible route because
debounced progress can be lost on navigation away. EPUB should reuse that local
route shape with CFI payloads so the latest known location survives tab hide,
route changes, and unmounts.

**Alternatives considered**:

- Rely only on server actions: rejected because unload/navigation can cancel
  normal requests.
- Remove debounce: rejected because frequent relocated events would write too
  often.
- Store pending progress only in localStorage: rejected because SQLite is the
  source of truth for cross-session resume.

## Decision: Use `epubjs` annotations for CFI highlights

**Rationale**: `rendition.on("selected")` returns a CFI range that can be saved
directly, and `rendition.annotations.add("highlight", cfiRange, ...)` can render
the mark after reload. This avoids viewport-dependent geometry for reflowable
text and preserves stable anchors across font-size and viewport changes.

**Alternatives considered**:

- Store DOM offsets: rejected because iframe content and chapter reloads make
  offsets fragile.
- Store page-relative rectangles: rejected because EPUB pages are generated from
  layout and change with font size.
- Store only selected text: rejected because repeated passages cannot be
  disambiguated.

## Decision: Store EPUB highlights in the existing `highlights` table

**Rationale**: The schema already contains `cfi`, `chapter`, nullable `page`, and
`rects` fields. EPUB rows can set `page = null`, `cfi = cfiRange`, optional
chapter text, and `rects = []`, while PDF rows continue using page and rectangle
data. One table keeps future notes/review joins simple.

**Alternatives considered**:

- Add an `epub_highlights` table: rejected because it duplicates book,
  color, text, and cascade behavior.
- Force PDF and EPUB into one locator shape: rejected because the formats need
  different stable anchors.
- Persist annotations in browser storage only: rejected because highlights must
  be durable and queryable.

## Decision: Build the ToC from `book.navigation.toc`

**Rationale**: EPUB navigation metadata is the semantic chapter structure. A
runtime flattened ToC with at most two visible levels gives the reader direct
chapter jumps without persisting derived data or generating artificial pages.

**Alternatives considered**:

- Generate chapter list from spine only: rejected because it loses human labels
  and nested sections.
- Persist ToC in SQLite: rejected because it can be derived quickly when the
  book loads and is not currently a search artifact.
- Show a modal table of contents: rejected because the reader pattern favors a
  left navigation panel that keeps the book context visible.

## Decision: Apply font size through `rendition.themes.fontSize`

**Rationale**: EPUB font size is a presentation preference, not book data.
Applying 14px, 16px, 18px, or 20px through the rendition theme API lets the
content reflow naturally and keeps the selected size in local browser storage.

**Alternatives considered**:

- Persist font size in SQLite: rejected because it is a device/browser comfort
  preference, not shared book memory.
- Offer arbitrary numeric input: rejected because constrained options simplify
  layout testing and avoid broken text scales.
- CSS outside the iframe only: rejected because EPUB content is rendered inside
  the rendition document.

## Decision: Recover from invalid CFI by displaying the first chapter

**Rationale**: A saved CFI can become stale if a book file is replaced under the
same ID. Catching `rendition.display(savedCfi)` errors and falling back to the
first chapter keeps the reader usable and makes the lost resume point visible to
the user.

**Alternatives considered**:

- Delete progress automatically: rejected because it hides useful diagnostic
  state and may remove recoverable data.
- Block the reader until the user resolves it: rejected because reading should
  continue.
- Retry arbitrary nearby CFIs: rejected because CFI repair is format-specific
  and unreliable without deeper EPUB reconciliation.

## Decision: Treat DRM-protected EPUBs as unsupported

**Rationale**: LCP/DRM support requires external keys, rights management, and
reader flows outside the local MVP. The reader should surface a deterministic
unsupported message when `epubjs` cannot open encrypted content instead of
showing a blank iframe.

**Alternatives considered**:

- Implement LCP support now: rejected as out of scope and not local-first by
  default.
- Attempt best-effort partial rendering: rejected because encrypted resources
  can fail unpredictably.
- Hide the error in console only: rejected because unsupported documents must
  fail visibly and recoverably.
