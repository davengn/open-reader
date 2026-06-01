"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { X } from "lucide-react";

type ReaderHeaderProps = {
  title: string;
  author: string;
  currentPage: number;
  totalPages: number | null;
  children: ReactNode;
};

export function ReaderHeader({ title, author, currentPage, totalPages, children }: ReaderHeaderProps) {
  const pageSummary = totalPages ? `Page ${currentPage} of ${totalPages}` : "Loading pages";

  return (
    <header className="pdf-reader-header">
      <div className="reader-title-block">
        <p className="eyebrow">PDF reader</p>
        <h1>{title}</h1>
        <p>
          {author} / {pageSummary}
        </p>
      </div>
      <div className="reader-toolbar">
        {children}
        <Link className="icon-button" href="/" aria-label="Close reader" title="Close reader">
          <X className="inline-icon" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
