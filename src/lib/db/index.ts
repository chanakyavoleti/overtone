import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import * as schema from './schema';

const dbDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.resolve(dbDir, 'overtone.db');

declare global {
  // eslint-disable-next-line no-var
  var _overtoneSqlite: Database.Database | undefined;
  // eslint-disable-next-line no-var
  var _overtoneMigrated: boolean | undefined;
}

export const sqlite = globalThis._overtoneSqlite ?? new Database(dbPath);

if (process.env.NODE_ENV !== 'production') {
  globalThis._overtoneSqlite = sqlite;
}

// Enable WAL mode and foreign keys
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

// Auto-run migrations on first connection (idempotent CREATE IF NOT EXISTS)
if (!globalThis._overtoneMigrated) {
  try {
    const { runMigrations } = require('./migrate');
    runMigrations(db);
    globalThis._overtoneMigrated = true;
  } catch {
    // migrate.ts may not be bundled in all contexts
  }
}

export { sql };
export default db;
