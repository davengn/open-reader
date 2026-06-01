"use client";

import { Edit3, Trash2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MetadataInlineEditor } from "@/components/library/MetadataInlineEditor";
import { getBookInitials } from "@/lib/library/covers";
import type { BookSummary } from "@/lib/types/books";

type BookCardProps = {
  book: BookSummary;
  onBookChanged: () => void | Promise<void>;
};

export function BookCard({ book, onBookChanged }: BookCardProps) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initials = useMemo(() => getBookInitials(book.title), [book.title]);
  const canOpen = book.status === "ready";

  async function deleteBook() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/books/${book.id}`, { method: "DELETE" });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Book could not be deleted");
      setBusy(false);
      return;
    }

    setConfirmingDelete(false);
    await onBookChanged();
    setBusy(false);
  }

  return (
    <article className="book-card">
      {canOpen ? (
        <Link className="book-cover-link ready" href={`/book/${book.id}`} aria-label={`Open ${book.title}`}>
          <Cover book={book} initials={initials} />
        </Link>
      ) : (
        <div className="book-cover-link" aria-label={`${book.title} is ${book.status}`}>
          <Cover book={book} initials={initials} />
        </div>
      )}

      <div className="book-meta">
        {editing ? (
          <MetadataInlineEditor
            book={book}
            onCancel={() => setEditing(false)}
            onSaved={async () => {
              setEditing(false);
              await onBookChanged();
            }}
          />
        ) : (
          <>
            <h2 className="book-title">{book.title}</h2>
            <p className="book-author">{book.author}</p>
          </>
        )}
      </div>

      <div className="book-foot">
        <div className="badge-row">
          <span className="badge">{book.format}</span>
          <span className={`badge ${book.status}`}>{book.status}</span>
        </div>
        <div className="progress-track" aria-label={`${book.readingPercent}% read`}>
          <div className="progress-value" style={{ width: `${book.readingPercent}%` }} />
        </div>
        {book.statusMessage ? <p className="message error">{book.statusMessage}</p> : null}
        {error ? <p className="message error">{error}</p> : null}
        <div className="card-actions">
          <button className="icon-button" type="button" aria-label={`Edit ${book.title}`} onClick={() => setEditing(true)}>
            <Edit3 className="inline-icon" aria-hidden="true" />
          </button>
          <button
            className="icon-button danger"
            type="button"
            aria-label={`Delete ${book.title}`}
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 className="inline-icon" aria-hidden="true" />
          </button>
        </div>
      </div>

      {confirmingDelete ? (
        <div className="dialog-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby={`delete-${book.id}`}>
            <button
              className="icon-button"
              type="button"
              aria-label="Close delete confirmation"
              onClick={() => setConfirmingDelete(false)}
            >
              <X className="inline-icon" aria-hidden="true" />
            </button>
            <h3 id={`delete-${book.id}`}>Delete this book?</h3>
            <p>
              {book.title} and its local reading memory will be removed from this Open Reader library.
            </p>
            <div className="dialog-actions">
              <button className="button-secondary" type="button" disabled={busy} onClick={() => setConfirmingDelete(false)}>
                Cancel
              </button>
              <button className="button-primary" type="button" disabled={busy} onClick={deleteBook}>
                <Trash2 className="inline-icon" aria-hidden="true" />
                Delete
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </article>
  );
}

function Cover({ book, initials }: { book: BookSummary; initials: string }) {
  if (book.coverUrl) {
    return <Image className="book-cover" src={book.coverUrl} width={300} height={400} alt="" unoptimized />;
  }

  return (
    <div className="book-cover-fallback">
      <span className="book-initials">{initials}</span>
    </div>
  );
}
