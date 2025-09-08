import { v4 as uuidv4 } from 'uuid';
import type {
  Company,
  Contact,
  JobJoinedRow,
  JobRecord,
  JobViewModel,
  SalaryPeriod,
  WorkMode,
  Seniority,
  EmploymentType,
  ContractType,
} from './types';

const str = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
};
const num = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const flag01 = (v: unknown): 0 | 1 =>
  v === 1 || v === '1' || v === true || v === 'on' ? 1 : 0;

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
const get = (x: unknown): string =>
  typeof x === 'string' ? x.trim() : (x as string) || '';
function safeJson(s: string): string | undefined {
  if (!s) return undefined;
  try {
    JSON.parse(s);
    return s;
  } catch {
    return undefined;
  }
}

export function requestToCompany(
  body: Record<string, unknown>,
  current?: Company,
): Company {
  return {
    id: current ? current.id : uuidv4(),
    name: get(body.companyName),
    website: get(body.companyWebsite),
    street: get(body.companyStreet),
    city: get(body.companyCity),
    note: get(body.companyNote),
    linkedin_url: get(body.companyLinkedIn),
    glassdoor_url: get(body.companyGlassdoor),
    stepstone_url: get(body.companyStepstone),
    other_links_json: safeJson(get(body.companyOtherLinksJson)), // textarea mit JSON
    industry: get(body.companyIndustry),
    size_range: get(body.companySizeRange),
    hiring_page: get(body.companyHiringPage),
    career_email: get(body.companyCareerEmail),
    phone: get(body.companyPhone),
  };
}

export function requestToContact(
  body: Record<string, unknown>,
  companyId: string,
  current?: Contact,
): Contact {
  return {
    id: current ? current.id : uuidv4(),
    company_id: companyId,
    name: get(body.contactName),
    email: get(body.contactEmail),
    phone: get(body.contactPhone || body.contactTelephone),
    note: get(body.contactNote),
  };
}

export function requestToJob(
  body: any,
  current?: Partial<JobViewModel>,
): JobRecord {
  const id = current?._id ?? str(body.id) ?? uuidv4();

  // Company/Contact: priorisiere POST body, falle sonst auf current zurück
  const company_id = str(body.companyId) ?? current?.company_id ?? null;
  const contact_id = str(body.contactId) ?? current?.contact_id ?? null;

  return {
    id,
    title: (str(body.jobTitle) ?? '').trim(), // required upstream

    description: str(body.jobDescription),
    note: str(body.jobNote),

    applied: flag01(body.applied ?? current?.applied ?? false),
    answer: flag01(body.answer ?? current?.answer ?? false),

    company_id,
    contact_id,

    salary_min: num(body.salaryMin),
    salary_max: num(body.salaryMax),
    salary_target: num(body.salaryTarget),
    salary_currency: str(body.salaryCurrency),
    salary_period: asPeriod(body.salaryPeriod),

    work_mode: asWorkMode(body.workMode),
    remote_ratio: num(body.remoteRatio),

    seniority: asSeniority(body.seniority),
    employment_type: asEmployment(body.employmentType),
    contract_type: asContract(body.contractType),

    start_date: str(body.startDate),
    deadline_date: str(body.deadlineDate),
    source_url: str(body.jobSource),
    application_channel: str(body.applicationChannel),
    referral: flag01(body.referral ?? current?.referral ?? false),
  };
}

