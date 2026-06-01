"use client";

import { BookCard } from "@/components/library/BookCard";
import { EmptyLibrary } from "@/components/library/EmptyLibrary";
import type { BookFilter, BookSummary } from "@/lib/types/books";

type BookGridProps = {
  books: BookSummary[];
  totalBooks: number;
  activeFilter: BookFilter;
  onClearFilter: () => void;
  onBookChanged: () => void | Promise<void>;
};

export function BookGrid({ books, totalBooks, activeFilter, onClearFilter, onBookChanged }: BookGridProps) {
  if (books.length === 0) {
    return <EmptyLibrary totalBooks={totalBooks} activeFilter={activeFilter} onClearFilter={onClearFilter} />;
  }

  return (
    <section className="book-grid" aria-label="Book library">
      {books.map((book) => (
        <BookCard key={book.id} book={book} onBookChanged={onBookChanged} />
      ))}
    </section>
  );
}
