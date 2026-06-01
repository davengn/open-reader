import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { filenameToTitle } from "@/lib/validation/books";

export type ParsedEpub = {
  title: string;
  author: string;
  totalLocations: number | null;
  text: string;
  cover?: {
    bytes: Buffer;
    extension: string;
  };
};

export async function parseEpubBook(filePath: string, originalFilename: string): Promise<ParsedEpub> {
  const zip = await JSZip.loadAsync(await readFile(filePath));
  const opfPath = await findPackagePath(zip);
  const opf = opfPath ? await zip.file(opfPath)?.async("string") : null;
  const opfBase = opfPath ? path.posix.dirname(opfPath) : "";

  if (!opf) {
    throw new Error("EPUB package document is missing");
  }

  const title = extractTag(opf, "dc:title") ?? filenameToTitle(originalFilename);
  const author = extractTag(opf, "dc:creator") ?? "Unknown";
  const manifest = parseManifest(opf);
  const cover = await extractCover(zip, manifest, opf, opfBase);
  const htmlItems = manifest.filter((item) => /x?html|html/i.test(item.mediaType));
  const sectionTexts: string[] = [];

  for (const item of htmlItems) {
    const entryPath = resolveOpfPath(opfBase, item.href);
    const entry = zip.file(entryPath);
    if (!entry) {
      continue;
    }
    const html = await entry.async("string");
    sectionTexts.push(stripHtml(html));
  }

  return {
    title,
    author,
    totalLocations: Math.max(1, htmlItems.length) || null,
    text: sectionTexts.join("\n\n"),
    cover,
  };
}

async function findPackagePath(zip: JSZip) {
  const container = await zip.file("META-INF/container.xml")?.async("string");
  if (!container) {
    return null;
  }
  const match = container.match(/full-path=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

function extractTag(xml: string, tag: string) {
  const escaped = tag.replace(":", "\\:");
  const match = xml.match(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match ? decodeXml(stripTags(match[1])).replace(/\s+/g, " ").trim() || null : null;
}

function parseManifest(opf: string) {
  const items: Array<{ id: string; href: string; mediaType: string; properties: string }> = [];
  const pattern = /<item\b([^>]+)>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(opf))) {
    const attrs = match[1];
    const id = attr(attrs, "id");
    const href = attr(attrs, "href");
    const mediaType = attr(attrs, "media-type") ?? "";
    const properties = attr(attrs, "properties") ?? "";

    if (id && href) {
      items.push({ id, href, mediaType, properties });
    }
  }

  return items;
}

async function extractCover(
  zip: JSZip,
  manifest: Array<{ id: string; href: string; mediaType: string; properties: string }>,
  opf: string,
  opfBase: string,
) {
  const coverId = opf.match(/<meta\b[^>]*name=["']cover["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1];
  const coverItem =
    manifest.find((item) => coverId && item.id === coverId) ??
    manifest.find((item) => item.properties.split(/\s+/).includes("cover-image")) ??
    manifest.find((item) => /^image\//i.test(item.mediaType));

  if (!coverItem) {
    return undefined;
  }

  const coverPath = resolveOpfPath(opfBase, coverItem.href);
  const entry = zip.file(coverPath);
  if (!entry) {
    return undefined;
  }

  const bytes = Buffer.from(await entry.async("uint8array"));
  const extension = path.posix.extname(coverItem.href).replace(".", "") || mimeToExtension(coverItem.mediaType);
  return { bytes, extension };
}

function resolveOpfPath(opfBase: string, href: string) {
  return path.posix.normalize(path.posix.join(opfBase === "." ? "" : opfBase, href));
}

function attr(attrs: string, name: string) {
  const match = attrs.match(new RegExp(`${name}=["']([^"']+)["']`, "i"));
  return match?.[1] ?? null;
}

function stripHtml(html: string) {
  return decodeXml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ");
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function mimeToExtension(mimeType: string) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("gif")) return "gif";
  return "bin";
}
