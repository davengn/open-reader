"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import type { BookSummary } from "@/lib/types/books";

type MetadataInlineEditorProps = {
  book: BookSummary;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
};

export function MetadataInlineEditor({ book, onCancel, onSaved }: MetadataInlineEditorProps) {
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/books/${book.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, author }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Metadata could not be saved");
      setBusy(false);
      return;
    }

    await onSaved();
    setBusy(false);
  }

  return (
    <form className="metadata-form" onSubmit={submit}>
      <label>
        Title
        <input value={title} maxLength={300} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        Author
        <input value={author} maxLength={300} onChange={(event) => setAuthor(event.target.value)} />
      </label>
      {error ? <p className="message error">{error}</p> : null}
      <div className="metadata-actions">
        <button className="button-primary" type="submit" disabled={busy}>
          <Check className="inline-icon" aria-hidden="true" />
          Save
        </button>
        <button className="button-secondary" type="button" disabled={busy} onClick={onCancel}>
          <X className="inline-icon" aria-hidden="true" />
          Cancel
        </button>
      </div>
    </form>
  );
}
