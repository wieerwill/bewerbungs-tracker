import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseGlassdoorJobHtml } from '../src/importers/glassdoorJob';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(__dirname, 'fixtures', 'embedded-job-glassdoor.html');

describe('parseGlassdoorJobHtml', () => {
  it('parses essential fields from the Glassdoor job HTML', async () => {
    const html = await readFile(FIXTURE_PATH, 'utf8');
    const d = parseGlassdoorJobHtml(html);

    // Titel – exakt aus JSON-LD / H1
    expect(d.title).toBe('Embedded Software Engineer (Linux) (m/w/d)');

    // Firma – aus JSON-LD hiringOrganization.name
    expect(d.company_name).toBe('Comlet Verteilte Systeme GmbH');

    // Ort/Stadt – tolerant: enthält „München“ (aus JSON-LD jobLocation/addressLocality)
    expect(d.city).toMatch(/München/i);

    // Quelle – aus <link rel="canonical"> oder og:url
    expect(d.source_url).toMatch(
      /^https:\/\/www\.glassdoor\.de\/job-listing\/embedded-software-engineer-linux-mwd-comlet-verteilte-systeme-gmbh/i,
    );

    // Beschreibung – zusammengeführt & HTML-entschärft; sollte nicht leer sein
    expect(d.description && d.description.length).toBeGreaterThan(50);
    expect(d.description).toMatch(/digital\. connected\. intelligent/i);

    // Beschäftigungsart – JSON-LD employmentType → normalisiert
    // (dein Parser sollte FULL_TIME → 'full-time' mappen)
    expect(
      d.employment_type === 'full-time' || d.employment_type === null,
    ).toBe(true);

    // Optional bekannte Felder – sollten existieren oder null sein
    expect(d.salary_min ?? null).toBeNull();
    expect(d.salary_max ?? null).toBeNull();
    expect(['year', 'month', null]).toContain(d.salary_period ?? null);

    // Keine Pflicht: Seniorität etc. → sollte vorhanden oder null sein
    expect([null, 'intern', 'junior', 'mid', 'senior', 'lead']).toContain(
      d.seniority ?? null,
    );
  });

  it('is resilient when JSON-LD is missing (falls back to visible markup)', () => {
    // Minimales HTML mit H1, Ort und Canonical – JSON-LD fehlt
    const minimal = `
      <!doctype html><html><head>
        <link rel="canonical" href="https://www.glassdoor.de/job-listing/foo-bar-123.htm" />
      </head><body>
        <h1 id="jd-job-title-xyz">My Role (m/w/d)</h1>
        <div data-test="location">Berlin</div>
      </body></html>
    `;
    const d = parseGlassdoorJobHtml(minimal);

    expect(d.title).toBe('My Role (m/w/d)');
    expect(d.city).toMatch(/Berlin/i);
    expect(d.source_url).toBe(
      'https://www.glassdoor.de/job-listing/foo-bar-123.htm',
    );

    // Felder ohne Quelle → null
    expect(d.company_name ?? null).toBeNull();
    expect(d.description ?? null).toBeNull();
  });

  it('handles HTML entities & trims whitespace', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          {"@context":"https://schema.org/","@type":"JobPosting",
           "title":"Dev &amp; Ops (m/w/d)","hiringOrganization":{"@type":"Organization","name":"ACME &amp; Co"},
           "jobLocation":{"@type":"Place","address":{"@type":"PostalAddress","addressLocality":"M&uuml;nchen"}}
          }
        </script>
      </head><body></body></html>
    `;
    const d = parseGlassdoorJobHtml(html);
    expect(d.title).toBe('Dev & Ops (m/w/d)');
    expect(d.company_name).toBe('ACME & Co');
    expect(d.city).toBe('München');
  });
});
