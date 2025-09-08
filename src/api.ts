import express, { Router, type Request, type Response } from 'express';
import type { Statements } from './statements';
import {
  companiesToCsv,
  jobRowToVm,
  companyRowToVm,
  contactRowToVm,
  requestToJob,
  requestToCompany,
  requestToContact,
  formatJobForClipboard,
} from './helpers';
import {
  fetchAndParseGlassdoor,
  parseGlassdoorHtml,
} from './importers/glassdoor';

export function createApiRouter(s: Statements): Router {
  const api = Router();

  // JSON-Parser nur für die API
  api.use(express.json({ limit: '2mb' }));

  /* ---------- HEALTH ---------- */
  api.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  /* ---------- JOBS ---------- */
  // List
  api.get('/jobs', (req: Request, res: Response) => {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const status =
      typeof req.query.status === 'string' ? (req.query.status as any) : '';
    const sort =
      typeof req.query.sort === 'string' ? (req.query.sort as any) : '';
    const rows = s.listJobs({ query: q, status, sort });
    res.json({ ok: true, data: rows.map(jobRowToVm) });
  });

  // Create
  api.post('/jobs', (req, res) => {
    const rec = requestToJob(req.body);
    if (!rec.title)
      return res
        .status(400)
        .json({ ok: false, error: 'title ist erforderlich' });
    s.insertJob(rec);
    res.status(201).json({ ok: true, data: s.getJobJoinedById(rec.id) ?? rec });
  });

  // Read (joined)
  api.get('/jobs/:id', (req, res) => {
    const joined = s.getJobJoinedById(String(req.params.id));
    if (!joined) return res.status(404).json({ ok: false, error: 'not_found' });
    res.json({ ok: true, data: jobRowToVm(joined) });
  });

  // Update (PATCH = partiell; Body wird mit aktuellem Datensatz gemerged)
  api.patch('/jobs/:id', (req, res) => {
    const row = s.getJobById(String(req.params.id));
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
    const currentVm = jobRowToVm({ ...(row as any) });
    const merged = requestToJob(req.body, currentVm);
    s.updateJob(merged);
    res.json({ ok: true, data: s.getJobJoinedById(merged.id) ?? merged });
  });

  // Delete
  api.delete('/jobs/:id', (req, res) => {
    s.deleteJob(String(req.params.id));
    res.json({ ok: true });
  });

  // Toggle applied/answer
  api.post('/jobs/:id/toggle', (req, res) => {
    const id = String(req.params.id);
    const field = String(req.body?.field || '');
    const row = s.getJobById(id);
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });

    const vm = jobRowToVm({ ...(row as any) });
    if (field === 'applied') vm.applied = !vm.applied;
    else if (field === 'answer') vm.answer = !vm.answer;
    else return res.status(400).json({ ok: false, error: 'unknown_field' });

    s.updateJob(requestToJob({}, vm));
    res.json({ ok: true, data: s.getJobJoinedById(id) ?? jobRowToVm(vm) });
  });

  // Clipboard (Markdown)
  api.get('/jobs/:id/clipboard', (req, res) => {
    const id = String(req.params.id);
    const joined = s.getJobJoinedById(id);
    if (!joined) return res.status(404).type('text/plain').send('Not found');
    res.type('text/plain').send(formatJobForClipboard(joined));
  });

  /* ---------- COMPANIES ---------- */
  // List
  api.get('/companies', (_req, res) => {
    const companies = s.listCompanies().map(companyRowToVm);
    res.json({ ok: true, data: companies });
  });

  // Create
  api.post('/companies', (req, res) => {
    const company = requestToCompany(req.body);
    if (!company.name)
      return res
        .status(400)
        .json({ ok: false, error: 'name ist erforderlich' });
    try {
      s.insertCompany(company);
      const created = s.getCompanyById(company.id);
      res
        .status(201)
        .json({ ok: true, data: created ? companyRowToVm(created) : company });
    } catch {
      res.status(409).json({ ok: false, error: 'duplicate_name' });
    }
  });

  // Read
  api.get('/companies/:id', (req, res) => {
    const row = s.getCompanyById(String(req.params.id));
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
    const contacts = s.listContactsForCompany(row.id).map(contactRowToVm);
    res.json({ ok: true, data: { company: companyRowToVm(row), contacts } });
  });

  // Update (PATCH)
  api.patch('/companies/:id', (req, res) => {
    const orig = s.getCompanyById(String(req.params.id));
    if (!orig) return res.status(404).json({ ok: false, error: 'not_found' });
    const next = requestToCompany(req.body, companyRowToVm(orig) as any);
    next.id = orig.id;
    try {
      s.updateCompany(next);
      const updated = s.getCompanyById(orig.id);
      res.json({ ok: true, data: updated ? companyRowToVm(updated) : next });
    } catch {
      res.status(409).json({ ok: false, error: 'duplicate_name' });
    }
  });

  // Delete
  api.delete('/companies/:id', (req, res) => {
    s.deleteCompany(String(req.params.id));
    res.json({ ok: true });
  });

  // CSV Export
  api.get('/companies.csv', (_req, res) => {
    const csv = companiesToCsv(s.listCompanies());
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="companies.csv"',
    );
    res.send(csv);
  });

  /* ---------- CONTACTS (unter Company) ---------- */
  api.get('/companies/:id/contacts', (req, res) => {
    const companyId = String(req.params.id);
    if (!s.getCompanyById(companyId))
      return res.status(404).json({ ok: false, error: 'company_not_found' });
    const contacts = s.listContactsForCompany(companyId).map(contactRowToVm);
    res.json({ ok: true, data: contacts });
  });

  api.post('/companies/:id/contacts', (req, res) => {
    const companyId = String(req.params.id);
    if (!s.getCompanyById(companyId))
      return res.status(404).json({ ok: false, error: 'company_not_found' });
    const contact = requestToContact(req.body, companyId);
    s.insertContact(contact);
    res.status(201).json({ ok: true, data: contactRowToVm(contact as any) });
  });

  api.patch('/companies/:id/contacts/:contactId', (req, res) => {
    const companyId = String(req.params.id);
    const contactId = String(req.params.contactId);
    if (!s.getCompanyById(companyId))
      return res.status(404).json({ ok: false, error: 'company_not_found' });
    s.updateContact({
      id: contactId,
      company_id: companyId,
      name: (req.body.contactName || '').trim(),
      email: (req.body.contactEmail || '').trim(),
      phone: (req.body.contactPhone || '').trim(),
      note: (req.body.contactNote || '').trim(),
    } as any);
    const updated = s.getContactById(contactId);
    res.json({
      ok: true,
      data: updated ? contactRowToVm(updated) : { id: contactId },
    });
  });

  api.delete('/companies/:id/contacts/:contactId', (req, res) => {
    s.deleteContact(String(req.params.contactId));
    res.json({ ok: true });
  });

  /* ---------- IMPORT (Glassdoor) ---------- */
  api.post('/import/glassdoor', async (req, res) => {
    try {
      const html = typeof req.body?.html === 'string' ? req.body.html : '';
      const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
      if (html) {
        const data = parseGlassdoorHtml(html, url || undefined);
        return res.json({ ok: true, data });
      }
      if (!url)
        return res
          .status(400)
          .json({ ok: false, error: 'url oder html erforderlich' });

      try {
        const data = await fetchAndParseGlassdoor(url);
        return res.json({ ok: true, data });
      } catch (e: any) {
        return res.status(502).json({
          ok: false,
          error: `Abruf fehlgeschlagen (${e?.message || 'Fetch-Fehler'})`,
        });
      }
    } catch (e: any) {
      return res
        .status(500)
        .json({ ok: false, error: e?.message || 'Fehler beim Import' });
    }
  });

  return api;
}

export default createApiRouter;
