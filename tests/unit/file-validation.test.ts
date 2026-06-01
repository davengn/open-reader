import { describe, expect, it } from "vitest";
import { detectBookFormat, filenameToTitle, validateBookFile } from "@/lib/validation/books";
import { sha256Buffer } from "@/lib/storage/bookFiles";

describe("book file validation", () => {
  it("detects supported formats from extensions and mime types", () => {
    expect(detectBookFormat("Building Microservices.pdf", "application/octet-stream")).toBe("pdf");
    expect(detectBookFormat("bdia.epub", "application/epub+zip")).toBe("epub");
    expect(detectBookFormat("notes.txt", "text/plain")).toBeNull();
  });

  it("rejects empty, oversized, and unsupported files with user-safe messages", () => {
    expect(validateBookFile("notes.txt", 100, "text/plain")).toMatchObject({ ok: false, status: 400 });
    expect(validateBookFile("book.pdf", 0, "application/pdf")).toMatchObject({ ok: false, status: 400 });
    expect(validateBookFile("book.pdf", 200 * 1024 * 1024 + 1, "application/pdf")).toMatchObject({
      ok: false,
      status: 413,
    });
  });

  it("normalizes fallback titles and computes deterministic hashes", () => {
    expect(filenameToTitle("java-concurrency_in-practice.pdf")).toBe("java concurrency in practice");
    expect(sha256Buffer(Buffer.from("reader"))).toBe(
      "3d0941964aa3ebdcb00ccef58b1bb399f9f898465e9886d5aec7f31090a0fb30",
    );
  });
});
