import { describe, it, expect } from 'vitest';
import { makeTestDb } from './util';

describe('statements - companies', () => {
  it('inserts and lists companies; enforces unique name', () => {
    const { s } = makeTestDb();

    const acme = {
      id: 'c-acme',
      name: 'Acme',
      website: 'https://acme.test',
      city: 'Berlin',
      note: 'Testfirma',
      linkedin_url: 'https://linkedin.com/company/acme',
    };

    s.insertCompany(acme as any);
    const byName = s.getCompanyByName('acme');
    expect(byName?.id).toBe('c-acme');

    const list = s.listCompanies();
    expect(list.length).toBe(1);
    expect(list[0].name).toBe('Acme');

    expect(() =>
      s.insertCompany({ ...acme, id: 'c-dup', name: 'ACME' } as any),
    ).toThrow();
  });

  it('adds and fetches contacts for company', () => {
    const { s } = makeTestDb();

    s.insertCompany({ id: 'c1', name: 'Corp', city: 'Prag' } as any);
    s.insertContact({
      id: 'ct1',
      company_id: 'c1',
      name: 'Alice',
      email: 'a@corp.test',
    } as any);
    s.insertContact({ id: 'ct2', company_id: 'c1', name: 'Bob' } as any);

    const list = s.listContactsForCompany('c1');
    expect(list.map((x) => x.name)).toEqual(['Alice', 'Bob']);
  });
});
