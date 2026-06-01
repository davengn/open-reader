import type { ChunkInput } from "@/lib/db/queries/books";

const APPROX_CHUNK_WORDS = 450;
const OVERLAP_WORDS = 40;

export function chunkText(content: string, chapter?: string | null): ChunkInput[] {
  const words = content.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const chunks: ChunkInput[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(words.length, start + APPROX_CHUNK_WORDS);
    chunks.push({
      content: words.slice(start, end).join(" "),
      chapter,
      tokenStart: start,
      tokenEnd: end,
    });

    if (end === words.length) {
      break;
    }
    start = Math.max(end - OVERLAP_WORDS, start + 1);
  }

  return chunks;
}
