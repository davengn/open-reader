import { noContent } from "@/lib/api/responses";
import { deleteReaderNoteById, saveReaderNote } from "@/lib/db/queries/notes";
import { noteErrorResponse, parseSaveNoteBody } from "@/lib/api/notes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const parsed = parseSaveNoteBody(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = saveReaderNote({
      ...parsed.value,
      noteId: Number(id),
    });
    if (result.deleted) {
      return Response.json({ note: null, deleted: true });
    }

    if (result.detached) {
      return Response.json(
        { note: result.note, deleted: false, detached: true, message: result.message },
        { status: 409 },
      );
    }

    return Response.json({ note: result.note, deleted: false });
  } catch (error) {
    return noteErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    deleteReaderNoteById(Number(id));
    return noContent();
  } catch (error) {
    return noteErrorResponse(error);
  }
}
