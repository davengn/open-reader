import { jsonError } from "@/lib/api/responses";
import {
  createPageHighlight,
  listPageHighlights,
  createEpubHighlight,
  listEpubHighlights,
  ReaderQueryError,
} from "@/lib/db/queries/reader";
import type { HighlightColor } from "@/lib/types/reader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bookId = url.searchParams.get("bookId") ?? "";
  const format = url.searchParams.get("format") ?? "";

  if (!bookId) {
    return jsonError("Provide bookId", 400);
  }

  if (format === "epub") {
    try {
      return Response.json({ highlights: listEpubHighlights(bookId) });
    } catch (error) {
      return readerErrorResponse(error);
    }
  }

  const page = Number(url.searchParams.get("page"));
  if (!Number.isInteger(page) || page < 1) {
    return jsonError("Provide a positive page", 400);
  }

  try {
    return Response.json({ highlights: listPageHighlights(bookId, page) });
  } catch (error) {
    return readerErrorResponse(error);
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Expected a JSON body", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError("Expected a highlight object", 400);
  }

  const record = body as Record<string, unknown>;
  if (typeof record.bookId !== "string" || typeof record.text !== "string" || typeof record.color !== "string") {
    return jsonError("Highlight payload is invalid", 400);
  }

  // Check if this is an EPUB highlight payload (contains cfi)
  if (record.cfi !== undefined && record.cfi !== null) {
    if (typeof record.cfi !== "string") {
      return jsonError("CFI must be a string", 400);
    }

    try {
      const highlight = createEpubHighlight({
        bookId: record.bookId,
        cfi: record.cfi,
        text: record.text,
        color: record.color as HighlightColor,
        chapter: record.chapter ? String(record.chapter) : undefined,
      });
      return Response.json({ highlight }, { status: 201 });
    } catch (error) {
      return readerErrorResponse(error);
    }
  }

  // PDF highlight logic
  if (typeof record.page !== "number") {
    return jsonError("PDF highlight requires a page number", 400);
  }

  try {
    const highlight = createPageHighlight({
      bookId: record.bookId,
      page: record.page,
      text: record.text,
      color: record.color as HighlightColor,
      rects: record.rects,
    });
    return Response.json({ highlight }, { status: 201 });
  } catch (error) {
    return readerErrorResponse(error);
  }
}

function readerErrorResponse(error: unknown) {
  if (error instanceof ReaderQueryError) {
    return jsonError(error.message, error.status);
  }

  return jsonError("Highlight operation failed", 500);
}
