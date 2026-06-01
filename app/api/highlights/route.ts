import { jsonError } from "@/lib/api/responses";
import { createPageHighlight, listPageHighlights, ReaderQueryError } from "@/lib/db/queries/reader";
import type { HighlightColor } from "@/lib/types/reader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bookId = url.searchParams.get("bookId") ?? "";
  const page = Number(url.searchParams.get("page"));

  if (!bookId || !Number.isInteger(page) || page < 1) {
    return jsonError("Provide bookId and a positive page", 400);
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
  if (
    typeof record.bookId !== "string" ||
    typeof record.page !== "number" ||
    typeof record.text !== "string" ||
    typeof record.color !== "string"
  ) {
    return jsonError("Highlight payload is invalid", 400);
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
