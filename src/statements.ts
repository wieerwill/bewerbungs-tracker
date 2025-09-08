import type { SqliteDatabase } from './database';
import type {
  Company,
  Contact,
  JobJoinedRow,
  JobRecord,
  ListJobsParams,
  SalaryPeriod,
  WorkMode,
  Seniority,
  EmploymentType,
  ContractType,
} from './types';

/* ---------- helpers: coercion & guards ---------- */

const strOrNull = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
};

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const flag01 = (v: unknown): 0 | 1 => {
  return v === 1 || v === '1' || v === true || v === 'on' ? 1 : 0;
};

const asPeriod = (v: unknown): SalaryPeriod | null =>
  v === 'year' || v === 'month' ? (v as SalaryPeriod) : null;

const asWorkMode = (v: unknown): WorkMode | null =>
  v === 'onsite' || v === 'hybrid' || v === 'remote' ? (v as WorkMode) : null;

const asSeniority = (v: unknown): Seniority | null =>
  v === 'intern' ||
  v === 'junior' ||
  v === 'mid' ||
  v === 'senior' ||
  v === 'lead'
    ? (v as Seniority)
    : null;

const asEmployment = (v: unknown): EmploymentType | null =>
  v === 'full-time' || v === 'part-time' ? (v as EmploymentType) : null;

const asContract = (v: unknown): ContractType | null =>
  v === 'permanent' || v === 'fixed-term' || v === 'freelance'
    ? (v as ContractType)
    : null;

/* ---------- normalizers (strict in, clean out) ---------- */

