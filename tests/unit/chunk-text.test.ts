import { describe, expect, it } from "vitest";
import { chunkText } from "@/lib/ingestion/chunkText";

describe("chunkText", () => {
  it("creates overlapping chunks suitable for FTS indexing", () => {
    const content = Array.from({ length: 950 }, (_, index) => `word${index}`).join(" ");
    const chunks = chunkText(content, "Chapter 1");

    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks[0].chapter).toBe("Chapter 1");
    expect(chunks[0].tokenStart).toBe(0);
    expect(chunks[1].tokenStart).toBeLessThan(chunks[0].tokenEnd ?? 0);
  });

  it("returns no chunks for empty content", () => {
    expect(chunkText(" \n ")).toEqual([]);
  });
});
