"use client";

import { Edit3, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MetadataInlineEditor } from "@/components/library/MetadataInlineEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { getBookInitials } from "@/lib/library/covers";
import { cn } from "@/lib/utils";
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
          <Badge variant="secondary" className="font-extrabold text-[0.74rem] uppercase h-6 px-2">
            {book.format}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "font-extrabold text-[0.74rem] uppercase h-6 px-2",
              book.status === "ready" && "bg-[#e6efe4] text-success hover:bg-[#e6efe4]/90 border-transparent",
              book.status === "indexing" && "bg-[#fff1d7] text-warning hover:bg-[#fff1d7]/90 border-transparent",
              book.status === "error" && "bg-[#f8e5df] text-danger hover:bg-[#f8e5df]/90 border-transparent"
            )}
          >
            {book.status}
          </Badge>
        </div>
        <Progress value={book.readingPercent} className="h-2" aria-label={`${book.readingPercent}% read`} />
        {book.statusMessage ? <p className="message error">{book.statusMessage}</p> : null}
        {error ? <p className="message error">{error}</p> : null}
        <div className="card-actions">
          <Button variant="outline" size="icon" aria-label={`Edit ${book.title}`} onClick={() => setEditing(true)}>
            <Edit3 className="inline-icon" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hover:text-destructive text-destructive/80"
            aria-label={`Delete ${book.title}`}
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 className="inline-icon" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this book?</DialogTitle>
            <DialogDescription>
              {book.title} and its local reading memory will be removed from this Open Reader library.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" disabled={busy} onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={busy} onClick={deleteBook}>
              <Trash2 className="inline-icon" aria-hidden="true" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
