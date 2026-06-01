import { jsonError } from "@/lib/api/responses";
import { getBookStatus } from "@/lib/db/queries/books";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const status = getBookStatus(id);

  if (!status) {
    return jsonError("Book not found", 404);
  }

  return Response.json(status);
}
