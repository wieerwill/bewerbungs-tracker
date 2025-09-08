// tests/api.util.ts
import express from 'express';
import request from 'supertest';
import BetterSqlite3 from 'better-sqlite3';
import createStatements from '../src/statements';
import { createApiRouter } from '../src/api';

// Falls du eine Factory in src/database exportierst, kannst du sie stattdessen nutzen.
// import createDatabase from '../src/database';

export function makeMemoryDb() {
  const db = new BetterSqlite3(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Schema von eurer App – identisch zu src/database.ts
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      website TEXT,
      street TEXT,
      city TEXT,
      note TEXT,
      linkedin_url TEXT,
      glassdoor_url TEXT,
      stepstone_url TEXT,
      other_links_json TEXT,
      industry TEXT,
      size_range TEXT,
      hiring_page TEXT,
      career_email TEXT,
      phone TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
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
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      note TEXT,
      applied INTEGER DEFAULT 0,
      answer INTEGER DEFAULT 0,
      company_id TEXT,
      contact_id TEXT,
      salary_min REAL,
      salary_max REAL,
      salary_target REAL,
      salary_currency TEXT,
      salary_period TEXT,
      work_mode TEXT,
      remote_ratio REAL,
      seniority TEXT,
      employment_type TEXT,
      contract_type TEXT,
      start_date TEXT,
      deadline_date TEXT,
      source_url TEXT,
      application_channel TEXT,
      referral INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE SET NULL,
      FOREIGN KEY(contact_id) REFERENCES contacts(id)  ON DELETE SET NULL
    );
  `);

  return db;
}

export function makeApiApp() {
  const sqlite = makeMemoryDb();
  const statements = createStatements(sqlite as any);
  const app = express();
  // Nur API mounten, kein csurf
  app.use('/api', createApiRouter(statements));
  return { app, sqlite, s: statements };
}

export const http = (app: express.Express) => request(app);
