import { jsonError } from "@/lib/api/responses";
import { ReaderNoteQueryError } from "@/lib/db/queries/notes";

export function noteErrorResponse(error: unknown) {
  if (error instanceof ReaderNoteQueryError) {
    return jsonError(error.message, error.status);
  }

  return jsonError("Note operation failed", 500);
}

export function parseSaveNoteBody(body: unknown):
  | {
      ok: true;
      value: {
        bookId: string;
        noteId?: number | null;
        highlightId?: number | null;
        content: string;
        page?: number | null;
        cfi?: string | null;
      };
    }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Expected a note object" };
  }

  const record = body as Record<string, unknown>;
  if (typeof record.bookId !== "string" || typeof record.content !== "string") {
    return { ok: false, error: "Note payload is invalid" };
  }

  return {
    ok: true,
    value: {
      bookId: record.bookId,
      noteId: parseOptionalNumber(record.noteId),
      highlightId: parseOptionalNumber(record.highlightId),
      content: record.content,
      page: parseOptionalNumber(record.page),
      cfi: typeof record.cfi === "string" ? record.cfi : record.cfi == null ? null : String(record.cfi),
    },
  };
}

export function parseBooleanParam(value: string | null) {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}

function parseOptionalNumber(value: unknown) {
  if (value == null || value === "") {
    return null;
  }

  return typeof value === "number" ? value : Number(value);
}
