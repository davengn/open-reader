import type { BookFilter } from "@/lib/types/books";

type EmptyLibraryProps = {
  totalBooks: number;
  activeFilter: BookFilter;
  onClearFilter: () => void;
};

export function EmptyLibrary({ totalBooks, activeFilter, onClearFilter }: EmptyLibraryProps) {
  if (totalBooks > 0 && activeFilter !== "all") {
    return (
      <section className="empty-panel" aria-live="polite">
        <p className="eyebrow">No matches</p>
        <h2>No books match your filter.</h2>
        <p>Switch back to the full library to see the rest of your local shelf.</p>
        <button className="button-secondary" type="button" onClick={onClearFilter}>
          Clear filter
        </button>
      </section>
    );
  }

  return (
    <section className="empty-panel" aria-live="polite">
      <p className="eyebrow">Empty library</p>
      <h2>Start with the book you keep meaning to finish.</h2>
      <p>Upload a PDF or EPUB and Open Reader will save it locally, index it, and keep it ready here.</p>
    </section>
  );
}
