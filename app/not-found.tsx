import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell compact-page">
      <section className="empty-panel" aria-labelledby="not-found-title">
        <p className="eyebrow">Open Reader</p>
        <h1 id="not-found-title">This shelf is empty.</h1>
        <p>The book or page you tried to open is not in the local library.</p>
        <Link className="button-primary" href="/">
          Back to library
        </Link>
      </section>
    </main>
  );
}
