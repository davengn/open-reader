import { randomUUID } from "node:crypto";
import { acceptedJson, jsonError } from "@/lib/api/responses";
import { createBook, findBookBySha256, listBooks } from "@/lib/db/queries/books";
import { enqueueBookProcessing } from "@/lib/ingestion/enqueueBookProcessing";
import { moveTempFileToBook, removeStorageFile } from "@/lib/storage/bookFiles";
import { parseBookUpload, UploadHttpError } from "@/lib/storage/upload";
import { filenameToTitle } from "@/lib/validation/books";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ books: listBooks() });
}

export async function POST(request: Request) {
  let upload;

  try {
    upload = await parseBookUpload(request);
  } catch (error) {
    if (error instanceof UploadHttpError) {
      return jsonError(error.message, error.status);
    }
    return jsonError("Upload failed: disk write error", 500);
  }

  const duplicate = findBookBySha256(upload.sha256);
  if (duplicate) {
    await removeStorageFile(`books/tmp/${upload.tempPath.split(/[\\/]/).pop()}`).catch(() => undefined);
    return Response.json(
      {
        error: `This file is already in your library as ${duplicate.title}.`,
        existingBook: duplicate,
      },
      { status: 409 },
    );
  }

  const id = randomUUID();
  let filePath: string;

  try {
    filePath = await moveTempFileToBook(upload.tempPath, id, upload.format);
  } catch {
    return jsonError("Upload failed: disk write error", 500);
  }

  try {
    const book = createBook({
      id,
      title: filenameToTitle(upload.originalFilename),
      author: "Unknown",
      format: upload.format,
      filePath,
      fileSizeBytes: upload.sizeBytes,
      sha256: upload.sha256,
    });

    enqueueBookProcessing(id);
    return acceptedJson({ book });
  } catch (error) {
    await removeStorageFile(filePath).catch(() => undefined);
    if (error instanceof Error && /UNIQUE|constraint/i.test(error.message)) {
      const existing = findBookBySha256(upload.sha256);
      return Response.json(
        {
          error: `This file is already in your library as ${existing?.title ?? "another book"}.`,
          existingBook: existing,
        },
        { status: 409 },
      );
    }
    return jsonError("Upload failed: disk write error", 500);
  }
}
