import { groupAnnotationItems, toHighlightAnnotationItem, toStandaloneNoteAnnotationItem } from "@/lib/reader/annotationSort";
import type { AnnotationExportData } from "@/lib/db/queries/notes";

export function sanitizeMarkdownFilename(title: string) {
  const cleaned = title
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  return `${cleaned || "highlights-and-notes"}.md`;
}

export function formatMarkdownExport(data: AnnotationExportData, exportedAtIso = new Date().toISOString()) {
  const lines: string[] = [`# ${data.book.title}`, "", `Author: ${data.book.author}`, `Exported: ${exportedAtIso}`, ""];
  const items = [
    ...data.highlights.map(toHighlightAnnotationItem),
    ...data.standaloneNotes.map((note) => toStandaloneNoteAnnotationItem(note)),
  ];

  if (items.length === 0) {
    lines.push("No highlights or notes yet.", "");
    return lines.join("\n");
  }

  lines.push("---", "");
  const groups = groupAnnotationItems(items);
  for (const group of groups) {
    lines.push(`## ${group.chapter}`, "");
    for (const item of group.items) {
      if (item.kind === "highlight") {
        const color = item.color ?? "yellow";
        const metadata = `${item.locationLabel} - ${color}`;
        lines.push(...blockquote(item.fullText), "", `_${metadata}_`, "");
        if (item.noteContent.trim()) {
          lines.push(item.noteContent.trim(), "");
        }
      } else {
        lines.push(item.fullText.trim(), "", `_${item.locationLabel}_`, "");
      }
      lines.push("---", "");
    }
  }

  return lines.join("\n");
}

function blockquote(text: string) {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => `> ${line}`);
}
