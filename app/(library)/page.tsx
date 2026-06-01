import { LibraryClient } from "@/components/library/LibraryClient";
import { listBooks } from "@/lib/db/queries/books";

export const dynamic = "force-dynamic";

export default function LibraryPage() {
  const books = listBooks();

  return (
    <main className="page-shell">
      <LibraryClient initialBooks={books} />
    </main>
  );
}
