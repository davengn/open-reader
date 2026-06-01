import Link from "next/link";
import { notFound } from "next/navigation";
import { PdfReaderClient } from "@/app/book/[id]/PdfReaderClient";
import { EpubReaderClient } from "@/app/book/[id]/EpubReaderClient";
import { getBookById } from "@/lib/db/queries/books";
import { getCurrentPdfProgress, getCurrentEpubProgress } from "@/lib/db/queries/reader";
import { clampPdfPage } from "@/lib/reader/progress";

export const dynamic = "force-dynamic";

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = getBookById(id);

  if (!book) {
    notFound();
  }

  if (book.format === "pdf" && book.status === "ready") {
    const savedProgress = getCurrentPdfProgress(book.id);
    const savedPage = savedProgress?.currentPage ?? 1;
    const totalPages =
      book.totalPages && book.totalPages > 0 && book.totalPages >= savedPage ? book.totalPages : null;
    const initialPage = totalPages ? clampPdfPage(savedPage, totalPages) : savedPage;

    return (
      <PdfReaderClient
        bookId={book.id}
        title={book.title}
        author={book.author}
        pdfUrl={`/api/books/${encodeURIComponent(book.id)}/file`}
        initialPage={initialPage}
        initialTotalPages={totalPages}
      />
    );
  }

  if (book.format === "epub" && book.status === "ready") {
    const savedProgress = getCurrentEpubProgress(book.id);
    const initialCfi = savedProgress?.cfi ?? null;
    const initialChapter = savedProgress?.chapter ?? null;

    return (
      <EpubReaderClient
        bookId={book.id}
        title={book.title}
        author={book.author}
        initialCfi={initialCfi}
        initialChapter={initialChapter}
      />
    );
  }

  return (
    <main className="page-shell reader-shell">
      <Link className="text-button" href="/">
        Back to library
      </Link>

      <section className="reader-panel">
        <p className="eyebrow">{book.format.toUpperCase()} reader</p>
        <h1>{book.title}</h1>
        <p className="reader-meta">
          {book.author} - {book.readingPercent}% read
        </p>
        {book.format !== "pdf" && book.format !== "epub" ? (
          <p className="reader-meta">This reader currently supports PDF and EPUB books.</p>
        ) : null}
        {book.status !== "ready" ? (
          <p className="message error">{book.statusMessage ?? "This book is still being prepared for reading."}</p>
        ) : null}
      </section>

      <section className="technical-panel" aria-label="Book storage details">
        <div>ID: {book.id}</div>
        <div>Status: {book.status}</div>
        <div>File: {book.filePath}</div>
      </section>
    </main>
  );
}
