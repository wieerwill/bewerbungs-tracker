import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

interface DatabaseOptions {
  baseDir: string;
}

export default function createDatabase({ baseDir }: DatabaseOptions) {
  const databaseDirectory = path.join(baseDir, 'database');
  const databaseFile = path.join(databaseDirectory, 'jobs.db');
  if (!fs.existsSync(databaseDirectory))
    fs.mkdirSync(databaseDirectory, { recursive: true });

  const db = new Database(databaseFile);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

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
      other_links_json TEXT, -- JSON Array [{label,url}]
      industry TEXT,
      size_range TEXT,
      hiring_page TEXT,
      career_email TEXT,
      phone TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
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

  db.exec(`
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
      remote_ratio INTEGER,
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
      FOREIGN KEY(contact_id) REFERENCES contacts(id) ON DELETE SET NULL
    );
  `);

  return db;
}

export type SqliteDatabase = ReturnType<typeof createDatabase>;
