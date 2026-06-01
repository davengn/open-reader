import type Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import path from "node:path";

const MIGRATION_TABLE = "_open_reader_migrations";
const MIGRATIONS = ["0001_book_library.sql"];

export function runMigrations(rawDb: Database.Database) {
  rawDb.pragma("foreign_keys = ON");
  rawDb.exec(
    `CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      id TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )`,
  );

  const exists = rawDb.prepare(`SELECT 1 FROM ${MIGRATION_TABLE} WHERE id = ?`).pluck();

  for (const migration of MIGRATIONS) {
    if (exists.get(migration)) {
      continue;
    }

    const migrationPath = path.join(process.cwd(), "lib", "db", "migrations", migration);
    const sql = readFileSync(migrationPath, "utf8");

    rawDb.transaction(() => {
      rawDb.exec(sql);
      rawDb
        .prepare(`INSERT INTO ${MIGRATION_TABLE} (id, applied_at) VALUES (?, ?)`)
        .run(migration, Date.now());
    })();
  }
}

if (process.env.NODE_ENV !== "test" && process.argv[1]?.endsWith("migrate.ts")) {
  const { getRawDb } = await import("./index");
  getRawDb();
  console.log("Open Reader database is up to date.");
}
