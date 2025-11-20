import express, { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  companiesToCsv,
  companyRowToVm,
  contactRowToVm,
  formatJobForClipboard,
  jobRowToVm,
  mergeCompanyFields,
  parseCompaniesCsv,
  requestToCompany,
  requestToContact,
  requestToJob,
} from './helpers';
import {
  fetchAndParseGlassdoor,
  parseGlassdoorHtml,
} from './importers/glassdoor';
import { parseGlassdoorJobHtml } from './importers/glassdoorJob';
import type { Statements } from './statements';

export function createApiRouter(s: Statements): Router {
  const api = Router();

  // JSON-Parser nur für API
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

  // Read
  api.get('/jobs/:id', (req, res) => {
    const joined = s.getJobJoinedById(String(req.params.id));
    if (!joined)
      return res
        .status(404)
        .json({ ok: false, error: 'not_found', title: 'Not Found' });
    res.json(jobRowToVm(joined));
  });

  // Update
  api.patch('/jobs/:id', (req, res) => {
    const row = s.getJobById(String(req.params.id));
    if (!row)
      return res
        .status(404)
        .json({ ok: false, error: 'not_found', title: 'Not Found' });
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

  // Clipboard
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

  // CSV IMPORT
  api.post(
    '/companies.csv',
    express.text({
      type: ['text/*', 'application/octet-stream', 'application/csv'],
      limit: '5mb',
    }),
    (req, res) => {
      const csv = (req.body ?? '').toString();
      if (!csv.trim())
        return res.status(400).json({ ok: false, error: 'empty_csv' });

      const rows = parseCompaniesCsv(csv);
      const result = {
        ok: true,
        summary: { created: 0, updated: 0, skipped: 0, errors: 0 },
        details: [] as Array<{
          action: 'created' | 'updated' | 'skipped' | 'error';
          id?: string;
          name?: string;
          reason?: string;
        }>,
      };

      for (const r of rows) {
        try {
          // 1) Match per ID
          let target = r.id ? s.getCompanyById(r.id) : undefined;

          // 2) Fallback: Match per Name (case-insensitive, via UNIQUE COLLATE NOCASE)
          if (!target) {
            target = s.getCompanyByName(r.name);
          }

          if (!target) {
            // Neu anlegen
            const newRow = {
              id: r.id || uuidv4(),
              name: r.name,
              website: r.website ?? null,
              city: r.city ?? null,
              linkedin_url: r.linkedin_url ?? null,
              glassdoor_url: r.glassdoor_url ?? null,
              stepstone_url: r.stepstone_url ?? null,
              size_range: r.size_range ?? null,
              // Extras in Notiz anhängen
              note: r._extraNote ?? null,
            } as any;

            s.insertCompany(newRow);
            result.summary.created++;
            result.details.push({
              action: 'created',
              id: newRow.id,
              name: newRow.name,
            });
          } else {
            // Merge bestehend + CSV (nur nicht-leere Felder)
            const merged = mergeCompanyFields(target, {
              name: r.name, // falls Groß-/Kleinschreibung vereinheitlicht werden soll
              website: r.website,
              city: r.city,
              linkedin_url: r.linkedin_url,
              glassdoor_url: r.glassdoor_url,
              stepstone_url: r.stepstone_url,
              size_range: r.size_range,
              note: r._extraNote
                ? (target.note ? target.note + '\n\n' : '') + r._extraNote
                : target.note,
            });

            // Nur updaten, wenn sich etwas ändert
            const changed =
              JSON.stringify({
                ...target,
                created_at: undefined,
                updated_at: undefined,
              }) !==
              JSON.stringify({
                ...merged,
                created_at: undefined,
                updated_at: undefined,
              });

            if (changed) {
              s.updateCompany(merged as any);
              result.summary.updated++;
              result.details.push({
                action: 'updated',
                id: merged.id,
                name: merged.name,
              });
            } else {
              result.summary.skipped++;
              result.details.push({
                action: 'skipped',
                id: target.id,
                name: target.name,
                reason: 'no_changes',
              });
            }
          }
        } catch (e: any) {
          result.summary.errors++;
          result.details.push({
            action: 'error',
            name: r.name,
            reason: e?.message || 'import_error',
          });
        }
      }

      return res.json(result);
    },
  );

  /* ---------- CONTACTS ---------- */
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

  /* ---------- IMPORT ---------- */
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

  // Glassdoor Job Import
  api.post('/import/glassdoor-job', async (req, res) => {
    try {
      let html: string | undefined;

      // 1) text/html oder text/* → Body ist bereits der HTML-String
      const ct = (req.headers['content-type'] || '').toLowerCase();
      if (ct.startsWith('text/')) {
        html = typeof req.body === 'string' ? req.body : undefined;
      }

      // 2) application/json → { html: string } oder { url, html }
      if (!html && req.body && typeof req.body === 'object') {
        if (typeof (req.body as any).html === 'string') {
          html = (req.body as any).html;
        }
      }

      if (!html || !html.trim()) {
        return res.status(400).json({ ok: false, error: 'html required' });
      }

      const data = parseGlassdoorJobHtml(html);
      return res.json({ ok: true, data });
    } catch (err: any) {
      return res
        .status(500)
        .json({ ok: false, error: err?.message || 'parse failed' });
    }
  });

  return api;
}

export default createApiRouter;
