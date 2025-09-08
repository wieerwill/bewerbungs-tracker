import type { Express, Request, Response } from 'express';
import type { Statements } from './statements';
import {
  companyRowToVm,
  contactRowToVm,
  jobRowToVm,
  requestToCompany,
  requestToContact,
  requestToJob,
} from './helpers';
import { renderMarkdown } from './markdown';
import type { ListJobsParams } from './types';

const getStr = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : fallback;

function getEnum<T extends string>(
  v: unknown,
  allowed: readonly T[],
): T | undefined {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : undefined;
}

function qParams(req: Request): ListJobsParams {
  const status = getEnum(getStr(req.query.status), [
    '',
    'applied',
    'not-applied',
    'answered',
    'no-answer',
  ] as const);
  const sort = getEnum(getStr(req.query.sort), [
    '',
    'title',
    'company',
  ] as const);
  return {
    query: getStr(req.query.q, ''),
    status: (status ?? '') as ListJobsParams['status'],
    sort: (sort ?? '') as ListJobsParams['sort'],
  };
}

function redirectWithMsg(
  res: Response,
  to: string,
  msg?: string | null,
  code: 303 | 302 = 303,
) {
  const url = msg
    ? `${to}${to.includes('?') ? '&' : '?'}msg=${encodeURIComponent(msg)}`
    : to;
  return res.redirect(code, url);
}

type ToggleField = 'applied' | 'answer';

