# Server Action Contract: EPUB Progress

## `updateEpubProgress`

**Location**: `app/book/[id]/actions.ts`

**Purpose**: Persist the current EPUB CFI after a debounced relocation and keep
the library card resume summary in sync.

## Signature

```ts
export async function updateEpubProgress(input: {
  bookId: string;
  currentCfi: string;
  percentage: number;
  chapter?: string | null;
}): Promise<{
  ok: true;
  currentCfi: string;
  percentage: number;
  chapter: string | null;
  updatedAt: number;
}>;
```

## Client Behavior

- `EpubReaderClient` calls this action 1500 ms after the latest `relocated`
  event from `epubjs`.
- A new relocation cancels the previous pending timer.
- The action is not called until the rendition has produced a non-empty CFI.
- The current chapter title, when known, is included for later display/search
  context.
- A separate keepalive route mirrors this mutation when the tab is hidden or
  the reader unmounts before the debounce fires.

## Validation

- `bookId` must resolve to an existing book.
- The book must have `format = "epub"`.
- `currentCfi` must be a non-empty string and is treated as an opaque EPUB CFI.
- `percentage` must be finite, rounded to one decimal, and clamped to `[0, 100]`.
- `chapter`, when present, is trimmed and stored as `null` if empty.

## Persistence

- Upsert `reading_progress` by `book_id`.
- Set `locator_type = "epub-cfi"`.
- Set `cfi = currentCfi`.
- Set `chapter = chapter ?? null`.
- Set `page = null`.
- Set `percent = percentage`.
- Set `updated_at = Date.now()`.
- Mirror `books.reading_percent = percentage`, `books.last_read_at = updatedAt`,
  and `books.updated_at = updatedAt`.

## Errors

- Missing book: throw a typed not-found error for the caller to ignore after
  navigation away.
- Non-EPUB book: throw a typed validation error and do not mutate progress.
- Empty CFI: throw a typed validation error and do not mutate progress.
- Database failure: throw and let the client keep the current CFI locally.

The UI must not block chapter navigation on action failure. A later successful
relocation can overwrite stale progress.

## Shared Highlight API Expectations

EPUB highlight creation uses route handlers rather than a server action:

```ts
type CreateEpubHighlightInput = {
  bookId: string;
  cfi: string;
  text: string;
  color: "yellow" | "green" | "blue" | "pink";
  chapter?: string | null;
};
```

- The client may optimistically add the `epubjs` annotation before the POST
  resolves.
- If the POST fails, the client removes the optimistic annotation and shows a
  non-blocking error state.
- Delete removes the `epubjs` annotation first and then calls
  `DELETE /api/highlights/[id]`; if the delete request fails, the client
  re-fetches highlights on focus or reload.
