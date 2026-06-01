import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resetDbConnectionForTests } from "@/lib/db";

import { randomUUID } from "node:crypto";
import { createBook, markBookReady } from "@/lib/db/queries/books";
import { relativeBookFilePath, sha256Buffer, writeBufferToStorage } from "@/lib/storage/bookFiles";

let currentRoot: string | null = null;

export async function createTestEnv() {
  await cleanupTestEnv();
  currentRoot = await mkdtemp(path.join(os.tmpdir(), "open-reader-"));
  process.env.OPEN_READER_DB_PATH = path.join(currentRoot, "reader.db");
  process.env.OPEN_READER_BOOK_ROOT = path.join(currentRoot, "books");
  resetDbConnectionForTests();
  return {
    root: currentRoot,
    dbPath: process.env.OPEN_READER_DB_PATH,
    bookRoot: process.env.OPEN_READER_BOOK_ROOT,
  };
}

export async function cleanupTestEnv() {
  resetDbConnectionForTests();
  const root = currentRoot;
  currentRoot = null;
  delete process.env.OPEN_READER_DB_PATH;
  delete process.env.OPEN_READER_BOOK_ROOT;

  if (root) {
    await rm(root, { recursive: true, force: true });
  }
}

export async function createReadyBook(format: "pdf" | "epub") {
  const id = randomUUID();
  const buffer = Buffer.from(format === "pdf" ? "%PDF-1.4\ntext" : "epub");
  const filePath = relativeBookFilePath(id, format);
  await writeBufferToStorage(filePath, buffer);

  createBook({
    id,
    title: "Reader Fixture",
    author: "Open Reader",
    format,
    filePath,
    fileSizeBytes: buffer.length,
    sha256: sha256Buffer(buffer),
  });
  markBookReady(id, { title: "Reader Fixture", author: "Open Reader", totalPages: 2, chunks: [] });

  return { id, buffer };
}

