import { describe, it, expect } from 'vitest';
import { makeApiApp, http } from './api.util';

describe('api - health', () => {
  it('GET /api/health returns ok', async () => {
    const { app } = makeApiApp();
    const res = await http(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('api - companies', () => {
  it('creates, reads, updates, deletes a company', async () => {
    const { app } = makeApiApp();

    // Create
    const create = await http(app)
      .post('/api/companies')
      .send({ companyName: 'ACME GmbH' });
    expect(create.status).toBe(201);
    expect(create.body.ok).toBe(true);
    const id = create.body.data._id as string;
    expect(id).toBeTruthy();

    // Duplicate -> 409
    const dupe = await http(app)
      .post('/api/companies')
      .send({ companyName: 'acme gmbh' });
    expect(dupe.status).toBe(409);

    // Read
    const get = await http(app).get(`/api/companies/${id}`);
    expect(get.status).toBe(200);
    expect(get.body.data.company.name).toBe('ACME GmbH');

    // Update (PATCH)
    const patch = await http(app).patch(`/api/companies/${id}`).send({
      companyWebsite: 'https://acme.example',
      companyCity: 'Berlin',
      companyIndustry: 'Software',
      companySizeRange: '200-500',
    });
    expect(patch.status).toBe(200);
    expect(patch.body.data.website).toBe('https://acme.example');
    expect(patch.body.data.city).toBe('Berlin');

    // List
    const list = await http(app).get('/api/companies');
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(1);

    // CSV
    const csv = await http(app).get('/api/companies.csv');
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text.split(/\r?\n/)[0]).toMatch(
      /name,website,city,linkedin,glassdoor,stepstone,size_range/,
    );
    const header = csv.text.replace(/^\uFEFF/, '').split(/\r?\n/)[0];
    expect(header).toMatch(
      /name,website,city,linkedin,glassdoor,stepstone,size_range/,
    );

    // Delete
    const del = await http(app).delete(`/api/companies/${id}`);
    expect(del.status).toBe(200);

    // Not found afterwards
    const get404 = await http(app).get(`/api/companies/${id}`);
    expect(get404.status).toBe(404);
  });

  it('returns 400 for missing name and basic list empty', async () => {
    const { app } = makeApiApp();
    const bad = await http(app).post('/api/companies').send({});
    expect(bad.status).toBe(400);

    const list = await http(app).get('/api/companies');
    expect(list.status).toBe(200);
    expect(list.body.data).toEqual([]);
  });

  it('contacts list on new company is empty', async () => {
    const { app } = makeApiApp();
    const create = await http(app)
      .post('/api/companies')
      .send({ companyName: 'Solo' });
    const id = create.body.data._id;
    const contacts = await http(app).get(`/api/companies/${id}/contacts`);
    expect(contacts.status).toBe(200);
    expect(contacts.body.data).toEqual([]);
  });
});

describe('api - contacts', () => {
  it('creates, updates and deletes contacts under a company', async () => {
    const { app } = makeApiApp();

    const c = await http(app)
      .post('/api/companies')
      .send({ companyName: 'Org' });
    const companyId = c.body.data._id as string;

    // Create contact
    const newCt = await http(app)
      .post(`/api/companies/${companyId}/contacts`)
      .send({ contactName: 'Jane', contactEmail: 'jane@org.tld' });
    expect(newCt.status).toBe(201);
    const contactId = newCt.body.data._id as string;
    expect(contactId).toBeTruthy();

    // List contacts
    const list = await http(app).get(`/api/companies/${companyId}/contacts`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(1);

    // Update contact
    const upd = await http(app)
      .patch(`/api/companies/${companyId}/contacts/${contactId}`)
      .send({ contactPhone: '+49 123', contactNote: 'Sales' });
    expect(upd.status).toBe(200);

    // Delete contact
    const del = await http(app).delete(
      `/api/companies/${companyId}/contacts/${contactId}`,
    );
    expect(del.status).toBe(200);

    // List empty
    const list2 = await http(app).get(`/api/companies/${companyId}/contacts`);
    expect(list2.body.data).toEqual([]);
  });

  it('404 on company not found', async () => {
    const { app } = makeApiApp();
    const res = await http(app)
      .post('/api/companies/does-not-exist/contacts')
      .send({ contactName: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('api - jobs', () => {
  it('validates on create - missing title', async () => {
    const { app } = makeApiApp();
    const res = await http(app).post('/api/jobs').send({});
    expect(res.status).toBe(400);
  });

  it('creates job without company/contact and reads back', async () => {
    const { app } = makeApiApp();
    const create = await http(app).post('/api/jobs').send({ jobTitle: 'Dev' });
    expect(create.status).toBe(201);
    const id = create.body.data._id || create.body.data.id;
    expect(id).toBeTruthy();

    const get = await http(app).get(`/api/jobs/${id}`);
    expect(get.status).toBe(200);
    expect(get.body.data.title).toBe('Dev');
  });

  it('creates job with company/contact, lists and filters, updates & deletes', async () => {
    const { app } = makeApiApp();

    // Company + Contact
    const comp = await http(app)
      .post('/api/companies')
      .send({ companyName: 'ACME' });
    const companyId = comp.body.data._id;
    const ct = await http(app)
      .post(`/api/companies/${companyId}/contacts`)
      .send({
        contactName: 'Jane',
        contactEmail: 'jane@acme.tld',
      });
    const contactId = ct.body.data._id;

    // Create job
    const create = await http(app).post('/api/jobs').send({
      jobTitle: 'Engineer',
      companyId,
      contactId,
      salaryMin: 50000,
      salaryMax: 70000,
      salaryCurrency: 'EUR',
      salaryPeriod: 'year',
      workMode: 'hybrid',
      remoteRatio: 50,
      seniority: 'mid',
      employmentType: 'full-time',
      contractType: 'permanent',
    });
    expect(create.status).toBe(201);
    const id = create.body.data._id || create.body.data.id;

    // List
    const list = await http(app).get('/api/jobs');
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(1);

    // Filter by query
    const listQ = await http(app).get('/api/jobs?q=Engineer');
    expect(listQ.body.data.length).toBe(1);
    const listQ0 = await http(app).get('/api/jobs?q=FooBarBaz');
    expect(listQ0.body.data.length).toBe(0);

    // Toggle applied
    const t1 = await http(app)
      .post(`/api/jobs/${id}/toggle`)
      .send({ field: 'applied' });
    expect(t1.status).toBe(200);
    expect(t1.body.data.applied).toBe(1);

    // Toggle answer
    const t2 = await http(app)
      .post(`/api/jobs/${id}/toggle`)
      .send({ field: 'answer' });
    expect(t2.status).toBe(200);
    expect(t2.body.data.answer).toBe(1);

    // Toggle with bad field -> 400
    const tBad = await http(app)
      .post(`/api/jobs/${id}/toggle`)
      .send({ field: 'unknown' });
    expect(tBad.status).toBe(400);

    // Partial update (PATCH)
    const upd = await http(app).patch(`/api/jobs/${id}`).send({
      jobNote: 'Interessant',
      salaryTarget: 65000,
    });
    expect(upd.status).toBe(200);
    expect(upd.body.data.note).toContain('Interessant');
    expect(upd.body.data.salary_target).toBe(65000);

    // Clipboard (text/plain)
    const clip = await http(app).get(`/api/jobs/${id}/clipboard`);
    expect(clip.status).toBe(200);
    expect(clip.headers['content-type']).toMatch(/text\/plain/);
    //expect(clip.text).toMatch(/Engineer/);

    // Delete
    const del = await http(app).delete(`/api/jobs/${id}`);
    expect(del.status).toBe(200);

    // 404 after delete
    const get404 = await http(app).get(`/api/jobs/${id}`);
    expect(get404.status).toBe(404);
  });
});

const sampleHtml = `
<html lang="de">
  <head>
    <title>Rohde &amp; Schwarz Karriere</title>
    <meta property="og:title" content="Rohde &amp; Schwarz Karriere" />
    <link rel="canonical" href="https://www.glassdoor.de/Überblick/Arbeit-bei-Rohde-and-Schwarz-EI_IE12926.11,28.htm" />
  </head>
  <body>
    <h1>Rohde &amp; Schwarz</h1>
    <ul>
      <li>München, Deutschland</li>
      <li>Mehr als 10.000 Mitarbeiter</li>
      <li>Art: Privatunternehmen</li>
      <li>Gegründet 1933</li>
      <li>Umsatz: 1 bis 5 Milliarden $ (USD)</li>
      <li>Unternehmenssoftware & Netzwerklösungen</li>
    </ul>
    <a data-test="employer-website" href="http://www.rohde-schwarz.com/career">www.rohde-schwarz.com/career</a>
    <div data-test="employerDescription">Qualität, Präzision und Innovation …</div>
  </body>
</html>
`;

describe('api - import (glassdoor)', () => {
  it('parses pasted HTML (fallback) and returns mapped fields', async () => {
    const { app } = makeApiApp();
    const res = await http(app)
      .post('/api/import/glassdoor')
      .send({ html: sampleHtml, url: 'https://www.glassdoor.de/foo' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const c = res.body.data;
    expect(c.name).toMatch(/Rohde/);
    expect(c.city).toMatch(/München/);
    expect(c.size_range).toMatch(/10\.000|Mitarbeiter/);
    expect(c.hiring_page || c.website).toMatch(/rohde-schwarz/);
    expect(c.note).toMatch(/Kurzbeschreibung|Umsatz|Gegründet|Unternehmenstyp/);
  });

  it('returns 400 if neither url nor html is provided', async () => {
    const { app } = makeApiApp();
    const res = await http(app).post('/api/import/glassdoor').send({});
    expect(res.status).toBe(400);
  });
});
