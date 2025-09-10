import { describe, expect, it } from 'vitest';
import { makeTestDb, mkCompany, mkJob } from './util';

describe('statements - remaining edges', () => {
  it('updateCompany with many nullables does not throw', () => {
    const { s } = makeTestDb();
    const c = mkCompany({
      id: 'c1',
      name: 'NullCo',
      website: null,
      street: null,
      city: null,
    });
    s.insertCompany(c as any);
    s.updateCompany({ ...c, website: null, industry: null } as any);
    expect(s.getCompanyById('c1')!.name).toBe('NullCo');
  });

  it('listContactsForCompany returns [] when none', () => {
    const { s } = makeTestDb();
    const c = mkCompany({ id: 'c1', name: 'NoContacts' });
    s.insertCompany(c as any);
    expect(s.listContactsForCompany('c1')).toEqual([]);
  });

  it('updateJob with null salary/meta keeps flags', () => {
    const { s } = makeTestDb();
    const j = mkJob({ id: 'j1', status: 'answered' });
    s.insertJob(j as any);
    s.updateJob({ ...j, salary_min: null, salary_period: null } as any);
    const out = s.getJobById('j1')!;
    expect(out.status).toBe('answered');
    expect(out.salary_min).toBeNull();
  });
});
