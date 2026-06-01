import { describe, expect, it } from "vitest";
import { filterBooks, sortBooks } from "@/lib/library/preferences";
import type { BookSummary } from "@/lib/types/books";

const books: BookSummary[] = [
  book("3", "Java Concurrency in Practice", "Brian Goetz", "pdf", 30, null, 10),
  book("1", "Building Microservices", "Sam Newman", "epub", 10, 30, 30),
  book("2", "Building Data Intensive Applications", "Martin Kleppmann", "pdf", 80, 20, 20),
];

describe("library filtering and sorting", () => {
  it("filters by format", () => {
    expect(filterBooks(books, "pdf").map((item) => item.id)).toEqual(["3", "2"]);
  });

  it("sorts by title and last read", () => {
    expect(sortBooks(books, "title").map((item) => item.id)).toEqual(["2", "1", "3"]);
    expect(sortBooks(books, "lastRead").map((item) => item.id)).toEqual(["1", "2", "3"]);
  });
});

function book(
  id: string,
  title: string,
  author: string,
  format: "pdf" | "epub",
  createdAt: number,
  lastReadAt: number | null,
  readingPercent: number,
): BookSummary {
  return {
    id,
    title,
    author,
    format,
    status: "ready",
    readingPercent,
    lastReadAt,
    createdAt,
  };
}
