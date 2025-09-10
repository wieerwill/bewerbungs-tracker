import fs from 'fs';
import os from 'os';
import path from 'path';
import createDatabase from '../src/database';
import createStatements from '../src/statements';

export function createTempBaseDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'apptracker-'));
}

export function makeTestDb() {
  const baseDir = createTempBaseDir();
  const db = createDatabase({ baseDir });
  const s = createStatements(db);
  return { baseDir, db, s };
}

export function mkCompany(overrides: Partial<any> = {}) {
  return {
    id: overrides.id ?? 'c-' + Math.random().toString(36).slice(2, 8),
    name: overrides.name ?? 'Company ' + Math.random().toString(36).slice(2, 5),
    website: overrides.website ?? null,
    street: overrides.street ?? null,
    city: overrides.city ?? null,
    note: overrides.note ?? null,
    linkedin_url: overrides.linkedin_url ?? null,
    glassdoor_url: overrides.glassdoor_url ?? null,
    stepstone_url: overrides.stepstone_url ?? null,
    other_links_json: overrides.other_links_json ?? null,
    industry: overrides.industry ?? null,
    size_range: overrides.size_range ?? null,
    hiring_page: overrides.hiring_page ?? null,
    career_email: overrides.career_email ?? null,
    phone: overrides.phone ?? null,
  };
}

export function mkContact(company_id: string, overrides: Partial<any> = {}) {
  return {
    id: overrides.id ?? 'ct-' + Math.random().toString(36).slice(2, 8),
    company_id,
    name: overrides.name ?? 'Alice',
    email: overrides.email ?? null,
    phone: overrides.phone ?? null,
    note: overrides.note ?? null,
  };
}

export function mkJob(overrides: Partial<any> = {}) {
  return {
    id: overrides.id ?? 'j-' + Math.random().toString(36).slice(2, 8),
    title: overrides.title ?? 'Engineer',
    description: overrides.description ?? null,
    note: overrides.note ?? null,
    status: overrides.status ?? 'applied',
    company_id: overrides.company_id ?? null,
    contact_id: overrides.contact_id ?? null,
    salary_min: overrides.salary_min ?? null,
    salary_max: overrides.salary_max ?? null,
    salary_target: overrides.salary_target ?? null,
    salary_currency: overrides.salary_currency ?? 'EUR',
    salary_period: overrides.salary_period ?? 'year',
    work_mode: overrides.work_mode ?? null,
    remote_ratio: overrides.remote_ratio ?? null,
    seniority: overrides.seniority ?? null,
    employment_type: overrides.employment_type ?? null,
    contract_type: overrides.contract_type ?? null,
    start_date: overrides.start_date ?? null,
    deadline_date: overrides.deadline_date ?? null,
    source_url: overrides.source_url ?? null,
    application_channel: overrides.application_channel ?? null,
    referral: overrides.referral ?? 0,
  };
}
