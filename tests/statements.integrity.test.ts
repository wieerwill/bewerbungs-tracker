import { describe, expect, it } from 'vitest';
import { makeTestDb, mkCompany, mkContact, mkJob } from './util';

describe('statements - integrity & cascades', () => {
  it('enforces unique company name (case-insensitive) and can update', () => {
    const { s } = makeTestDb();
    const c1 = mkCompany({ id: 'c1', name: 'Acme' });
    s.insertCompany(c1 as any);

    expect(() =>
      s.insertCompany(mkCompany({ id: 'c2', name: 'ACME' }) as any),
    ).toThrow();

    s.updateCompany({ ...c1, city: 'Prag' } as any);
    const fetched = s.getCompanyById('c1')!;
    expect(fetched.city).toBe('Prag');
  });

  it('deletes contacts on company delete (ON DELETE CASCADE)', () => {
    const { s } = makeTestDb();
    s.insertCompany(mkCompany({ id: 'c1', name: 'Globex' }) as any);
    s.insertContact(mkContact('c1', { id: 'ct1' }) as any);
    s.insertContact(mkContact('c1', { id: 'ct2' }) as any);

    expect(s.listContactsForCompany('c1').length).toBe(2);
    s.deleteCompany('c1');
    expect(s.listContactsForCompany('c1').length).toBe(0);
  });

  it('sets job.company_id/contact_id to NULL when FK target removed', () => {
    const { s } = makeTestDb();
    s.insertCompany(mkCompany({ id: 'c1', name: 'Initech' }) as any);
    s.insertContact(mkContact('c1', { id: 'ct1', name: 'Peter' }) as any);
    s.insertJob(
      mkJob({ id: 'j1', company_id: 'c1', contact_id: 'ct1' }) as any,
    );

    s.deleteContact('ct1');
    let j = s.getJobById('j1')!;
    expect(j.contact_id).toBeNull();

    s.deleteCompany('c1');
    j = s.getJobById('j1')!;
    expect(j.company_id).toBeNull();
  });

  it('update job toggles status without touching other fields', () => {
    const { s } = makeTestDb();
    s.insertJob(mkJob({ id: 'j1', status: 'applied', note: 'keep' }) as any);
    const before = s.getJobById('j1')!;

    s.updateJob({ ...before, status: 'answered' } as any);
    const mid = s.getJobById('j1')!;
    expect(mid.status).toBe('answered');
    expect(mid.note).toBe('keep');

    s.updateJob({ ...mid, status: 'invited' } as any);
    const after = s.getJobById('j1')!;
    expect(after.status).toBe('invited');
    expect(after.note).toBe('keep');
  });
});
