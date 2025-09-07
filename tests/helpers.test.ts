import { describe, it, expect } from 'vitest';
import { requestToCompany, requestToJob } from '../src/helpers';

describe('helpers', () => {
  it('maps request to company record', () => {
    const body = {
      companyName: 'Acme',
      companyWebsite: 'https://acme.test',
      companyCity: 'Berlin',
      companyLinkedIn: 'https://linkedin.com/company/acme',
    };
    const c = requestToCompany(body);
    expect(c.name).toBe('Acme');
    expect(c.website).toContain('acme');
    expect(c.linkedin_url).toContain('linkedin.com/company');
    expect(c.id).toMatch(/[0-9a-f-]{36}/i);
  });

  it('maps request to job record, keeps defaults', () => {
    const body = { jobTitle: 'Dev', salaryMin: '60000', salaryPeriod: 'year' };
    const j = requestToJob(body);
    expect(j.title).toBe('Dev');
    expect(j.applied).toBe(0);
    expect(j.answer).toBe(0);
    expect(j.salary_min).toBe(60000);
    expect(j.salary_period).toBe('year');
  });
});
