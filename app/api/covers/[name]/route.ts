import { readFile } from "node:fs/promises";
import path from "node:path";
import { jsonError } from "@/lib/api/responses";
import { resolveStoragePath } from "@/lib/storage/bookFiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const safeName = path.basename(decodeURIComponent(name));

  try {
    const file = await readFile(resolveStoragePath(`books/covers/${safeName}`));
    const extension = path.extname(safeName).toLowerCase();
    return new Response(file, {
      headers: {
        "Content-Type": MIME_TYPES[extension] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return jsonError("Cover not found", 404);
  }
}
