import { v4 as uuidv4 } from 'uuid';
import type {
  Company,
  Contact,
  JobJoinedRow,
  JobRecord,
  JobViewModel,
} from './types';

const get = (x: unknown): string =>
  typeof x === 'string' ? x.trim() : (x as string) || '';
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const numOrNull = (v: unknown) => {
  if (v === null || v === undefined) return null;
  const s = typeof v === 'string' ? v.trim() : v;
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const idOrNull = (v: unknown) => {
  const t = str(v);
  return t ? t : null; // leere Option -> null (für FK)
};
const bool01 = (v: unknown) => {
  // akzeptiert Checkbox "on", "1", true/false
  if (v === true || v === 'on' || v === '1' || v === 1) return 1 as const;
  if (v === false || v === '0' || v === 0) return 0 as const;
  return 0 as const;
};
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
  return {
    id: current?.id ?? (body.id && str(body.id)) ?? uuidv4(),
    title: str(body.jobTitle),
    description: str(body.jobDescription) || null,
    note: str(body.jobNote) || null,

    // Flags: aus Formular oder Current
    applied:
      body.applied !== undefined
        ? bool01(body.applied)
        : current?.applied
          ? 1
          : 0,
    answer:
      body.answer !== undefined ? bool01(body.answer) : current?.answer ? 1 : 0,

    // Zuordnung
    company_id:
      idOrNull(body.companyId) ??
      (current?.company && current.company._id ? current.company._id : null),
    contact_id:
      idOrNull(body.contactId) ??
      (current?.contact && (current as any).contact._id
        ? (current as any).contact._id
        : null),

    // Gehalt & Meta - NaN->null
    salary_min: numOrNull(body.salaryMin),
    salary_max: numOrNull(body.salaryMax),
    salary_target: numOrNull(body.salaryTarget),
    salary_currency: str(body.salaryCurrency) || null,
    salary_period: str(body.salaryPeriod) || null, // "year" | "month" | null

    work_mode: str(body.workMode) || null,
    remote_ratio: numOrNull(body.remoteRatio),
    seniority: str(body.seniority) || null,
    employment_type: str(body.employmentType) || null,
    contract_type: str(body.contractType) || null,

    start_date: str(body.startDate) || null,
    deadline_date: str(body.deadlineDate) || null,
    source_url: str(body.jobSource) || null,
    application_channel: str(body.applicationChannel) || null,
    referral:
      body.referral !== undefined
        ? bool01(body.referral)
        : current?.referral
          ? 1
          : 0,
  };
}

export function companyRowToVm(r: Company) {
  return {
    _id: r.id,
    name: r.name || '',
    website: r.website || '',
    street: r.street || '',
    city: r.city || '',
    note: r.note || '',
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export function contactRowToVm(r: Contact) {
  return {
    _id: r.id,
    company_id: r.company_id,
    name: r.name || '',
    email: r.email || '',
    phone: r.phone || '',
    note: r.note || '',
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export function jobRowToVm(r: JobJoinedRow): JobViewModel {
  return {
    _id: r.id,
    title: r.title,
    description: r.description || '',
    note: r.note || '',
    applied: !!r.applied,
    answer: !!r.answer,
    company_id: r.company_id ?? null,
    contact_id: r.contact_id ?? null,
    company: {
      name: r.company_name || '',
      website: r.company_website || '',
      city: r.company_city || '',
    },
    contact: {
      name: r.contact_name || '',
      email: r.contact_email || '',
      phone: r.contact_phone || '',
    },
    created_at: r.created_at,
    updated_at: r.updated_at,
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

// RFC4180-ish CSV with UTF-8 BOM (Excel-friendly)
function csvEscape(val: unknown): string {
  const s = (val ?? '').toString();
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function companiesToCsv(rows: Company[]): string {
  const header = [
    'name',
    'website',
    'city',
    'linkedin_url',
    'glassdoor_url',
    'stepstone_url',
    'size_range',
  ];
  const lines = [header.join(',')];

  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.name),
        csvEscape(r.website),
        csvEscape(r.city),
        csvEscape(r.linkedin_url),
        csvEscape(r.glassdoor_url),
        csvEscape(r.stepstone_url),
        csvEscape(r.size_range),
      ].join(','),
    );
  }

  // Prepend BOM for Excel
  return '\uFEFF' + lines.join('\r\n');
}
