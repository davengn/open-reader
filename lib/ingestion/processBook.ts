import { markBookError, markBookReady, getBookById } from "@/lib/db/queries/books";
import { chunkText } from "@/lib/ingestion/chunkText";
import { parseEpubBook } from "@/lib/parsers/epub";
import { parsePdfBook } from "@/lib/parsers/pdf";
import { resolveStoragePath } from "@/lib/storage/bookFiles";
import { saveCoverBuffer, savePlaceholderCover } from "@/lib/storage/covers";
import type { BookRecord } from "@/lib/types/books";

export async function processBook(bookId: string) {
  const book = getBookById(bookId);
  if (!book) {
    return null;
  }

  try {
    const processed = book.format === "pdf" ? await processPdf(book) : await processEpub(book);
    return markBookReady(book.id, processed);
  } catch (error) {
    const message = toUserSafeProcessingError(error);
    return markBookError(book.id, message);
  }
}

async function processPdf(book: BookRecord) {
  const parsed = await parsePdfBook(resolveStoragePath(book.filePath), `${book.title}.${book.format}`);
  const title = parsed.title?.trim() || book.title;
  const author = parsed.author?.trim() || book.author || "Unknown";
  const cover = await savePlaceholderCover(book.id, title, author, "pdf");
  const chunks = chunkText(parsed.text || `${title}\n${author}`, title);

  return {
    title,
    author,
    coverPath: cover.coverPath,
    coverHash: cover.coverHash,
    totalPages: parsed.totalPages ?? null,
    totalLocations: null,
    chunks: chunks.length > 0 ? chunks : chunkText(`${title}\n${author}`, title),
  };
}

async function processEpub(book: BookRecord) {
  const parsed = await parseEpubBook(resolveStoragePath(book.filePath), `${book.title}.${book.format}`);
  const title = parsed.title?.trim() || book.title;
  const author = parsed.author?.trim() || book.author || "Unknown";
  const cover = parsed.cover
    ? await saveCoverBuffer(book.id, parsed.cover.bytes, parsed.cover.extension)
    : await savePlaceholderCover(book.id, title, author, "epub");
  const chunks = chunkText(parsed.text || `${title}\n${author}`, title);

  return {
    title,
    author,
    coverPath: cover.coverPath,
    coverHash: cover.coverHash,
    totalPages: null,
    totalLocations: parsed.totalLocations,
    chunks: chunks.length > 0 ? chunks : chunkText(`${title}\n${author}`, title),
  };
}

function toUserSafeProcessingError(error: unknown) {
  const raw = error instanceof Error ? error.message : "Processing failed";
  if (/password|encrypted/i.test(raw)) {
    return "This book appears to be encrypted or password protected";
  }
  if (/EPUB|package|zip/i.test(raw)) {
    return "This EPUB could not be processed";
  }
  if (/PDF|Invalid|document/i.test(raw)) {
    return "This PDF could not be processed";
  }
  return "This book could not be processed";
}
