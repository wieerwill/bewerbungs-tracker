import { describe, it, expect } from 'vitest';
import { makeTestDb, mkJob } from './util';

describe('jobs - edge cases', () => {
  it('allows missing salary fields (nullable) without throwing', () => {
    const { s } = makeTestDb();
    s.insertJob(
      mkJob({
        id: 'j1',
        title: 'NoSalary',
        salary_min: null,
        salary_max: null,
      }) as any,
    );
    const j = s.getJobById('j1')!;
    expect(j.salary_min).toBeNull();
    expect(j.salary_max).toBeNull();
  });

  it('stores target salary independently of range', () => {
    const { s } = makeTestDb();
    s.insertJob(
      mkJob({
        id: 'j2',
        salary_min: 60000,
        salary_max: 80000,
        salary_target: 75000,
      }) as any,
    );
    const j = s.getJobById('j2')!;
    expect(j.salary_target).toBe(75000);
  });

  it('currently permits salary_min > salary_max (no server validation here)', () => {
    const { s } = makeTestDb();
    s.insertJob(
      mkJob({ id: 'j3', salary_min: 90000, salary_max: 80000 }) as any,
    );
    const j = s.getJobById('j3')!;
    expect(j.salary_min).toBe(90000);
    expect(j.salary_max).toBe(80000);
  });
});
