import busboy from "busboy";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { rm } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";
import { createTempUploadPath, sanitizeFilename } from "@/lib/storage/bookFiles";
import type { BookFormat } from "@/lib/types/books";
import { detectBookFormat, MAX_BOOK_BYTES, UNSUPPORTED_FILE_MESSAGE, UPLOAD_LIMIT_MESSAGE } from "@/lib/validation/books";

export class UploadHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export type ParsedBookUpload = {
  tempPath: string;
  originalFilename: string;
  mimeType: string;
  format: BookFormat;
  sizeBytes: number;
  sha256: string;
};

export async function parseBookUpload(request: Request): Promise<ParsedBookUpload> {
  if (!request.body) {
    throw new UploadHttpError(400, "Missing multipart upload body");
  }

  const headers = Object.fromEntries(request.headers);
  const parser = busboy({
    headers,
    limits: {
      files: 1,
      fileSize: MAX_BOOK_BYTES + 1,
    },
  });

  let uploadPromise: Promise<ParsedBookUpload> | null = null;

  parser.on("file", (fieldName, file, info) => {
    if (fieldName !== "file" || uploadPromise) {
      file.resume();
      return;
    }

    uploadPromise = handleFile(file, info);
    uploadPromise.catch(() => undefined);
  });

  await new Promise<void>((resolve, reject) => {
    parser.on("error", reject);
    parser.on("close", resolve);
    Readable.fromWeb(request.body as unknown as NodeReadableStream<Uint8Array>).pipe(parser);
  });

  if (!uploadPromise) {
    throw new UploadHttpError(400, "No book file was provided");
  }

  return uploadPromise;
}

async function handleFile(
  file: NodeJS.ReadableStream & { truncated?: boolean },
  info: { filename: string; mimeType: string },
): Promise<ParsedBookUpload> {
  const originalFilename = sanitizeFilename(info.filename);
  const mimeType = info.mimeType || "application/octet-stream";
  const format = detectBookFormat(originalFilename, mimeType);

  if (!format) {
    await drain(file);
    throw new UploadHttpError(400, UNSUPPORTED_FILE_MESSAGE);
  }

  const tempPath = await createTempUploadPath();
  const hash = createHash("sha256");
  let sizeBytes = 0;
  let hitLimit = false;
  file.on("limit", () => {
    hitLimit = true;
  });

  const meter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      sizeBytes += chunk.length;
      hash.update(chunk);
      callback(null, chunk);
    },
  });

  try {
    await pipeline(file, meter, createWriteStream(tempPath));

    if (hitLimit || file.truncated || sizeBytes > MAX_BOOK_BYTES) {
      throw new UploadHttpError(413, UPLOAD_LIMIT_MESSAGE);
    }

    if (sizeBytes === 0) {
      throw new UploadHttpError(400, "The selected file is empty");
    }

    return {
      tempPath,
      originalFilename,
      mimeType,
      format,
      sizeBytes,
      sha256: hash.digest("hex"),
    };
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    if (error instanceof UploadHttpError) {
      throw error;
    }
    throw new UploadHttpError(500, "Upload failed: disk write error");
  }
}

async function drain(file: NodeJS.ReadableStream) {
  for await (const _chunk of file) {
    // Drain unsupported uploads so Busboy can finish parsing the request.
  }
}
