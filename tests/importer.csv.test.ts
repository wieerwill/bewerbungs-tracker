import { describe, it, expect } from 'vitest';
import { makeApiApp, http } from './api.util';

const CSV = `\uFEFFname,website,city,linkedin,glassdoor,stepstone,size_range
"ACME","https://acme.tld","Berlin","","","","200-500"
"ACME 2","", "München","","","",""
`;

describe('api - companies csv import/export', () => {
  it('imports csv, avoids duplicates, updates when re-imported', async () => {
    const { app } = makeApiApp();

    // Import
    const imp = await http(app)
      .post('/api/companies.csv')
      .set('content-type', 'text/plain')
      .send(CSV);
    expect(imp.status).toBe(200);
    expect(imp.body.summary.created).toBe(2);

    // Export -> Header passt
    const exp = await http(app).get('/api/companies.csv');
    const header = exp.text.replace(/^\uFEFF/, '').split(/\r?\n/)[0];
    expect(header).toBe(
      'name,website,city,linkedin,glassdoor,stepstone,size_range',
    );

    // Re-Import mit Update
    const CSV2 = `name,website,city,linkedin,glassdoor,stepstone,size_range
"ACME","https://acme.example","Berlin","","","","200-500"
`;
    const imp2 = await http(app)
      .post('/api/companies.csv')
      .set('content-type', 'text/plain')
      .send(CSV2);
    expect(imp2.body.summary.updated).toBe(1);
    expect(imp2.status).toBe(200);
    expect(imp2.body.summary).toEqual({
      created: 0,
      updated: 1,
      skipped: 0,
      errors: 0,
    });
  });
});
