import { describe, it, expect } from 'vitest';
import { makeTestDb, mkCompany, mkContact } from './util';

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
  it('loads, updates and persists company fields incl. links & meta', () => {
    const { s } = makeTestDb();

    const c0 = mkCompany({
      id: 'c1',
      name: 'Acme',
      website: 'https://acme.test',
      city: 'Berlin',
      note: 'old',
      linkedin_url: null,
      size_range: null,
      other_links_json: null,
    });
    s.insertCompany(c0 as any);

    const before = s.getCompanyById('c1')!;
    expect(before.name).toBe('Acme');
    expect(before.note).toBe('old');

    const edited = {
      ...before,
      name: 'Acme GmbH',
      city: 'Prag',
      note: 'neue Notiz',
      linkedin_url: 'https://www.linkedin.com/company/acme',
      glassdoor_url:
        'https://www.glassdoor.de/Overview/Working-at-Acme-EI_IE12345.11,15.htm',
      stepstone_url: 'https://www.stepstone.de/acme',
      size_range: '200-500',
      other_links_json: JSON.stringify([
        { label: 'Kununu', url: 'https://www.kununu.com/de/acme' },
      ]),
    } as any;

    s.updateCompany(edited);

    const after = s.getCompanyById('c1')!;
    expect(after.name).toBe('Acme GmbH');
    expect(after.city).toBe('Prag');
    expect(after.note).toBe('neue Notiz');
    expect(after.linkedin_url).toContain('linkedin.com/company');
    expect(after.glassdoor_url).toContain('glassdoor');
    expect(after.stepstone_url).toContain('stepstone');
    expect(after.size_range).toBe('200-500');
    expect(() => JSON.parse(after.other_links_json!)).not.toThrow();
    const other = JSON.parse(after.other_links_json!);
    expect(other[0].label).toBe('Kununu');
  });

  it('rejects renaming to existing company name (UNIQUE, case-insensitive)', () => {
    const { s } = makeTestDb();
    s.insertCompany(mkCompany({ id: 'c1', name: 'Globex' }) as any);
    s.insertCompany(mkCompany({ id: 'c2', name: 'Initech' }) as any);

    const c2 = s.getCompanyById('c2')!;
    expect(() => s.updateCompany({ ...c2, name: 'globex' } as any)).toThrow();
  });

  it('creates, updates and deletes contacts scoped to company', () => {
    const { s } = makeTestDb();

    s.insertCompany(mkCompany({ id: 'c1', name: 'Umbrella' }) as any);
    s.insertContact(
      mkContact('c1', { id: 'ct1', name: 'Alice', email: 'a@umb.com' }) as any,
    );
    s.insertContact(mkContact('c1', { id: 'ct2', name: 'Bob' }) as any);

    const list1 = s.listContactsForCompany('c1');
    expect(list1.map((x) => x.id).sort()).toEqual(['ct1', 'ct2']);

    s.updateContact({
      id: 'ct1',
      company_id: 'c1',
      name: 'Alice A.',
      email: 'alice@umbrella.com',
      phone: '+49 123',
      note: 'Recruiter',
    } as any);
    const ct1 = s.getContactById('ct1')!;
    expect(ct1.name).toBe('Alice A.');
    expect(ct1.email).toBe('alice@umbrella.com');
    expect(ct1.phone).toBe('+49 123');
    expect(ct1.note).toBe('Recruiter');

    s.updateContact({
      id: 'ct1',
      company_id: 'WRONG',
      name: 'Hacked',
      email: 'nope@example.com',
      phone: '000',
      note: 'nope',
    } as any);
    const ct1still = s.getContactById('ct1')!;
    expect(ct1still.name).toBe('Alice A.');

    s.deleteContact('ct2');
    const list2 = s.listContactsForCompany('c1');
    expect(list2.map((x) => x.id)).toEqual(['ct1']);
  });
});
