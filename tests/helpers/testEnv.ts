import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resetDbConnectionForTests } from "@/lib/db";

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
