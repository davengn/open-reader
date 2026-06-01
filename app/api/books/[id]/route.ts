import { jsonError, noContent } from "@/lib/api/responses";
import { deleteBookRow, getBookById, updateBookMetadata } from "@/lib/db/queries/books";
import { removeBookFiles } from "@/lib/storage/bookFiles";
import { parseMetadataPatch } from "@/lib/validation/books";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Expected a JSON body", 400);
  }

  const parsed = parseMetadataPatch(body);
  if (!parsed.ok) {
    return jsonError(parsed.error, 400);
  }

  const book = updateBookMetadata(id, parsed.value);
  if (!book) {
    return jsonError("Book not found", 404);
  }

  return Response.json({ book });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = getBookById(id);
  if (!book) {
    return jsonError("Book not found", 404);
  }

  try {
    await removeBookFiles(book);
  } catch {
    return jsonError("File cleanup failed", 500);
  }

  deleteBookRow(id);
  return noContent();
}
