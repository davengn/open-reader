# Server Action Contract: Reader Notes

## `saveReaderNote`

**Location**: `app/book/[id]/actions.ts`

**Purpose**: Persist an attached highlight note or standalone page/CFI note
after the client-side 800 ms debounce.

## Signature

```ts
export async function saveReaderNote(input: {
  bookId: string;
  noteId?: number | null;
  highlightId?: number | null;
  content: string;
  page?: number | null;
  cfi?: string | null;
}): Promise<
  | {
      ok: true;
      deleted: false;
      detached?: false;
      note: {
        id: number;
        bookId: string;
        highlightId: number | null;
        content: string;
        page: number | null;
        cfi: string | null;
        createdAt: number | null;
        updatedAt: number;
      };
    }
  | {
      ok: true;
      deleted: true;
      note: null;
    }
  | {
      ok: true;
      deleted: false;
      detached: true;
      message: string;
      note: {
        id: number;
        bookId: string;
        highlightId: null;
        content: string;
        page: number | null;
        cfi: string | null;
        createdAt: number | null;
        updatedAt: number;
      };
    }
>;
```

## Client Behavior

- `NotesPanel` calls this action 800 ms after the latest textarea change.
- A new keystroke cancels the previous pending save.
- The action is not called for a new blank standalone editor until content is
  non-empty.
- The client displays `saving` while the action is pending, then a short-lived
  `Saved` state.
- If the action throws, the editor keeps the unsaved text and shows
  `Save failed. Your changes are not saved.`
- If `detached: true`, the editor remains open and shows
  `The highlight this note was attached to has been deleted. The note has been saved as a standalone page note.`

## Validation

- `bookId` must resolve to an existing book.
- `content.length <= 50000`.
- Existing `noteId`, when present, must resolve to a note in the same book.
- `highlightId`, when present, must resolve to a highlight in the same book.
- Attached notes inherit location from the highlight when page or CFI is not
  supplied.
- Standalone PDF notes require `page >= 1`.
- Standalone EPUB notes require a non-empty valid-looking CFI.
- Whitespace-only content deletes the existing note and returns
  `{ ok: true, deleted: true, note: null }`.

## Persistence

- Insert or update `notes` with `book_id`, `highlight_id`, `content`, `page`,
  `cfi`, `created_at`, and `updated_at`.
- Use a partial unique index so one highlight has at most one attached note.
- Let SQLite triggers keep `notes_fts` synchronized.
- If the highlight no longer exists and `page` or `cfi` is available, save the
  note as standalone with `highlight_id = NULL`.

## Errors

- Missing book or note: throw a typed not-found error.
- Content over 50,000 characters: throw a typed validation error with
  `Note content exceeds the maximum length of 50 000 characters.`
- Missing standalone locator: throw a typed validation error.
- Database failure: throw and let the client keep the unsaved textarea value.

## `deleteReaderNote`

**Location**: `app/book/[id]/actions.ts`

**Purpose**: Delete a note from the inline editor without navigating away from
the reader.

## Signature

```ts
export async function deleteReaderNote(input: {
  bookId: string;
  noteId: number;
}): Promise<{ ok: true }>;
```

## Client Behavior

- The client clears the textarea optimistically.
- If deletion fails, the client refetches the panel data and shows the save
  failure message.

## Validation

- `bookId` must resolve to an existing book.
- `noteId` must resolve to a note in the same book.

## Route Handler Parity

The following routes call the same query functions and must match server-action
behavior:

- `POST /api/notes`
- `PATCH /api/notes/[id]`
- `DELETE /api/notes/[id]`
- `GET /api/notes?bookId=[id]&q=[query]`
- `GET /api/books/[id]/export`
