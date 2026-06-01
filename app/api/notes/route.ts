import { jsonError } from "@/lib/api/responses";
import { noteErrorResponse, parseBooleanParam, parseSaveNoteBody } from "@/lib/api/notes";
import { listBookNotes, saveReaderNote } from "@/lib/db/queries/notes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bookId = url.searchParams.get("bookId") ?? "";
  const standalone = parseBooleanParam(url.searchParams.get("standalone"));
  const q = url.searchParams.get("q");

  if (!bookId) {
    return jsonError("Provide bookId", 400);
  }

  try {
    return Response.json({ notes: listBookNotes({ bookId, standalone, q }) });
  } catch (error) {
    return noteErrorResponse(error);
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Expected a JSON body", 400);
  }

  const parsed = parseSaveNoteBody(body);
  if (!parsed.ok) {
    return jsonError(parsed.error, 400);
  }

  try {
    const result = saveReaderNote(parsed.value);
    if (result.deleted) {
      return Response.json({ note: null, deleted: true });
    }

    if (result.detached) {
      return Response.json(
        { note: result.note, deleted: false, detached: true, message: result.message },
        { status: 409 },
      );
    }

    return Response.json({ note: result.note, deleted: false }, { status: 201 });
  } catch (error) {
    return noteErrorResponse(error);
  }
}
