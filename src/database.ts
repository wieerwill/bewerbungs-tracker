"use strict";

const path = require("path");
const fs = require("fs");
const BetterSqlite3 = require("better-sqlite3");

function createDatabase({ baseDir }) {
  const databaseDirectory = path.join(baseDir, "database");
  const databaseFile = path.join(databaseDirectory, "jobs.db");
  if (!fs.existsSync(databaseDirectory)) fs.mkdirSync(databaseDirectory, { recursive: true });

  const sqlite = new BetterSqlite3(databaseFile);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  /* Schema (normalisiert) */
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      website TEXT,
      street TEXT,
      city TEXT,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT,
      email TEXT,
      phone TEXT,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
    );
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      note TEXT,
      applied INTEGER DEFAULT 0,
      answer INTEGER DEFAULT 0,
      company_id TEXT,
      contact_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE SET NULL,
      FOREIGN KEY(contact_id) REFERENCES contacts(id) ON DELETE SET NULL
    );
  `);

  return sqlite;
}

module.exports = createDatabase;
