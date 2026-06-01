import { readFile } from "node:fs/promises";
import path from "node:path";
import { filenameToTitle } from "@/lib/validation/books";

export type ParsedPdf = {
  title?: string;
  author?: string;
  totalPages?: number | null;
  text: string;
};

export async function parsePdfBook(filePath: string, originalFilename: string): Promise<ParsedPdf> {
  const buffer = await readFile(filePath);
  if (!buffer.subarray(0, 8).toString("latin1").includes("%PDF")) {
    throw new Error("Invalid PDF document");
  }
  const fallback = parsePdfTextFallback(buffer, originalFilename);

  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const document = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      disableFontFace: true,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;

    const metadata = await document.getMetadata().catch(() => null);
    const info = (metadata?.info ?? {}) as Record<string, unknown>;
    const title = asCleanString(info.Title) ?? fallback.title;
    const author = asCleanString(info.Author) ?? fallback.author;
    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      pageTexts.push(
        textContent.items
          .map((item) => ("str" in item ? item.str : ""))
          .filter(Boolean)
          .join(" "),
      );
      page.cleanup();
    }

    await document.destroy();

    return {
      title,
      author,
      totalPages: document.numPages,
      text: pageTexts.join("\n\n") || fallback.text,
    };
  } catch {
    return fallback;
  }
}

function parsePdfTextFallback(buffer: Buffer, originalFilename: string): ParsedPdf {
  const text = buffer.subarray(0, Math.min(buffer.length, 1024 * 1024)).toString("latin1");
  const title = extractPdfInfo(text, "Title") ?? filenameToTitle(path.basename(originalFilename));
  const author = extractPdfInfo(text, "Author") ?? "Unknown";
  const totalPages = Math.max(1, (text.match(/\/Type\s*\/Page\b/g) ?? []).length) || null;

  return {
    title,
    author,
    totalPages,
    text: text.replace(/[^\x20-\x7E\r\n\t]+/g, " ").slice(0, 200000),
  };
}

function extractPdfInfo(text: string, key: string) {
  const match = text.match(new RegExp(`/${key}\\s*\\(([^)]{1,300})\\)`));
  return match ? cleanPdfString(match[1]) : null;
}

function cleanPdfString(value: string) {
  const cleaned = value.replace(/\\([()\\])/g, "$1").replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function asCleanString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned || null;
}
