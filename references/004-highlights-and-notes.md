# Spec 004 — Highlights and notes

## Summary

The highlights and notes panel surfaces all highlights and attached notes for the current book in a collapsible side panel. The user can write free-form Markdown notes that attach to a highlight or stand alone on a page. Notes are searchable and exportable to Markdown.

## User stories

As a reader, I want to open a side panel listing all my highlights for the current book so that I can review what I found important.

As a reader, I want to write a Markdown note attached to a highlight so that I can explain why I found it important.

As a reader, I want to write a standalone page note (not tied to a highlight) so that I can capture thoughts at any point while reading.

As a reader, I want to see the chapter and page number next to each highlight so that I can navigate back to the source.

As a reader, I want to export all highlights and notes for a book as a Markdown file so that I can paste them into Obsidian or Notion.

## Acceptance criteria

- A panel toggle button (bookmark icon) in the reader header opens/closes the notes panel
- The panel slides in from the right at 320 px wide and does not overlap the reading area (the reader canvas shrinks to accommodate)
- The panel shows a list of all highlights for the current book, grouped by chapter
- Each highlight item shows: colored bar, excerpt (max 120 characters, truncated with ellipsis), chapter name, page / CFI reference, and a note indicator if a note exists
- Clicking a highlight item scrolls the reader to that location
- Each highlight item has an "Add note" / "Edit note" button that opens an inline Markdown editor below the item
- The Markdown editor uses a plain `<textarea>` with monospace font; no WYSIWYG toolbar
- Notes auto-save 800 ms after the last keystroke via a debounced server action; a "Saved" indicator fades in and out
- A standalone note can be created via an "Add page note" button that appears at the top of the panel; it saves `highlightId = null` and `page = currentPage` / `cfi = currentCfi`
- The export button (bottom of panel) triggers a `GET /api/books/[id]/export` download of a `.md` file
- Deleting a note clears the textarea and calls `DELETE /api/notes/[id]`

## Functional requirements

### Panel layout

- The panel is a `<aside>` rendered inside the reader page layout with `position: sticky; top: 0; height: 100vh; overflow-y: auto`
- Panel state (open / closed) is stored in `localStorage` under `reader.notesPanel`
- When the panel opens, the reader's main content area receives `padding-right: 320px` (or reduces its flex width)

### Highlight list

- Highlights are fetched on panel open via `GET /api/highlights?bookId=[id]` (returns all highlights for the book)
- Highlights are sorted by page ascending, then by their position on the page
- Chapter groupings use the `chapter` field stored on the highlight row; highlights with no chapter are grouped under "Uncategorized"
- Each highlight shows its color as a 4 px left border on the item card

### Note editor

- The `<textarea>` auto-expands vertically to fit its content (no fixed height, `overflow: hidden`, `resize: none`)
- The textarea renders below the highlight card with a smooth CSS transition
- Saving calls `POST /api/notes` (creates) or `PATCH /api/notes/[id]` (updates) with `{ bookId, highlightId, content, page, cfi }`
- An empty save (content is only whitespace) is treated as a delete

### Export format

`GET /api/books/[id]/export` returns a `Content-Disposition: attachment; filename="[title]-notes.md"` response with the following structure:

```
# [Book title]
Author: [Author]
Exported: [ISO date]

---

## [Chapter name]

> [Highlight text]
*Page [n] · [color]*

[Note content, if any]

---
```

Each highlight is a blockquote; its note (if any) follows. Chapters are level-2 headings. Highlights within a chapter are separated by `---`.

### Standalone page notes

- Standalone notes (no `highlightId`) appear in the panel sorted by page, interleaved with highlight items
- They display with a "📄 Page [n]" label instead of a colored highlight bar

## Non-functional requirements

### Performance

- Panel open renders all highlight items within 300 ms for up to 500 highlights
- Auto-save debounce is 800 ms; the server action completes within 200 ms (local SQLite write)

### Offline behavior

- If a save server action fails (network error in a remote hosting scenario), the textarea border turns red and a message shows: "Save failed. Your changes are not saved."
- The user can retry by making any keystroke

## Edge cases

### Note exceeds 50 000 characters

- The textarea enforces `maxLength={50000}` client-side
- If the API receives content longer than 50 000 characters, it returns 400 with: "Note content exceeds the maximum length of 50 000 characters."

### Highlight deleted while note is open

- If the highlight is deleted (from the reader view) while its note editor is open in the panel, the next auto-save attempt receives a 404 from the API
- The note editor shows: "The highlight this note was attached to has been deleted. The note has been saved as a standalone page note." and updates `highlightId = null`

### Export for book with no highlights

- `GET /api/books/[id]/export` returns a valid Markdown file with only the header section and the message: "No highlights or notes yet."

### Very long highlight text (500+ words)

- The panel truncates the excerpt to 120 characters with an ellipsis
- The full text is always stored; hovering the excerpt shows the full text in a native `title` tooltip

### Concurrent edits from two browser tabs

- Last-write-wins; the auto-save debounce means both tabs save within ~1 second of each other
- No conflict UI is provided in the MVP