export default function registerRoutes(app: Express, s: Statements) {
  /* --- Legacy-redirects --- */
  app.get('/', (_req, res) => res.redirect(301, '/jobs'));

  /* ======================= JOBS ======================= */

  app.get('/jobs', (req, res) => {
    const { query, status, sort } = qParams(req);
    const msg = getStr(req.query.msg, null as unknown as string | undefined);
    const rows = s.listJobs({ query, status, sort });
    const jobs = rows.map(jobRowToVm);
    res.render('job_index', { jobs, msg, q: query, status, sort });
  });

  app.get('/jobs/new', (_req, res) => {
    const companies = s.listCompanies();
    const contactsByCompany = Object.fromEntries(
      companies.map((c) => [c.id, s.listContactsForCompany(c.id)]),
    );
    res.render('job_new', { msg: null, companies, contactsByCompany });
  });

  app.post('/jobs', (req, res) => {
    const rec = requestToJob(req.body);
    if (!rec.title) {
      return redirectWithMsg(res, '/jobs/new', 'Titel ist erforderlich');
    }
    s.insertJob(rec);
    return res.redirect(303, `/jobs/${rec.id}`);
  });

  app.get('/jobs/:id', (req, res) => {
    const id = String(req.params.id);
    const joined = s.getJobJoinedById(id);
    if (!joined)
      return redirectWithMsg(res, '/jobs', 'Kein Job zu dieser ID gefunden');
    const job = jobRowToVm(joined);
    const msg = getStr(req.query.msg, null as unknown as string | undefined);
    res.render('job_detail', { job, msg, renderMarkdown });
  });

  app.get('/jobs/:id/edit', (req, res) => {
    const row = s.getJobById(String(req.params.id));
    if (!row)
      return redirectWithMsg(res, '/jobs', 'Kein Job zu dieser ID gefunden');
    const job = jobRowToVm({ ...(row as any) });
    const companies = s.listCompanies();
    const contactsByCompany = Object.fromEntries(
      companies.map((c) => [c.id, s.listContactsForCompany(c.id)]),
    );
    const msg = getStr(req.query.msg, null as unknown as string | undefined);
    res.render('job_edit', { job, msg, companies, contactsByCompany });
  });

  app.post('/jobs/:id', (req, res) => {
    const row = s.getJobById(String(req.params.id));
    if (!row)
      return redirectWithMsg(res, '/jobs', 'Kein Job zu dieser ID gefunden');
    const currentVm = jobRowToVm({ ...(row as any) });
    const rec = requestToJob(req.body, currentVm);
    s.updateJob(rec);
    return res.redirect(303, `/jobs/${rec.id}`);
  });

  app.post('/jobs/:id/toggle/:field', (req, res) => {
    const id = String(req.params.id);
    const field = String(req.params.field) as ToggleField;
    const row = s.getJobById(id);
    if (!row)
      return redirectWithMsg(res, '/jobs', 'Kein Job zu dieser ID gefunden');

    const vm = jobRowToVm({ ...(row as any) });
    if (field === 'applied') vm.applied = !vm.applied;
    else if (field === 'answer') vm.answer = !vm.answer;
    else return redirectWithMsg(res, `/jobs/${id}`, 'Unbekanntes Feld');

    s.updateJob(requestToJob({}, vm));
    return res.redirect(303, `/jobs/${id}`);
  });

  app.delete('/jobs/:id', (req, res) => {
    s.deleteJob(String(req.params.id));
    return res.redirect(303, '/jobs');
  });

  /* ======================= COMPANIES ======================= */

  app.get('/companies', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const companies = s.listCompanies({ query: q }).map(companyRowToVm);
    res.render('companies_index', { companies, q });
  });

  app.get('/companies/new', (_req, res) => {
    res.render('companies_new');
  });

  app.post('/companies', (req, res) => {
    const company = requestToCompany(req.body);
    if (!company.name) {
      return redirectWithMsg(
        res,
        '/companies/new',
        'Firmenname ist erforderlich',
      );
    }
    try {
      s.insertCompany(company);
    } catch {
      return redirectWithMsg(
        res,
        '/companies/new',
        'Unternehmen existiert bereits',
      );
    }

    const hasContact =
      (req.body.contactName && String(req.body.contactName).trim()) ||
      (req.body.contactEmail && String(req.body.contactEmail).trim()) ||
      (req.body.contactPhone && String(req.body.contactPhone).trim()) ||
      (req.body.contactNote && String(req.body.contactNote).trim());

    if (hasContact) s.insertContact(requestToContact(req.body, company.id));
    return res.redirect(303, `/companies/${company.id}`);
  });

  app.get('/companies/:id', (req, res) => {
    const row = s.getCompanyById(String(req.params.id));
    if (!row) return res.redirect(302, '/companies');
    const company = companyRowToVm(row);
    const contacts = s.listContactsForCompany(company._id).map(contactRowToVm);
    res.render('company_detail', { company, contacts, renderMarkdown });
  });

  app.get('/companies/:id/edit', (req, res) => {
    const row = s.getCompanyById(String(req.params.id));
    if (!row) return res.redirect(302, '/companies');
    const company = companyRowToVm(row);
    const contacts = s.listContactsForCompany(company._id).map(contactRowToVm);
    res.render('company_edit', { company, contacts, renderMarkdown });
  });

  app.post('/companies/:id', (req, res) => {
    const orig = s.getCompanyById(String(req.params.id));
    if (!orig) return res.redirect(302, '/companies');

    const next = requestToCompany(req.body, companyRowToVm(orig) as any);
    next.id = orig.id; // safety

    try {
      s.updateCompany(next);
    } catch {
      return redirectWithMsg(
        res,
        `/companies/${orig.id}/edit`,
        'Name bereits vergeben',
      );
    }
    return res.redirect(303, `/companies/${orig.id}`);
  });

  app.post('/companies/:id/contacts', (req, res) => {
    const companyId = String(req.params.id);
    if (!s.getCompanyById(companyId)) return res.redirect(302, '/companies');
    s.insertContact(requestToContact(req.body, companyId));
    return res.redirect(303, `/companies/${companyId}/edit`);
  });

  app.post('/companies/:id/contacts/:contactId', (req, res) => {
    const companyId = String(req.params.id);
    const contactId = String(req.params.contactId);
    if (!s.getCompanyById(companyId)) return res.redirect(302, '/companies');

    s.updateContact({
      id: contactId,
      company_id: companyId,
      name: getStr(req.body.contactName).trim() || null,
      email: getStr(req.body.contactEmail).trim() || null,
      phone: getStr(req.body.contactPhone).trim() || null,
      note: getStr(req.body.contactNote).trim() || null,
    } as any);

    return res.redirect(303, `/companies/${companyId}/edit`);
  });

  app.delete('/companies/:id/contacts/:contactId', (req, res) => {
    s.deleteContact(String(req.params.contactId));
    return res.redirect(303, `/companies/${String(req.params.id)}/edit`);
  });

  app.delete('/companies/:id', (req, res) => {
    const id = String(req.params.id);
    const row = s.getCompanyById(id);
    if (!row) {
      return redirectWithMsg(
        res,
        '/companies',
        'Unternehmen nicht gefunden',
        302,
      );
    }
    // Kontakte werden per CASCADE gelöscht; Jobs behalten wir (company_id/contact_id -> NULL handled im DB-Layer/Schema).
    s.deleteCompany(id);
    return redirectWithMsg(res, '/companies', 'Unternehmen gelöscht');
  });
}
