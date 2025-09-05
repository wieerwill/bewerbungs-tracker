"use strict";

/**
 * Baut vorbereitete Statements & gibt einfache Funktions-APIs zurück.
 * Alle Funktionen sind synchron (better-sqlite3).
 */
function createStatements(db) {
  /* Companies */
  const insertCompany = db.prepare(`
    INSERT INTO companies (id, name, website, street, city, note)
    VALUES (@id, @name, @website, @street, @city, @note)
  `);
  const updateCompany = db.prepare(`
    UPDATE companies SET
      name=@name, website=@website, street=@street, city=@city, note=@note,
      updated_at=datetime('now') WHERE id=@id
  `);
  const deleteCompanyById = db.prepare(`DELETE FROM companies WHERE id = ?`);
  const getCompanyById = db.prepare(`SELECT * FROM companies WHERE id = ?`);
  const getCompanyByName = db.prepare(`SELECT * FROM companies WHERE name = ? COLLATE NOCASE`);
  const listCompanies = db.prepare(`SELECT * FROM companies ORDER BY name COLLATE NOCASE ASC`);

  /* Contacts */
  const insertContact = db.prepare(`
    INSERT INTO contacts (id, company_id, name, email, phone, note)
    VALUES (@id, @company_id, @name, @email, @phone, @note)
  `);
  const deleteContactById = db.prepare(`DELETE FROM contacts WHERE id = ?`);
  const getContactById = db.prepare(`SELECT * FROM contacts WHERE id = ?`);
  const listContactsForCompany = db.prepare(`
    SELECT * FROM contacts WHERE company_id = ? ORDER BY name COLLATE NOCASE ASC
  `);

  /* Jobs */
  const insertJob = db.prepare(`
    INSERT INTO jobs (id, title, description, note, applied, answer, company_id, contact_id)
    VALUES (@id, @title, @description, @note, @applied, @answer, @company_id, @contact_id)
  `);
  const updateJob = db.prepare(`
    UPDATE jobs SET
      title=@title, description=@description, note=@note,
      applied=@applied, answer=@answer,
      company_id=@company_id, contact_id=@contact_id,
      updated_at=datetime('now')
    WHERE id=@id
  `);
  const deleteJobById = db.prepare(`DELETE FROM jobs WHERE id = ?`);
  const getJobById = db.prepare(`SELECT * FROM jobs WHERE id = ?`);

  // Liste mit optionaler Suche/Filter/Sort + LEFT JOIN auf Company/Contact
  function listJobs({ query, status, sort }) {
    const conditions = [];
    const params = {};
    if (query && query.trim()) {
      conditions.push(`(
        j.title LIKE @like OR j.description LIKE @like OR j.note LIKE @like OR
        c.name LIKE @like OR c.city LIKE @like OR ct.name LIKE @like
      )`);
      params.like = `%${query.trim()}%`;
    }
    if (status === "applied") conditions.push(`j.applied = 1`);
    else if (status === "not-applied") conditions.push(`j.applied = 0`);
    else if (status === "answered") conditions.push(`j.answer = 1`);
    else if (status === "no-answer") conditions.push(`j.answer = 0`);

    let order = `j.created_at DESC`;
    if (sort === "title") order = `j.title COLLATE NOCASE ASC`;
    else if (sort === "company") order = `c.name COLLATE NOCASE ASC`;

    const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `
      SELECT
        j.*,
        c.name  AS company_name,
        c.website AS company_website,
        c.city  AS company_city,
        ct.name AS contact_name,
        ct.email AS contact_email,
        ct.phone AS contact_phone
      FROM jobs j
      LEFT JOIN companies c ON c.id = j.company_id
      LEFT JOIN contacts ct ON ct.id = j.contact_id
      ${whereSql}
      ORDER BY ${order}
    `;
    return db.prepare(sql).all(params);
  }

  return {
    // Companies
    insertCompany, updateCompany, deleteCompanyById, getCompanyById, getCompanyByName, listCompanies,
    // Contacts
    insertContact, deleteContactById, getContactById, listContactsForCompany,
    // Jobs
    insertJob, updateJob, deleteJobById, getJobById, listJobs,
  };
}

module.exports = createStatements;
