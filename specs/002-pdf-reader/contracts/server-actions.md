# Server Action Contract: PDF Progress

## `updateProgress`

**Location**: `app/book/[id]/actions.ts`

**Purpose**: Persist the current PDF page after a debounced page change and keep
the library card resume summary in sync.

## Signature

```ts
export async function updateProgress(input: {
  bookId: string;
  currentPage: number;
  totalPages: number;
  percentage: number;
}): Promise<{
  ok: true;
  currentPage: number;
  percentage: number;
  updatedAt: number;
}>;
```

## Client Behavior

- `PdfReaderClient` calls this action 1500 ms after the last page change.
- A new page change cancels the previous pending timer.
- Pressing `Enter` in the page input navigates immediately, but persistence
  still uses the same debounce path.
- The action is not called until `totalPages` is known.
- A separate keepalive route mirrors this mutation when the tab is hidden or
  the reader unmounts before the debounce fires.

## Validation

- `bookId` must resolve to an existing book.
- The book must have `format = "pdf"`.
- `currentPage` must be an integer clamped to `[1, totalPages]`.
- `totalPages` must be a positive integer.
- `percentage` must be finite, rounded to one decimal, and clamped to `[0, 100]`.

## Persistence

- Upsert `reading_progress` by `book_id`.
- Set `locator_type = "pdf-page"`.
- Set `page = currentPage`.
- Set `percent = percentage`.
- Set `updated_at = Date.now()`.
- Mirror `books.reading_percent = percentage`, `books.last_read_at = updatedAt`,
  and `books.updated_at = updatedAt`.
- If `books.total_pages` is missing or smaller than the loaded `totalPages`,
  update it to `totalPages`.

## Errors

- Missing book: throw a typed not-found error for the caller to ignore after
  navigation away.
- Non-PDF book: throw a typed validation error and do not mutate progress.
- Database failure: throw and let the client keep the current page locally.

The UI must not block page navigation on action failure. A later successful page
change can overwrite stale progress.
