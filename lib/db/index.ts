import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { runMigrations } from "./migrate";
import { schema } from "./schema";

type Connection = {
  path: string;
  raw: Database.Database;
  orm: BetterSQLite3Database<typeof schema>;
};

let connection: Connection | null = null;

export function getDatabasePath() {
  return process.env.OPEN_READER_DB_PATH || path.join(process.cwd(), "reader.db");
}

export function getRawDb() {
  const dbPath = getDatabasePath();

  if (connection?.path === dbPath) {
    return connection.raw;
  }

  connection?.raw.close();
  mkdirSync(path.dirname(dbPath), { recursive: true });
  const raw = new Database(dbPath);
  raw.pragma("journal_mode = WAL");
  raw.pragma("foreign_keys = ON");
  runMigrations(raw);

  connection = {
    path: dbPath,
    raw,
    orm: drizzle(raw, { schema }),
  };

  return raw;
}

export function getDb() {
  getRawDb();
  if (!connection) {
    throw new Error("Database connection was not initialized");
  }
  return connection.orm;
}

export function resetDbConnectionForTests() {
  connection?.raw.close();
  connection = null;
}