function normalizeCompany(row: Partial<Company>): Company {
  return {
    id: String(row.id!),
    name: String(row.name!),
    website: strOrNull(row.website),
    street: strOrNull(row.street),
    city: strOrNull(row.city),
    note: strOrNull(row.note),
    linkedin_url: strOrNull(row.linkedin_url),
    glassdoor_url: strOrNull(row.glassdoor_url),
    stepstone_url: strOrNull(row.stepstone_url),
    other_links_json: strOrNull(row.other_links_json),
    industry: strOrNull(row.industry),
    size_range: strOrNull(row.size_range),
    hiring_page: strOrNull(row.hiring_page),
    career_email: strOrNull(row.career_email),
    phone: strOrNull(row.phone),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeJob(row: Partial<JobRecord>): JobRecord {
  return {
    id: String(row.id!),
    title: String(row.title!),
    description: strOrNull(row.description),
    note: strOrNull(row.note),
    applied: (row.applied ?? 0) as 0 | 1,
    answer: (row.answer ?? 0) as 0 | 1,

    company_id: strOrNull(row.company_id),
    contact_id: strOrNull(row.contact_id),

    salary_min: numOrNull(row.salary_min),
    salary_max: numOrNull(row.salary_max),
    salary_target: numOrNull(row.salary_target),
    salary_currency: strOrNull(row.salary_currency),
    salary_period: asPeriod(row.salary_period),

    work_mode: asWorkMode(row.work_mode),
    remote_ratio: numOrNull(row.remote_ratio),

    seniority: asSeniority(row.seniority),
    employment_type: asEmployment(row.employment_type),
    contract_type: asContract(row.contract_type),

    start_date: strOrNull(row.start_date),
    deadline_date: strOrNull(row.deadline_date),
    source_url: strOrNull(row.source_url),
    application_channel: strOrNull(row.application_channel),
    referral: flag01(row.referral),

    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeContact(row: Partial<Contact>): Contact {
  return {
    id: String(row.id!),
    company_id: String(row.company_id!),
    name: strOrNull(row.name),
    email: strOrNull(row.email),
    phone: strOrNull(row.phone),
    note: strOrNull(row.note),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/* ---------- statements factory ---------- */

export default function createStatements(db: SqliteDatabase) {
  /* Companies */
  const stmtInsertCompany = db.prepare(`
    INSERT INTO companies (
      id,name,website,street,city,note,
      linkedin_url,glassdoor_url,stepstone_url,other_links_json,
      industry,size_range,hiring_page,career_email,phone
    ) VALUES (
      @id,@name,@website,@street,@city,@note,
      @linkedin_url,@glassdoor_url,@stepstone_url,@other_links_json,
      @industry,@size_range,@hiring_page,@career_email,@phone
    )
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

  /* Contacts */
  const stmtInsertContact = db.prepare(`
    INSERT INTO contacts (id,company_id,name,email,phone,note)
    VALUES (@id,@company_id,@name,@email,@phone,@note)
  `);

  const stmtUpdateContact = db.prepare(`
    UPDATE contacts SET
      name=@name, email=@email, phone=@phone, note=@note,
      updated_at=datetime('now')
    WHERE id=@id AND company_id=@company_id
  `);

  const stmtDeleteContactById = db.prepare(`DELETE FROM contacts WHERE id = ?`);
  const stmtGetContactById = db.prepare(`SELECT * FROM contacts WHERE id = ?`);
  const stmtListContactsForCompany = db.prepare(`
    SELECT * FROM contacts
    WHERE company_id = ?
    ORDER BY name COLLATE NOCASE ASC
  `);

  /* Jobs */
  const stmtInsertJob = db.prepare(`
    INSERT INTO jobs (
      id,title,description,note,applied,answer,company_id,contact_id,
      salary_min,salary_max,salary_target,salary_currency,salary_period,
      work_mode,remote_ratio,seniority,employment_type,contract_type,
      start_date,deadline_date,source_url,application_channel,referral
    ) VALUES (
      @id,@title,@description,@note,@applied,@answer,@company_id,@contact_id,
      @salary_min,@salary_max,@salary_target,@salary_currency,@salary_period,
      @work_mode,@remote_ratio,@seniority,@employment_type,@contract_type,
      @start_date,@deadline_date,@source_url,@application_channel,@referral
    )
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

  /* ---------- queries ---------- */

  function listJobs(params: ListJobsParams = {}): JobJoinedRow[] {
    const { query, status, sort } = params;

    const where: string[] = [];
    const bind: Record<string, unknown> = {};

    if (query && query.trim()) {
      where.push(`(
        j.title LIKE @like OR j.description LIKE @like OR j.note LIKE @like OR
        c.name LIKE @like OR c.city LIKE @like OR ct.name LIKE @like
      )`);
      bind.like = `%${query.trim()}%`;
    }

    if (status === 'applied') where.push(`j.applied = 1`);
    else if (status === 'not-applied') where.push(`j.applied = 0`);
    else if (status === 'answered') where.push(`j.answer = 1`);
    else if (status === 'no-answer') where.push(`j.answer = 0`);

    let order = `j.created_at DESC`;
    if (sort === 'title') order = `j.title COLLATE NOCASE ASC`;
    else if (sort === 'company') order = `c.name COLLATE NOCASE ASC`;

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
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

  /* ---------- typed wrappers ---------- */
  function insertCompany(row: Company) {
    return stmtInsertCompany.run(normalizeCompany(row));
  }
  function updateCompany(row: Company) {
    return stmtUpdateCompany.run(normalizeCompany(row));
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
  function listCompanies(params: { query?: string } = {}): Company[] {
    const { query } = params;
    if (query && query.trim()) {
      const like = `%${query.trim()}%`;
      const sql = `
      SELECT * FROM companies
      WHERE name LIKE @like OR website LIKE @like OR city LIKE @like
      ORDER BY name COLLATE NOCASE ASC
    `;
      return db.prepare(sql).all({ like }) as Company[];
    }
    return stmtListCompanies.all() as Company[];
  }
  function insertContact(row: Contact) {
    return stmtInsertContact.run(normalizeContact(row));
  }
  function updateContact(row: Contact) {
    return stmtUpdateContact.run(normalizeContact(row));
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

  function insertJob(row: JobRecord) {
    return stmtInsertJob.run(normalizeJob(row));
  }
  function updateJob(row: JobRecord) {
    return stmtUpdateJob.run(normalizeJob(row));
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
    updateContact,
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
