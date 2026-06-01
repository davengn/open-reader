# Open Reader

Open Reader is a self-hosted technical book library for local PDF and EPUB reading workflows.

## Local Setup

```powershell
npm install
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`.

## Book Library Scope

- Upload PDF and EPUB files up to 200 MB.
- Store raw books in `books/` and metadata in `reader.db`.
- Extract best-effort metadata and index local text chunks for future search.
- Browse a responsive library grid with format filters, sort controls, progress, inline metadata edits, and safe deletion.

## Validation

```powershell
npm run lint
npm run test
npm run build
```

The app supports optional overrides for isolated runs:

```powershell
$env:OPEN_READER_DB_PATH = "D:\path\to\reader.db"
$env:OPEN_READER_BOOK_ROOT = "D:\path\to\books"
```
