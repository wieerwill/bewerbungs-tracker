import type { Express, Request, Response } from 'express';
import type { Statements } from './statements';
import {
  companyRowToVm,
  contactRowToVm,
  jobRowToVm,
  requestToCompany,
  requestToContact,
  requestToJob,
  companiesToCsv,
  formatJobForClipboard,
} from './helpers';
import { renderMarkdown } from './markdown';

export default function registerRoutes(app: Express, s: Statements) {
  /* --- Compatibility redirects --- */
  app.get('/', (_req, res) => res.redirect(301, '/jobs'));
  app.get('/new', (_req, res) => res.redirect(301, '/jobs/new'));
  app.get('/detail/:id', (req, res) =>
    res.redirect(301, `/jobs/${req.params.id}`),
  );
  app.get('/edit/:id', (req, res) =>
    res.redirect(301, `/jobs/${req.params.id}/edit`),
  );
  app.get('/delete/:id', (req, res) =>
    res.redirect(301, `/jobs/${req.params.id}`),
  ); // handled via form DELETE now
  app.get(
    '/toggle/:id/:field',
    (req, res) => res.redirect(301, `/jobs/${req.params.id}`), // handled via POST now
  );

  /* ---------------- JOBS ---------------- */

  // list
  app.get('/jobs', (req: Request, res: Response) => {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const status =
      typeof req.query.status === 'string' ? (req.query.status as any) : '';
    const sort =
      typeof req.query.sort === 'string' ? (req.query.sort as any) : '';
    const msg = typeof req.query.msg === 'string' ? req.query.msg : null;

    const rows = s.listJobs({ query: q, status, sort });
    const jobs = rows.map(jobRowToVm);
    res.render('index', { jobs, msg, q, status, sort });
  });

  // new form (with company/contact dropdowns)
  app.get('/jobs/new', (_req, res) => {
    const companies = s.listCompanies();
    const contactsByCompany = Object.fromEntries(
      companies.map((c) => [c.id, s.listContactsForCompany(c.id)]),
    );
    res.render('new', { msg: null, companies, contactsByCompany });
  });

  // create
  app.post('/jobs', (req: Request, res: Response) => {
    const rec = requestToJob(req.body);
    if (!rec.title)
      return res.redirect(
        '/jobs/new?msg=' + encodeURIComponent('Titel ist erforderlich'),
      );
    s.insertJob(rec);
    res.redirect(`/jobs/${rec.id}`);
  });

  // detail
  app.get('/jobs/:id', (req: Request, res: Response) => {
    const id = String(req.params.id);
    const joined = s.getJobJoinedById(id);
    if (!joined)
      return res.redirect(
        '/jobs?msg=' + encodeURIComponent('Kein Job zu dieser ID gefunden'),
      );
    const job = jobRowToVm(joined);
    const msg = typeof req.query.msg === 'string' ? req.query.msg : null;
    res.render('detail', { job, msg, renderMarkdown });
  });

  // edit form
  app.get('/jobs/:id/edit', (req, res) => {
    const row = s.getJobById(String(req.params.id));
    if (!row)
      return res.redirect(
        '/jobs?msg=' + encodeURIComponent('Kein Job zu dieser ID gefunden'),
      );

    const job = jobRowToVm({ ...(row as any) });
    const companies = s.listCompanies();
    const contactsByCompany = Object.fromEntries(
      companies.map((c) => [c.id, s.listContactsForCompany(c.id)]),
    );
    const msg = typeof req.query.msg === 'string' ? req.query.msg : null;
    res.render('edit', { job, msg, companies, contactsByCompany });
  });

  // update (POST for simplicity)
  app.post('/jobs/:id', (req: Request, res: Response) => {
    const row = s.getJobById(String(req.params.id));
    if (!row)
      return res.redirect(
        '/jobs?msg=' + encodeURIComponent('Kein Job zu dieser ID gefunden'),
      );
    const currentVm = jobRowToVm({ ...(row as any) });
    const rec = requestToJob(req.body, currentVm);
    s.updateJob(rec);
    res.redirect(`/jobs/${rec.id}`);
  });

  // toggle (POST instead of GET)
  app.post('/jobs/:id/toggle/:field', (req: Request, res: Response) => {
    const id = String(req.params.id);
    const row = s.getJobById(id);
    if (!row)
      return res.redirect(
        '/jobs?msg=' + encodeURIComponent('Kein Job zu dieser ID gefunden'),
      );

    const vm = jobRowToVm({ ...(row as any) });
    if (req.params.field === 'applied') vm.applied = !vm.applied;
    else if (req.params.field === 'answer') vm.answer = !vm.answer;
    else
      return res.redirect(
        `/jobs/${id}?msg=` + encodeURIComponent('Unbekanntes Feld'),
      );

    const updated = requestToJob({}, vm);
    s.updateJob(updated);
    res.redirect(`/jobs/${id}`);
  });

  // delete (DELETE)
  app.delete('/jobs/:id', (req: Request, res: Response) => {
    s.deleteJob(String(req.params.id));
    res.redirect('/jobs');
  });

  /* ---------------- API ---------------- */

  app.get('/api/jobs/:id', (req, res) => {
    const id = String(req.params.id);
    const joined = s.getJobJoinedById(id);
    if (!joined) return res.status(404).json({ error: 'Not found' });

    if (req.query.format === 'markdown') {
      res.type('text/plain').send(formatJobForClipboard(joined));
    } else {
      res.json(joined);
    }
  });

  app.get('/api/companies.csv', (_req, res) => {
    const companies = s.listCompanies();
    const csv = companiesToCsv(companies);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="companies.csv"',
    );
    res.send(csv);
  });

  /* ---------------- COMPANIES ---------------- */

  app.get('/companies', (_req: Request, res: Response) => {
    const companies = s.listCompanies().map(companyRowToVm);
    res.render('companies_index', { companies });
  });

  app.get('/companies/new', (_req: Request, res: Response) => {
    res.render('companies_new');
  });

  app.post('/companies', (req: Request, res: Response) => {
    const company = requestToCompany(req.body);
    if (!company.name)
      return res.redirect(
        '/companies/new?msg=' +
          encodeURIComponent('Firmenname ist erforderlich'),
      );
    try {
      s.insertCompany(company);
    } catch {
      return res.redirect(
        '/companies/new?msg=' +
          encodeURIComponent('Unternehmen existiert bereits'),
      );
    }

    const hasContact =
      (req.body.contactName && String(req.body.contactName).trim()) ||
      (req.body.contactEmail && String(req.body.contactEmail).trim()) ||
      (req.body.contactPhone && String(req.body.contactPhone).trim()) ||
      (req.body.contactNote && String(req.body.contactNote).trim());

    if (hasContact) s.insertContact(requestToContact(req.body, company.id));
    res.redirect(`/companies/${company.id}`);
  });

  app.get('/companies/:id', (req: Request, res: Response) => {
    const row = s.getCompanyById(String(req.params.id));
    if (!row) return res.redirect('/companies');
    const company = companyRowToVm(row);
    const contacts = s.listContactsForCompany(company._id).map(contactRowToVm);
    res.render('company_detail', { company, contacts, renderMarkdown });
  });
}
