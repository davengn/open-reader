import { jsonError } from "@/lib/api/responses";
import { getAnnotationExportData, ReaderNoteQueryError } from "@/lib/db/queries/notes";
import { formatMarkdownExport, sanitizeMarkdownFilename } from "@/lib/reader/noteExport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const data = getAnnotationExportData(id);
    const markdown = formatMarkdownExport(data);
    const filename = sanitizeMarkdownFilename(data.book.title);
    return new Response(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof ReaderNoteQueryError) {
      return jsonError(error.message, error.status);
    }

    return jsonError("Export operation failed", 500);
  }
}
