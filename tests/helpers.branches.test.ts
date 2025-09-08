import { describe, it, expect } from 'vitest';
import { companiesToCsv } from '../src/helpers';

describe('helpers branches', () => {
  it('csv escapes newlines and quotes', () => {
    const csv = companiesToCsv([
      {
        id: 'c1',
        name: 'ACME "Intl"',
        website: 'https://a\nb',
        city: 'A,B',
      } as any,
    ]);

    const body = csv.replace(/^\uFEFF/, '');

    expect(
      body.startsWith(
        'name,website,city,linkedin,glassdoor,stepstone,size_range',
      ),
    ).toBe(true);

    expect(body).toContain('"ACME ""Intl""","https://a\nb","A,B","","","",""');
  });
});
