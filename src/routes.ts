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

export default function registerRoutes(app: Express, s: Statements) {
  // Jobs: list
  app.get('/', (req: Request, res: Response) => {
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

  // Jobs: new (Form) – mit Company/Kontakt-Auswahl
  app.get('/new', (_req, res) => {
    const msg = null;
    const companies = s.listCompanies(); // Company[]
    // Kontakte je Unternehmen laden
    const contactsByCompany = Object.fromEntries(
      companies.map((c) => [c.id, s.listContactsForCompany(c.id)]),
    );
    res.render('new', { msg, companies, contactsByCompany });
  });

  // Jobs: new/create
  app.post('/new', (req: Request, res: Response) => {
    const record = requestToJob(req.body);
    if (!record.title)
      return res.redirect(
        '/new?msg=' + encodeURIComponent('Titel ist erforderlich'),
      );
    s.insertJob(record);
    res.redirect(`/detail/${record.id}`);
  });

  // Jobs: detail (→ nutzt getJobJoinedById statt list().find())
  app.get('/detail/:id', (req: Request, res: Response) => {
    const id = String(req.params.id);
    const joined = s.getJobJoinedById(id);
    if (!joined)
      return res.redirect(
        '/?msg=' + encodeURIComponent('Kein Job zu dieser ID gefunden'),
      );
    const job = jobRowToVm(joined);
    const msg = typeof req.query.msg === 'string' ? req.query.msg : null;
    res.render('detail', { job, msg, renderMarkdown });
  });

  // Jobs: edit form (mit Company/Kontakt-Auswahl)
  app.get('/edit/:id', (req, res) => {
    const row = s.getJobById(String(req.params.id));
    if (!row)
      return res.redirect(
        '/?msg=' + encodeURIComponent('Kein Job zu dieser ID gefunden'),
      );

    // ViewModel für das Formular
    const job = jobRowToVm({ ...(row as any) });

    // Alle Companies + deren Kontakte laden
    const companies = s.listCompanies();
    const contactsByCompany = Object.fromEntries(
      companies.map((c) => [c.id, s.listContactsForCompany(c.id)]),
    );

    const msg = typeof req.query.msg === 'string' ? req.query.msg : null;
    res.render('edit', { job, msg, companies, contactsByCompany });
  });

  // Jobs: update
  app.post('/edit/:id', (req: Request, res: Response) => {
    const row = s.getJobById(String(req.params.id));
    if (!row)
      return res.redirect(
        '/?msg=' + encodeURIComponent('Kein Job zu dieser ID gefunden'),
      );
    const currentVm = jobRowToVm({ ...(row as any) });
    const record = requestToJob(req.body, currentVm);
    s.updateJob(record);
    res.redirect(`/detail/${record.id}`);
  });

  // Jobs: toggle
  app.get('/toggle/:id/:field', (req: Request, res: Response) => {
    const id = String(req.params.id);
    const row = s.getJobById(id);
    if (!row)
      return res.redirect(
        '/?msg=' + encodeURIComponent('Kein Job zu dieser ID gefunden'),
      );

    const vm = jobRowToVm({ ...(row as any) });
    if (req.params.field === 'applied') vm.applied = !vm.applied;
    else if (req.params.field === 'answer') vm.answer = !vm.answer;
    else
      return res.redirect(
        `/detail/${id}?msg=` + encodeURIComponent('Unbekanntes Feld'),
      );

    const updated = requestToJob({}, vm);
    s.updateJob(updated);
    res.redirect(`/detail/${id}`);
  });

  // Jobs: delete
  app.get('/delete/:id', (req: Request, res: Response) => {
    s.deleteJob(String(req.params.id));
    res.redirect('/');
  });

  // Companies: index (→ getypter Wrapper)
  app.get('/companies', (_req: Request, res: Response) => {
    const companies = s.listCompanies().map(companyRowToVm);
    res.render('companies_index', { companies });
  });

  // Companies: new
  app.get('/companies/new', (_req: Request, res: Response) => {
    res.render('companies_new', {});
  });

  // Companies: new/create
  app.post('/companies/new', (req: Request, res: Response) => {
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

    if (hasContact) {
      s.insertContact(requestToContact(req.body, company.id));
    }

    res.redirect(`/companies/${company.id}`);
  });

  // Companies: detail (→ getypter Wrapper)
  app.get('/companies/:id', (req: Request, res: Response) => {
    const row = s.getCompanyById(String(req.params.id));
    if (!row) return res.redirect('/companies');
    const company = companyRowToVm(row);
    const contacts = s.listContactsForCompany(company._id).map(contactRowToVm);
    res.render('company_detail', { company, contacts, renderMarkdown });
  });
}