export function companyRowToVm(r: any) {
  return {
    _id: String(r.id),
    name: r.name ?? '',
    website: r.website ?? '',
    city: r.city ?? '',
    street: r.street ?? '',
    note: r.note ?? '',
    linkedin_url: r.linkedin_url ?? null,
    glassdoor_url: r.glassdoor_url ?? null,
    stepstone_url: r.stepstone_url ?? null,
    hiring_page: r.hiring_page ?? null,
    industry: r.industry ?? null,
    size_range: r.size_range ?? null,
    career_email: r.career_email ?? null,
    phone: r.phone ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export function contactRowToVm(r: any) {
  return {
    _id: String(r.id),
    company_id: String(r.company_id),
    name: r.name ?? '',
    email: r.email ?? '',
    phone: r.phone ?? '',
    note: r.note ?? '',
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export function jobRowToVm(row: any): JobViewModel {
  return {
    _id: String(row.id),
    title: String(row.title),

    description: (row.description ?? '') as string,
    note: (row.note ?? '') as string,

    applied: !!row.applied,
    answer: !!row.answer,

    company_id: row.company_id ?? null,
    contact_id: row.contact_id ?? null,

    salary_min: row.salary_min ?? null,
    salary_max: row.salary_max ?? null,
    salary_target: row.salary_target ?? null,
    salary_currency: row.salary_currency ?? null,
    salary_period: (row.salary_period ?? null) as SalaryPeriod | null,

    work_mode: (row.work_mode ?? null) as WorkMode | null,
    remote_ratio: row.remote_ratio ?? null,
    seniority: (row.seniority ?? null) as Seniority | null,
    employment_type: (row.employment_type ?? null) as EmploymentType | null,
    contract_type: (row.contract_type ?? null) as ContractType | null,

    start_date: row.start_date ?? null,
    deadline_date: row.deadline_date ?? null,
    source_url: row.source_url ?? null,
    application_channel: row.application_channel ?? null,
    referral: !!row.referral,

    company: {
      name: row.company_name ?? '',
      website: row.company_website ?? '',
      city: row.company_city ?? '',
      street: row.company_street ?? undefined,
      note: row.company_note ?? undefined,
      // optionale Felder falls vorhanden (schaden nicht)
      linkedin_url: row.linkedin_url ?? null,
      glassdoor_url: row.glassdoor_url ?? null,
      stepstone_url: row.stepstone_url ?? null,
      hiring_page: row.hiring_page ?? null,
      industry: row.industry ?? null,
      size_range: row.size_range ?? null,
      career_email: row.career_email ?? null,
      phone: row.phone ?? null,
    },

    contact: {
      name: row.contact_name ?? '',
      email: row.contact_email ?? '',
      phone: row.contact_phone ?? '',
      note: row.contact_note ?? undefined,
    },

    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function formatJobForClipboard(j: JobJoinedRow): string {
  const lines: string[] = [];
  const money = (
    n?: number | null,
    cur?: string | null,
    per?: string | null,
  ) =>
    n != null
      ? `${n.toLocaleString()} ${cur || 'EUR'} / ${per === 'month' ? 'Monat' : 'Jahr'}`
      : '—';

  lines.push(`# ${j.title}`);
  if (j.description) {
    lines.push('', '## Beschreibung', j.description);
  }
  if (j.note) {
    lines.push('', '## Notizen', j.note);
  }
  lines.push('', '## Unternehmen');
  lines.push(`- Name: ${j.company_name || '—'}`);
  if (j.company_website) lines.push(`- Website: ${j.company_website}`);
  lines.push('', '## Kontakt');
  lines.push(`- Name: ${j.contact_name || '—'}`);
  if (j.contact_email) lines.push(`- E-Mail: ${j.contact_email}`);
  if (j.contact_phone) lines.push(`- Telefon: ${j.contact_phone}`);
  lines.push('', '## Status');
  lines.push(`- Angeschrieben: ${j.applied ? 'Ja' : 'Nein'}`);
  lines.push(`- Antwort: ${j.answer ? 'Ja' : 'Nein'}`);
  lines.push('', '## Rahmen & Vergütung');
  lines.push(
    `- Spanne: ${money((j as any).salary_min, (j as any).salary_currency, (j as any).salary_period)} - ${money((j as any).salary_max, (j as any).salary_currency, (j as any).salary_period)}`,
  );
  lines.push(
    `- Ziel: ${money((j as any).salary_target, (j as any).salary_currency, (j as any).salary_period)}`,
  );
  if ((j as any).work_mode)
    lines.push(
      `- Arbeitsmodus: ${(j as any).work_mode}${(j as any).remote_ratio ? ` (${(j as any).remote_ratio}% Remote)` : ''}`,
    );
  if ((j as any).seniority) lines.push(`- Seniorität: ${(j as any).seniority}`);
  if ((j as any).employment_type)
    lines.push(`- Anstellung: ${(j as any).employment_type}`);
  if ((j as any).contract_type)
    lines.push(`- Vertrag: ${(j as any).contract_type}`);
  if ((j as any).start_date) lines.push(`- Start: ${(j as any).start_date}`);
  if ((j as any).deadline_date)
    lines.push(`- Frist: ${(j as any).deadline_date}`);
  if ((j as any).application_channel)
    lines.push(`- Kanal: ${(j as any).application_channel}`);
  if ((j as any).source_url)
    lines.push(`- Ausschreibung: ${(j as any).source_url}`);
  if ((j as any).referral != null)
    lines.push(`- Referral: ${(j as any).referral ? 'Ja' : 'Nein'}`);
  lines.push('', `ID: ${j.id}`);
  return lines.join('\n');
}

export function companiesToCsv(rows: Company[]): string {
  const header = [
    'name',
    'website',
    'city',
    'linkedin',
    'glassdoor',
    'stepstone',
    'size_range',
  ];
  const out: string[] = [header.join(',')];

  const q = (s: string | null | undefined) => {
    if (s == null) return '';
    const v = String(s).replace(/"/g, '""');
    // Felder immer quoten: sicher für Komma/Zeilenumbrüche
    return `"${v}"`;
  };

  for (const r of rows) {
    out.push(
      [
        q(r.name ?? ''),
        q(r.website ?? ''),
        q(r.city ?? ''),
        q(r.linkedin_url ?? ''),
        q(r.glassdoor_url ?? ''),
        q(r.stepstone_url ?? ''),
        q(r.size_range ?? ''),
      ].join(','),
    );
  }

  // BOM für Excel-Kompatibilität beibehalten
  return '\uFEFF' + out.join('\n');
}
