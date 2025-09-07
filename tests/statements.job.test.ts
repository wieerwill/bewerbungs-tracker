import { describe, it, expect } from 'vitest';
import { makeTestDb } from './util';

describe('statements - jobs', () => {
  it('creates job without company/contact', () => {
    const { s } = makeTestDb();

    s.insertJob({ id: 'j1', title: 'Engineer', applied: 0, answer: 0 } as any);
    const row = s.getJobById('j1');
    expect(row?.title).toBe('Engineer');

    const joined = s.getJobJoinedById('j1');
    expect(joined?.company_name).toBeNull();
  });

  it('creates job with company/contact and returns joined data', () => {
    const { s } = makeTestDb();

    s.insertCompany({
      id: 'c1',
      name: 'Acme',
      website: 'https://acme.test',
    } as any);
    s.insertContact({
      id: 'ct1',
      company_id: 'c1',
      name: 'Alice',
      email: 'a@acme.test',
    } as any);

    s.insertJob({
      id: 'j1',
      title: 'Backend Dev',
      description: 'Go/Node',
      applied: 1,
      answer: 0,
      company_id: 'c1',
      contact_id: 'ct1',
      salary_min: 60000,
      salary_max: 75000,
      salary_currency: 'EUR',
      salary_period: 'year',
    } as any);

    const j = s.getJobJoinedById('j1')!;
    expect(j.title).toBe('Backend Dev');
    expect(j.company_name).toBe('Acme');
    expect(j.contact_name).toBe('Alice');
    expect(j.applied).toBe(1);
    expect(j.salary_min).toBe(60000);
  });

  it('listJobs filters by query/status/sort', () => {
    const { s } = makeTestDb();

    s.insertCompany({ id: 'c1', name: 'Globex' } as any);
    s.insertCompany({ id: 'c2', name: 'Initech' } as any);

    s.insertJob({
      id: 'a',
      title: 'Alpha',
      applied: 1,
      answer: 0,
      company_id: 'c1',
    } as any);
    s.insertJob({
      id: 'b',
      title: 'Beta',
      applied: 0,
      answer: 1,
      company_id: 'c2',
    } as any);

    const qGlob = s.listJobs({ query: 'Globex' });
    expect(qGlob.length).toBe(1);
    expect(qGlob[0].title).toBe('Alpha');

    const onlyApplied = s.listJobs({ status: 'applied' });
    expect(onlyApplied.map((j) => j.id)).toContain('a');
    expect(onlyApplied.map((j) => j.id)).not.toContain('b');

    const sorted = s.listJobs({ sort: 'company' });
    expect(sorted[0].company_name! <= sorted[1].company_name!).toBe(true);
  });
});
