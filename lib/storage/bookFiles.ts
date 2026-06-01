import { createHash, randomUUID } from "node:crypto";
import { mkdir, rm, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BookFormat, BookRecord } from "@/lib/types/books";

export function getBookRoot() {
  return process.env.OPEN_READER_BOOK_ROOT || path.join(process.cwd(), "books");
}

export function toStorageRelativePath(filename: string) {
  return `books/${filename.replace(/\\/g, "/").replace(/^\/+/, "")}`;
}

export function relativeBookFilePath(id: string, format: BookFormat) {
  return toStorageRelativePath(`${id}.${format}`);
}

export function relativeCoverPath(filename: string) {
  return toStorageRelativePath(`covers/${filename}`);
}

export function resolveStoragePath(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/");
  if (!normalized.startsWith("books/")) {
    throw new Error(`Storage path must be relative to books/: ${relativePath}`);
  }
  const root = path.resolve(getBookRoot());
  const target = path.resolve(root, normalized.slice("books/".length));
  const rootWithSeparator = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (target !== root && !target.startsWith(rootWithSeparator)) {
    throw new Error(`Storage path escapes books root: ${relativePath}`);
  }
  return target;
}

export async function ensureBookStorage() {
  await mkdir(getBookRoot(), { recursive: true });
  await mkdir(path.join(getBookRoot(), "covers"), { recursive: true });
  await mkdir(path.join(getBookRoot(), "tmp"), { recursive: true });
}

export function sanitizeFilename(filename: string) {
  const base = path.basename(filename).replace(/[^\w.\-()[\] ]+/g, " ").replace(/\s+/g, " ").trim();
  return base || "book";
}

export async function removeStorageFile(relativePath?: string | null) {
  if (!relativePath) {
    return;
  }

  try {
    await rm(resolveStoragePath(relativePath), { force: false });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

export async function removeBookFiles(book: BookRecord) {
  await removeStorageFile(book.filePath);
  await removeStorageFile(book.coverPath);
}

export async function writeBufferToStorage(relativePath: string, buffer: Buffer) {
  const target = resolveStoragePath(relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
}

export async function moveTempFileToBook(tempPath: string, id: string, format: BookFormat) {
  const relativePath = relativeBookFilePath(id, format);
  const targetPath = resolveStoragePath(relativePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await rename(tempPath, targetPath);
  return relativePath;
}

export async function createTempUploadPath() {
  await ensureBookStorage();
  return path.join(getBookRoot(), "tmp", `${randomUUID()}.upload`);
}

export function sha256Buffer(buffer: Buffer | Uint8Array) {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function getStoredFileSize(relativePath: string) {
  const info = await stat(resolveStoragePath(relativePath));
  return info.size;
}
