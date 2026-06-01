import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { ReactNode } from "react";
import { X } from "lucide-react";

type ReaderHeaderProps = {
  title: string;
  author: string;
  currentPage?: number;
  totalPages?: number | null;
  chapterTitle?: string | null;
  format?: "pdf" | "epub";
  children: ReactNode;
};

export function ReaderHeader({
  title,
  author,
  currentPage,
  totalPages,
  chapterTitle,
  format = "pdf",
  children,
}: ReaderHeaderProps) {
  const pageSummary = totalPages ? `Page ${currentPage} of ${totalPages}` : "Loading pages";
  const readerLabel = format === "epub" ? "EPUB reader" : "PDF reader";
  const metaText = format === "epub" ? (chapterTitle || "Loading...") : pageSummary;

  return (
    <header className="pdf-reader-header">
      <div className="reader-title-block">
        <p className="eyebrow">{readerLabel}</p>
        <h1>{title}</h1>
        <p>
          {author} / {metaText}
        </p>
      </div>
      <div className="reader-toolbar">
        {children}
        <Button variant="outline" size="icon" asChild>
          <Link href="/" aria-label="Close reader" title="Close reader">
            <X className="inline-icon" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
