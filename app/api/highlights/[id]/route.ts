import { jsonError, noContent } from "@/lib/api/responses";
import { deletePageHighlight, ReaderQueryError } from "@/lib/db/queries/reader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const highlightId = Number(id);

  try {
    const deleted = deletePageHighlight(highlightId);
    if (!deleted) {
      return jsonError("Highlight not found", 404);
    }

    return noContent();
  } catch (error) {
    if (error instanceof ReaderQueryError) {
      return jsonError(error.message, error.status);
    }

    return jsonError("Highlight operation failed", 500);
  }
}
