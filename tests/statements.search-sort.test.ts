import { describe, it, expect } from 'vitest';
import { makeTestDb, mkCompany, mkJob } from './util';

describe('statements - search/filter/sort', () => {
  it('searches across job title/description/company/contact names', () => {
    const { s } = makeTestDb();
    s.insertCompany(
      mkCompany({ id: 'c1', name: 'AlphaCorp', city: 'Berlin' }) as any,
    );
    s.insertCompany(
      mkCompany({ id: 'c2', name: 'Beta GmbH', city: 'Hamburg' }) as any,
    );

    s.insertJob(
      mkJob({
        id: 'j1',
        title: 'Backend Dev',
        description: 'Node',
        company_id: 'c1',
      }) as any,
    );
    s.insertJob(
      mkJob({
        id: 'j2',
        title: 'Frontend Dev',
        description: 'React',
        company_id: 'c2',
      }) as any,
    );
    s.insertJob(
      mkJob({ id: 'j3', title: 'QA', description: 'Testing stuff' }) as any,
    );

    // by title
    expect(s.listJobs({ query: 'Backend' }).map((j) => j.id)).toEqual(['j1']);
    // by description
    expect(s.listJobs({ query: 'React' }).map((j) => j.id)).toEqual(['j2']);
    // by company name
    expect(s.listJobs({ query: 'Alpha' }).map((j) => j.id)).toEqual(['j1']);
    // by city (company_city in join)
    expect(s.listJobs({ query: 'Hamburg' }).map((j) => j.id)).toEqual(['j2']);
  });

  it('filters by status applied / not-applied / answered / no-answer', () => {
    const { s } = makeTestDb();
    s.insertJob(mkJob({ id: 'a', title: 'A', applied: 1, answer: 0 }) as any);
    s.insertJob(mkJob({ id: 'b', title: 'B', applied: 0, answer: 1 }) as any);
    s.insertJob(mkJob({ id: 'c', title: 'C', applied: 0, answer: 0 }) as any);

    expect(s.listJobs({ status: 'applied' }).map((j) => j.id)).toEqual(['a']);
    expect(
      s
        .listJobs({ status: 'not-applied' })
        .map((j) => j.id)
        .sort(),
    ).toEqual(['b', 'c']);
    expect(s.listJobs({ status: 'answered' }).map((j) => j.id)).toEqual(['b']);

    expect(
      s
        .listJobs({ status: 'no-answer' })
        .map((j) => j.id)
        .sort(),
    ).toEqual(['a', 'c']);
  });

  it('sorts by title and by company (case-insensitive)', () => {
    const { s } = makeTestDb();
    s.insertCompany(mkCompany({ id: 'c1', name: 'gamma' }) as any);
    s.insertCompany(mkCompany({ id: 'c2', name: 'Alpha' }) as any);

    s.insertJob(mkJob({ id: 'j1', title: 'Zebra', company_id: 'c1' }) as any);
    s.insertJob(mkJob({ id: 'j2', title: 'apple', company_id: 'c2' }) as any);

    const byTitle = s.listJobs({ sort: 'title' }).map((j) => j.title);
    expect(byTitle).toEqual(['apple', 'Zebra']);

    const byCompany = s
      .listJobs({ sort: 'company' })
      .map((j) => j.company_name);
    expect(byCompany).toEqual(['Alpha', 'gamma']);
  });

  it('joined job returns salary/meta fields (nullable) without throwing', () => {
    const { s } = makeTestDb();
    s.insertJob(
      mkJob({
        id: 'j1',
        salary_min: 50000,
        salary_max: 70000,
        seniority: 'mid',
      }) as any,
    );
    const j = s.getJobJoinedById('j1')!;
    expect(j.salary_min).toBe(50000);
    expect(j.salary_max).toBe(70000);
    expect(j.seniority).toBe('mid');
  });
});
