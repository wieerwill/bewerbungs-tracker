import type { SqliteDatabase } from './database';
import type {
  Company,
  Contact,
  JobJoinedRow,
  JobRecord,
  ListJobsParams,
} from './types';

export default function createStatements(db: SqliteDatabase) {
  // --- Companies (prepared) ---
  const stmtInsertCompany = db.prepare(`
  INSERT INTO companies (id,name,website,street,city,note,
    linkedin_url,glassdoor_url,stepstone_url,other_links_json,
    industry,size_range,hiring_page,career_email,phone)
  VALUES (@id,@name,@website,@street,@city,@note,
    @linkedin_url,@glassdoor_url,@stepstone_url,@other_links_json,
    @industry,@size_range,@hiring_page,@career_email,@phone)
`);
  const stmtUpdateCompany = db.prepare(`
  UPDATE companies SET
    name=@name, website=@website, street=@street, city=@city, note=@note,
    linkedin_url=@linkedin_url, glassdoor_url=@glassdoor_url, stepstone_url=@stepstone_url,
    other_links_json=@other_links_json, industry=@industry, size_range=@size_range,
    hiring_page=@hiring_page, career_email=@career_email, phone=@phone,
    updated_at=datetime('now')
  WHERE id=@id
`);
  const stmtDeleteCompanyById = db.prepare(
    `DELETE FROM companies WHERE id = ?`,
  );
  const stmtGetCompanyById = db.prepare(`SELECT * FROM companies WHERE id = ?`);
  const stmtGetCompanyByName = db.prepare(
    `SELECT * FROM companies WHERE name = ? COLLATE NOCASE`,
  );
  const stmtListCompanies = db.prepare(
    `SELECT * FROM companies ORDER BY name COLLATE NOCASE ASC`,
  );

  // --- Contacts (prepared) ---
  const stmtInsertContact = db.prepare(
    `INSERT INTO contacts (id,company_id,name,email,phone,note) VALUES (@id,@company_id,@name,@email,@phone,@note)`,
  );
  const stmtDeleteContactById = db.prepare(`DELETE FROM contacts WHERE id = ?`);
  const stmtGetContactById = db.prepare(`SELECT * FROM contacts WHERE id = ?`);
  const stmtListContactsForCompany = db.prepare(
    `SELECT * FROM contacts WHERE company_id = ? ORDER BY name COLLATE NOCASE ASC`,
  );

  // --- Jobs (prepared) ---
  const stmtInsertJob = db.prepare(`
  INSERT INTO jobs (id,title,description,note,applied,answer,company_id,contact_id,
    salary_min,salary_max,salary_target,salary_currency,salary_period,
    work_mode,remote_ratio,seniority,employment_type,contract_type,
    start_date,deadline_date,source_url,application_channel,referral)
  VALUES (@id,@title,@description,@note,@applied,@answer,@company_id,@contact_id,
    @salary_min,@salary_max,@salary_target,@salary_currency,@salary_period,
    @work_mode,@remote_ratio,@seniority,@employment_type,@contract_type,
    @start_date,@deadline_date,@source_url,@application_channel,@referral)
`);
  const stmtUpdateJob = db.prepare(`
  UPDATE jobs SET
    title=@title, description=@description, note=@note,
    applied=@applied, answer=@answer,
    company_id=@company_id, contact_id=@contact_id,
    salary_min=@salary_min, salary_max=@salary_max, salary_target=@salary_target,
    salary_currency=@salary_currency, salary_period=@salary_period,
    work_mode=@work_mode, remote_ratio=@remote_ratio, seniority=@seniority,
    employment_type=@employment_type, contract_type=@contract_type,
    start_date=@start_date, deadline_date=@deadline_date,
    source_url=@source_url, application_channel=@application_channel, referral=@referral,
    updated_at=datetime('now')
  WHERE id=@id
`);
  const stmtDeleteJobById = db.prepare(`DELETE FROM jobs WHERE id = ?`);
  const stmtGetJobById = db.prepare(`SELECT * FROM jobs WHERE id = ?`);

  // --- Jobs: list + joined detail ---
  function listJobs(params: ListJobsParams = {}): JobJoinedRow[] {
    const { query, status, sort } = params;
    const clauses: string[] = [];
    const bind: Record<string, unknown> = {};
    if (query && query.trim()) {
      clauses.push(`(
        j.title LIKE @like OR j.description LIKE @like OR j.note LIKE @like OR
        c.name LIKE @like OR c.city LIKE @like OR ct.name LIKE @like
      )`);
      bind.like = `%${query.trim()}%`;
    }
    if (status === 'applied') clauses.push(`j.applied = 1`);
    else if (status === 'not-applied') clauses.push(`j.applied = 0`);
    else if (status === 'answered') clauses.push(`j.answer = 1`);
    else if (status === 'no-answer') clauses.push(`j.answer = 0`);

    let order = `j.created_at DESC`;
    if (sort === 'title') order = `j.title COLLATE NOCASE ASC`;
    else if (sort === 'company') order = `c.name COLLATE NOCASE ASC`;

    const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const sql = `
      SELECT
        j.*,
        c.name    AS company_name,
        c.website AS company_website,
        c.city    AS company_city,
        ct.name   AS contact_name,
        ct.email  AS contact_email,
        ct.phone  AS contact_phone
      FROM jobs j
      LEFT JOIN companies c ON c.id = j.company_id
      LEFT JOIN contacts  ct ON ct.id = j.contact_id
      ${whereSql}
      ORDER BY ${order}
    `;
    return db.prepare(sql).all(bind) as JobJoinedRow[];
  }

  function getJobJoinedById(id: string): JobJoinedRow | undefined {
    const sql = `
      SELECT
        j.*,
        c.name    AS company_name,
        c.website AS company_website,
        c.city    AS company_city,
        ct.name   AS contact_name,
        ct.email  AS contact_email,
        ct.phone  AS contact_phone
      FROM jobs j
      LEFT JOIN companies c ON c.id = j.company_id
      LEFT JOIN contacts  ct ON ct.id = j.contact_id
      WHERE j.id = ?
      LIMIT 1
    `;
    return db.prepare(sql).get(id) as JobJoinedRow | undefined;
  }

  // --- Typed wrappers (Companies) ---
  function insertCompany(row: Company) {
    return stmtInsertCompany.run(row);
  }
  function updateCompany(row: Company) {
    return stmtUpdateCompany.run(row);
  }
  function deleteCompany(id: string) {
    return stmtDeleteCompanyById.run(id);
  }
  function getCompanyById(id: string) {
    return stmtGetCompanyById.get(id) as Company | undefined;
  }
  function getCompanyByName(name: string) {
    return stmtGetCompanyByName.get(name) as Company | undefined;
  }
  function listCompanies(): Company[] {
    return stmtListCompanies.all() as Company[];
  }

  // --- Typed wrappers (Contacts) ---
  function insertContact(row: Contact) {
    return stmtInsertContact.run(row);
  }
  function deleteContact(id: string) {
    return stmtDeleteContactById.run(id);
  }
  function getContactById(id: string) {
    return stmtGetContactById.get(id) as Contact | undefined;
  }
  function listContactsForCompany(id: string): Contact[] {
    return stmtListContactsForCompany.all(id) as Contact[];
  }

  // --- Typed wrappers (Jobs) ---
  function insertJob(row: JobRecord) {
    return stmtInsertJob.run(row);
  }
  function updateJob(row: JobRecord) {
    return stmtUpdateJob.run(row);
  }
  function deleteJob(id: string) {
    return stmtDeleteJobById.run(id);
  }
  function getJobById(id: string) {
    return stmtGetJobById.get(id) as JobRecord | undefined;
  }

  return {
    // companies
    insertCompany,
    updateCompany,
    deleteCompany,
    getCompanyById,
    getCompanyByName,
    listCompanies,
    // contacts
    insertContact,
    deleteContact,
    getContactById,
    listContactsForCompany,
    // jobs
    insertJob,
    updateJob,
    deleteJob,
    getJobById,
    listJobs,
    getJobJoinedById,
  };
}

export type Statements = ReturnType<typeof createStatements>;
