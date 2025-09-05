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

function toNum(x: string): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

// Hilfsfunktion: erlaubt leeres oder valides JSON
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
  body: Record<string, unknown>,
  current?: JobViewModel,
): JobRecord {
  return {
    id: current ? current._id : uuidv4(),
    title: get(body.jobTitle),
    description: get(body.jobDescription),
    note: get(body.jobNote),
    applied: current ? (current.applied ? 1 : 0) : 0,
    answer: current ? (current.answer ? 1 : 0) : 0,
    company_id: get(body.companyId) || (current?.company_id ?? null),
    contact_id: get(body.contactId) || (current?.contact_id ?? null),

    salary_min: toNum(get(body.salaryMin)),
    salary_max: toNum(get(body.salaryMax)),
    salary_target: toNum(get(body.salaryTarget)),
    salary_currency: get(body.salaryCurrency) || 'EUR',
    salary_period: (get(body.salaryPeriod) as any) || 'year',

    work_mode: (get(body.workMode) as any) || null,
    remote_ratio: toNum(get(body.remoteRatio)),
    seniority: (get(body.seniority) as any) || null,
    employment_type: (get(body.employmentType) as any) || null,
    contract_type: (get(body.contractType) as any) || null,

    start_date: get(body.startDate) || null,
    deadline_date: get(body.deadlineDate) || null,
    source_url: get(body.jobSource) || null,
    application_channel: get(body.applicationChannel) || null,
    referral: get(body.referral) ? 1 : 0,
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
