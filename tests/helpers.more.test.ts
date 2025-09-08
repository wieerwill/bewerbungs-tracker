import { describe, it, expect } from 'vitest';
import {
  requestToCompany,
  requestToJob,
  jobRowToVm,
  companiesToCsv,
  formatJobForClipboard,
} from '../src/helpers';
import type { JobJoinedRow } from '../src/types';

describe('helpers - mapping & formatting', () => {
  it('requestToCompany fills optional fields with empty/undefined gracefully', () => {
    const comp = requestToCompany({ companyName: 'ACME' });
    expect(comp.name).toBe('ACME');
    // optional stuff omitted
    expect(comp.website).toBe('');
  });

  it('requestToJob converts numeric strings and keeps flags', () => {
    const base = requestToJob({
      jobTitle: 'Dev',
      salaryMin: '65000',
      salaryTarget: '70000',
      salaryPeriod: 'year',
    });
    expect(base.salary_min).toBe(65000);
    expect(base.salary_target).toBe(70000);
    expect(base.salary_period).toBe('year');
    expect(base.applied).toBe(0);
  });

  it('jobRowToVm maps booleans and nested company/contact safely', () => {
    const row: JobJoinedRow = {
      id: 'j1',
      title: 'QA',
      description: null as any,
      note: null as any,
      applied: 1,
      answer: 0,
      company_id: null,
      contact_id: null,
      company_name: null as any,
      company_website: null as any,
      company_city: null as any,
      contact_name: null as any,
      contact_email: null as any,
      contact_phone: null as any,
    } as any;
    const vm = jobRowToVm(row);
    expect(vm.applied).toBe(true);
    expect(vm.answer).toBe(false);
    expect(vm.company.name).toBe('');
    expect(vm.contact.email).toBe('');
  });

  it('companiesToCsv outputs header and rows with commas, quotes escaped', () => {
    const csv = companiesToCsv([
      {
        id: 'c1',
        name: 'ACME, Inc.',
        website: 'https://a',
        city: 'Ham"burg',
        size_range: '100-200',
      } as any,
      { id: 'c2', name: 'Globex', website: '', city: '' } as any,
    ]);
    const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/);
    expect(lines[0]).toBe(
      'name,website,city,linkedin,glassdoor,stepstone,size_range',
    );
    expect(lines[1]).toBe(
      '"ACME, Inc.","https://a","Ham""burg","","","","100-200"',
    );
    expect(lines[2]).toBe('"Globex","","","","","",""');
  });

  it('formatJobForClipboard contains key sections and markdown headings', () => {
    const joined = {
      id: 'j1',
      title: 'Backend Dev',
      description: 'Node & SQL',
      note: 'Team wirkte nett',
      applied: 1,
      answer: 0,
      company_name: 'Globex',
      company_website: 'globex.example',
      contact_name: 'Alice',
      contact_email: 'a@globex.example',
      salary_min: 60000,
      salary_max: 75000,
      salary_currency: 'EUR',
      salary_period: 'year',
      work_mode: 'hybrid',
      remote_ratio: 50,
      seniority: 'mid',
      employment_type: 'full-time',
      contract_type: 'permanent',
      start_date: '2025-10-01',
      source_url: 'https://jobs.example/dev',
    } as any as JobJoinedRow;

    const md = formatJobForClipboard(joined);
    expect(md).toMatch(/^# Backend Dev/m);
    expect(md).toMatch(/## Unternehmen/);
    expect(md).toMatch(/## Rahmen & Vergütung/);
    expect(md).toMatch(/Angeschrieben: Ja/);
    expect(md).toContain('Globex');
    expect(md).toContain('Node & SQL');
  });
});
