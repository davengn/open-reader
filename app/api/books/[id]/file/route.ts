import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { jsonError } from "@/lib/api/responses";
import { getBookById } from "@/lib/db/queries/books";
import { resolveStoragePath } from "@/lib/storage/bookFiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = getBookById(id);

  if (!book) {
    return jsonError("Book not found", 404);
  }

  if (book.format !== "pdf") {
    return jsonError("Only PDF books can be opened in this reader", 409);
  }

  if (book.status !== "ready") {
    return jsonError("Book is not ready to read yet", 409);
  }

  try {
    const filePath = resolveStoragePath(book.filePath);
    const info = await stat(filePath);
    const filename = `${safeFilename(book.title)}.pdf`;
    const stream = Readable.toWeb(createReadStream(filePath));

    return new Response(stream as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(info.size),
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return jsonError("PDF file could not be opened", 500);
  }
}

function safeFilename(title: string) {
  return path.basename(title).replace(/[^\w.\-()[\] ]+/g, " ").replace(/\s+/g, " ").trim() || "book";
}
