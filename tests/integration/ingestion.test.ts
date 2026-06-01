import { randomUUID } from "node:crypto";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { getRawDb } from "@/lib/db";
import { createBook, getBookById } from "@/lib/db/queries/books";
import { processBook } from "@/lib/ingestion/processBook";
import { ensureBookStorage, relativeBookFilePath, sha256Buffer, writeBufferToStorage } from "@/lib/storage/bookFiles";
import { createTestEnv } from "../helpers/testEnv";

describe("book ingestion", () => {
  it("processes a PDF into a ready book with chunks and a cover", async () => {
    await createTestEnv();
    await ensureBookStorage();
    const id = randomUUID();
    const buffer = Buffer.from("%PDF-1.4\n1 0 obj << /Title (Test PDF) /Author (Reader) /Type /Page >> endobj");
    const filePath = relativeBookFilePath(id, "pdf");
    await writeBufferToStorage(filePath, buffer);

    createBook({
      id,
      title: "test pdf",
      author: "Unknown",
      format: "pdf",
      filePath,
      fileSizeBytes: buffer.length,
      sha256: sha256Buffer(buffer),
    });

    await processBook(id);
    const book = getBookById(id);

    expect(book?.status).toBe("ready");
    expect(book?.title).toBe("Test PDF");
    expect(book?.author).toBe("Reader");
    expect(book?.coverPath).toContain("books/covers/");
    expect(countBookChunks(id)).toBeGreaterThan(0);
  });

  it("processes an EPUB package into a ready book", async () => {
    await createTestEnv();
    await ensureBookStorage();
    const id = randomUUID();
    const buffer = await createEpubFixture();
    const filePath = relativeBookFilePath(id, "epub");
    await writeBufferToStorage(filePath, buffer);

    createBook({
      id,
      title: "fixture",
      author: "Unknown",
      format: "epub",
      filePath,
      fileSizeBytes: buffer.length,
      sha256: sha256Buffer(buffer),
    });

    await processBook(id);
    const book = getBookById(id);

    expect(book?.status).toBe("ready");
    expect(book?.title).toBe("EPUB Fixture");
    expect(book?.author).toBe("Open Reader");
    expect(countBookChunks(id)).toBeGreaterThan(0);
  });
});

function countBookChunks(bookId: string) {
  return getRawDb().prepare("SELECT COUNT(*) FROM book_chunks WHERE book_id = ?").pluck().get(bookId) as number;
}

async function createEpubFixture() {
  const zip = new JSZip();
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0"?>
    <container version="1.0">
      <rootfiles>
        <rootfile full-path="OPS/package.opf" media-type="application/oebps-package+xml"/>
      </rootfiles>
    </container>`,
  );
  zip.file(
    "OPS/package.opf",
    `<package xmlns:dc="http://purl.org/dc/elements/1.1/">
      <metadata>
        <dc:title>EPUB Fixture</dc:title>
        <dc:creator>Open Reader</dc:creator>
      </metadata>
      <manifest>
        <item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/>
      </manifest>
      <spine><itemref idref="chapter"/></spine>
    </package>`,
  );
  zip.file("OPS/chapter.xhtml", "<html><body><h1>Chapter</h1><p>Durable notes need local text chunks.</p></body></html>");
  return Buffer.from(await zip.generateAsync({ type: "uint8array", mimeType: "application/epub+zip" }));
}
