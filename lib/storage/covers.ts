import { sha256Buffer, relativeCoverPath, writeBufferToStorage } from "@/lib/storage/bookFiles";
import { getBookInitials } from "@/lib/library/covers";
import type { BookFormat } from "@/lib/types/books";

const COVER_COLORS = [
  ["#3b332d", "#8c6957"],
  ["#2d3937", "#6d8a80"],
  ["#352d3b", "#8a6d89"],
  ["#3b382d", "#978a63"],
  ["#2d303b", "#687394"],
];

function colorIndex(seed: string) {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % COVER_COLORS.length;
}

export function createPlaceholderCoverSvg(title: string, author: string, format: BookFormat) {
  const initials = getBookInitials(title);
  const [from, to] = COVER_COLORS[colorIndex(`${title}:${author}`)];
  const safeTitle = escapeXml(title);
  const safeAuthor = escapeXml(author);
  const safeFormat = format.toUpperCase();

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400" role="img" aria-label="${safeTitle} cover">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${from}"/>
          <stop offset="100%" stop-color="${to}"/>
        </linearGradient>
      </defs>
      <rect width="300" height="400" fill="url(#g)"/>
      <rect x="24" y="24" width="252" height="352" rx="14" fill="none" stroke="#fff8ef" stroke-opacity=".45" stroke-width="2"/>
      <text x="150" y="144" text-anchor="middle" fill="#fff8ef" font-family="Georgia, serif" font-size="74" font-weight="700">${initials}</text>
      <text x="150" y="242" text-anchor="middle" fill="#fff8ef" font-family="Arial, sans-serif" font-size="20" font-weight="700">${safeFormat}</text>
      <text x="150" y="286" text-anchor="middle" fill="#fff8ef" font-family="Arial, sans-serif" font-size="17" font-weight="700">${truncateXml(safeTitle, 22)}</text>
      <text x="150" y="314" text-anchor="middle" fill="#fff8ef" fill-opacity=".78" font-family="Arial, sans-serif" font-size="14">${truncateXml(safeAuthor, 26)}</text>
    </svg>`,
    "utf8",
  );
}

export async function savePlaceholderCover(bookId: string, title: string, author: string, format: BookFormat) {
  const svg = createPlaceholderCoverSvg(title, author, format);
  return saveCoverBuffer(bookId, svg, "svg");
}

export async function saveCoverBuffer(bookId: string, buffer: Buffer, extension: string) {
  const hash = sha256Buffer(buffer).slice(0, 16);
  const safeExtension = extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  const relativePath = relativeCoverPath(`${bookId}-${hash}.${safeExtension}`);
  await writeBufferToStorage(relativePath, buffer);
  return { coverPath: relativePath, coverHash: hash };
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncateXml(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}
