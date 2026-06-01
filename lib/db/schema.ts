import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const books = sqliteTable(
  "books",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    author: text("author").notNull(),
    format: text("format", { enum: ["pdf", "epub"] }).notNull(),
    status: text("status", { enum: ["indexing", "ready", "error"] }).notNull(),
    statusMessage: text("status_message"),
    filePath: text("file_path").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    coverPath: text("cover_path"),
    coverHash: text("cover_hash"),
    totalPages: integer("total_pages"),
    totalLocations: integer("total_locations"),
    readingPercent: real("reading_percent").notNull().default(0),
    lastReadAt: integer("last_read_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => ({
    sha256Idx: uniqueIndex("books_sha256_unique").on(table.sha256),
  }),
);

export const readingProgress = sqliteTable("reading_progress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  locatorType: text("locator_type", { enum: ["pdf-page", "epub-cfi"] }).notNull(),
  page: integer("page"),
  cfi: text("cfi"),
  chapter: text("chapter"),
  percent: real("percent").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const highlights = sqliteTable("highlights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  color: text("color").notNull(),
  page: integer("page"),
  cfi: text("cfi"),
  chapter: text("chapter"),
  rects: text("rects").notNull().default("[]"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  highlightId: integer("highlight_id").references(() => highlights.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  page: integer("page"),
  cfi: text("cfi"),
  updatedAt: integer("updated_at").notNull(),
});

export const flashcards = sqliteTable("flashcards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  front: text("front").notNull(),
  back: text("back").notNull(),
  nextReview: integer("next_review"),
  intervalDays: integer("interval_days").notNull(),
  easeFactor: real("ease_factor").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const bookChunks = sqliteTable("book_chunks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  chapter: text("chapter"),
  page: integer("page"),
  cfi: text("cfi"),
  tokenStart: integer("token_start"),
  tokenEnd: integer("token_end"),
  createdAt: integer("created_at").notNull(),
});

export const schema = {
  books,
  readingProgress,
  highlights,
  notes,
  flashcards,
  bookChunks,
};
