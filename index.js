// index.js (simple, local-only)

"use strict";

const path = require("path");
const fs = require("fs");
const express = require("express");
const morgan = require("morgan");
const { v4: uuidv4 } = require("uuid");
const BetterSqlite3 = require("better-sqlite3");

const app = express();
const isProduction = process.env.NODE_ENV === "production";

/* ---------- Static, parsing, views ---------- */
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(express.json({ limit: "2mb" }));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
app.use(morgan(isProduction ? "tiny" : "dev"));

/* ---------- Local database (SQLite file) ---------- */
const databaseDirectory = path.join(__dirname, "database");
const databaseFile = path.join(databaseDirectory, "jobs.db");
if (!fs.existsSync(databaseDirectory))
  fs.mkdirSync(databaseDirectory, { recursive: true });

const sqlite = new BetterSqlite3(databaseFile);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    note TEXT,
    applied INTEGER DEFAULT 0,
    answer INTEGER DEFAULT 0,
    company_name TEXT,
    company_website TEXT,
    company_street TEXT,
    company_city TEXT,
    company_note TEXT,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    contact_note TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

/* ---------- Helpers ---------- */
function mapRowToViewModel(row) {
  return {
    _id: row.id,
    title: row.title,
    description: row.description || "",
    note: row.note || "",
    applied: !!row.applied,
    answer: !!row.answer,
    company: {
      name: row.company_name || "",
      website: row.company_website || "",
      street: row.company_street || "",
      city: row.company_city || "",
      note: row.company_note || "",
    },
    contact: {
      name: row.contact_name || "",
      email: row.contact_email || "",
      phone: row.contact_phone || "",
      note: row.contact_note || "",
    },
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapRequestToRecord(body, current = null) {
  const get = (x) => (typeof x === "string" ? x.trim() : x || "");
  return {
    id: current ? current.id : uuidv4(),
    title: get(body.jobTitle),
    description: get(body.jobDescription),
    note: get(body.jobNote),
    applied: current ? (current.applied ? 1 : 0) : 0,
    answer: current ? (current.answer ? 1 : 0) : 0,
    company_name: get(body.companyName),
    company_website: get(body.companyWebsite),
    company_street: get(body.companyStreet),
    company_city: get(body.companyCity),
    company_note: get(body.companyNote),
    contact_name: get(body.contactName),
    contact_email: get(body.contactEmail),
    contact_phone: get(body.contactPhone || body.contactTelephone),
    contact_note: get(body.contactNote),
  };
}

/* ---------- Prepared statements ---------- */
const insertJob = sqlite.prepare(`
  INSERT INTO jobs (
    id, title, description, note, applied, answer,
    company_name, company_website, company_street, company_city, company_note,
    contact_name, contact_email, contact_phone, contact_note
  ) VALUES (
    @id, @title, @description, @note, @applied, @answer,
    @company_name, @company_website, @company_street, @company_city, @company_note,
    @contact_name, @contact_email, @contact_phone, @contact_note
  )
`);

const updateJob = sqlite.prepare(`
  UPDATE jobs SET
    title=@title,
    description=@description,
    note=@note,
    applied=@applied,
    answer=@answer,
    company_name=@company_name,
    company_website=@company_website,
    company_street=@company_street,
    company_city=@company_city,
    company_note=@company_note,
    contact_name=@contact_name,
    contact_email=@contact_email,
    contact_phone=@contact_phone,
    contact_note=@contact_note,
    updated_at=datetime('now')
  WHERE id=@id
`);

const deleteJobById = sqlite.prepare(`DELETE FROM jobs WHERE id = ?`);
const getJobById = sqlite.prepare(`SELECT * FROM jobs WHERE id = ?`);

function listJobs({ query, status, sort }) {
  const whereParts = [];
  const params = {};
  if (query && query.trim()) {
    whereParts.push(`(
      title LIKE @like OR description LIKE @like OR note LIKE @like OR
      company_name LIKE @like OR company_city LIKE @like OR contact_name LIKE @like
    )`);
    params.like = `%${query.trim()}%`;
  }
  if (status === "applied") whereParts.push(`applied = 1`);
  else if (status === "not-applied") whereParts.push(`applied = 0`);
  else if (status === "answered") whereParts.push(`answer = 1`);
  else if (status === "no-answer") whereParts.push(`answer = 0`);

  let orderBy = `created_at DESC`;
  if (sort === "title") orderBy = `title COLLATE NOCASE ASC`;
  else if (sort === "company") orderBy = `company_name COLLATE NOCASE ASC`;

  const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
  const sql = `SELECT * FROM jobs ${whereSql} ORDER BY ${orderBy}`;
  const rows = sqlite.prepare(sql).all(params);
  return rows.map(mapRowToViewModel);
}

/* ---------- Routes ---------- */

// Create form
app.get("/new", (req, res) => {
  const message = typeof req.query.msg === "string" ? req.query.msg : null;
  res.render("new", { msg: message });
});

// Create action
app.post("/new", (req, res) => {
  const record = mapRequestToRecord(req.body);
  if (!record.title)
    return res.redirect(
      "/new?msg=" + encodeURIComponent("Titel ist erforderlich")
    );
  insertJob.run(record);
  res.redirect(`/detail/${record.id}`);
});

// Read detail
app.get("/detail/:id", (req, res) => {
  const row = getJobById.get(String(req.params.id));
  if (!row)
    return res.redirect(
      "/?msg=" + encodeURIComponent("Kein Job zu dieser ID gefunden")
    );
  const message = typeof req.query.msg === "string" ? req.query.msg : null;
  res.render("detail", { job: mapRowToViewModel(row), msg: message });
});

app.get("/detail", (_req, res) =>
  res.redirect("/?msg=" + encodeURIComponent("Keine ID ausgewählt"))
);

// Edit form
app.get("/edit/:id", (req, res) => {
  const row = getJobById.get(String(req.params.id));
  if (!row)
    return res.redirect(
      "/?msg=" + encodeURIComponent("Kein Job zu dieser ID gefunden")
    );
  const message = typeof req.query.msg === "string" ? req.query.msg : null;
  res.render("edit", { job: mapRowToViewModel(row), msg: message });
});

// Edit action
app.post("/edit/:id", (req, res) => {
  const row = getJobById.get(String(req.params.id));
  if (!row)
    return res.redirect(
      "/?msg=" + encodeURIComponent("Kein Job zu dieser ID gefunden")
    );
  const current = mapRowToViewModel(row); // behält applied/answer
  const record = mapRequestToRecord(req.body, current);
  updateJob.run(record);
  res.redirect(`/detail/${record.id}`);
});

// Toggle applied / answer (einfach gehalten; GET beibehalten)
app.get("/toggle/:id/:field", (req, res) => {
  const id = String(req.params.id);
  const field = String(req.params.field);
  const row = getJobById.get(id);
  if (!row)
    return res.redirect(
      "/?msg=" + encodeURIComponent("Kein Job zu dieser ID gefunden")
    );

  const current = mapRowToViewModel(row);
  if (field === "applied") current.applied = !current.applied;
  else if (field === "answer") current.answer = !current.answer;
  else
    return res.redirect(
      `/detail/${id}?msg=` + encodeURIComponent("Unbekanntes Feld")
    );

  const record = mapRequestToRecord({}, current);
  updateJob.run(record);
  res.redirect(`/detail/${id}`);
});

// Delete (einfach; ideal wäre POST/DELETE)
app.get("/delete/:id", (req, res) => {
  deleteJobById.run(String(req.params.id));
  res.redirect("/");
});

// List
app.get("/", (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q : "";
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const sort = typeof req.query.sort === "string" ? req.query.sort : "";
  const message = typeof req.query.msg === "string" ? req.query.msg : null;

  const jobs = listJobs({ query, status, sort });
  res.render("index", { jobs, msg: message, q: query, status, sort });
});

// Fallback
app.use((_req, res) => res.redirect("/"));

/* ---------- Start server ---------- */
const PORT = process.env.PORT || 8080;
const HOST = process.env.IP || "127.0.0.1";
app.listen(PORT, HOST, () => {
  console.log(`Listening on http://${HOST}:${PORT}`);
});

module.exports = app;
