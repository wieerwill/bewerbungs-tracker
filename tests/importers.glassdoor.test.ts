import { describe, it, expect } from 'vitest';
import { parseGlassdoorHtml } from '../src/importers/glassdoor';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('importers', () => {
  it('parses reduced glassdoor HTML', () => {
    // https://www.glassdoor.de/%C3%9Cberblick/Arbeit-bei-Rohde-and-Schwarz-EI_IE12926.11,28.htm
    const html = readFileSync(
      join(__dirname, 'fixtures/rohde-glassdoor.html'),
      'utf8',
    );
    const pc = parseGlassdoorHtml(html, 'https://www.glassdoor.de/…');
    expect(pc.name).toMatch(/Rohde/);
    expect(pc.city?.toLowerCase()).toContain('münchen');
    expect(pc.size_range?.toLowerCase()).toContain('mitarbeiter');
    expect(pc.industry?.toLowerCase()).toContain('unternehmenssoftware');
    expect(pc.note).toMatch(/Kurzbeschreibung|Bewertung|Empfehlung|CEO/i);
  });
});
