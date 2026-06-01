import Link from "next/link";
import { notFound } from "next/navigation";
import { getBookById } from "@/lib/db/queries/books";

export const dynamic = "force-dynamic";

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = getBookById(id);

  if (!book) {
    notFound();
  }

  return (
    <main className="page-shell reader-shell">
      <Link className="text-button" href="/">
        Back to library
      </Link>

      <section className="reader-panel">
        <p className="eyebrow">{book.format.toUpperCase()} reader shell</p>
        <h1>{book.title}</h1>
        <p className="reader-meta">
          {book.author} - {book.readingPercent}% read
        </p>
      </section>

      <section className="technical-panel" aria-label="Book storage details">
        <div>ID: {book.id}</div>
        <div>Status: {book.status}</div>
        <div>File: {book.filePath}</div>
      </section>
    </main>
  );
}
