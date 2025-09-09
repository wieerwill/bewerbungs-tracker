import { load } from 'cheerio';

// Gibt den "besten" String zurück (Array -> erstes Element, trimmt)
function toStr(v: unknown): string | null {
  if (v == null) return null;
  if (Array.isArray(v)) return toStr(v[0]);
  if (
    typeof v === 'string' ||
    typeof v === 'number' ||
    typeof v === 'boolean'
  ) {
    const s = String(v).trim();
    return s.length ? s : null;
  }
  return null;
}

// Dekodiert HTML-Entities (ohne Extra-Paket, via cheerio)
function decodeEntities(s: string | null): string | null {
  if (!s) return s;
  const $ = load(`<span>${s}</span>`);
  return $('span').text().trim() || null;
}

// Kombi: normalisiert & dekodiert
function norm(v: unknown): string | null {
  return decodeEntities(toStr(v));
}

function textFromHtmlFragment(fragment: unknown): string | null {
  const s = toStr(fragment);
  if (!s) return null;
  const $ = load(`<div>${s}</div>`);
  const txt = $('div').text(); // purer Text
  const cleaned = txt.replace(/\s+/g, ' ').trim();
  return cleaned || null;
}

type ParsedJobImport = {
  title?: string | null;
  company_name?: string | null;
  city?: string | null;
  description?: string | null;
  description_md?: string;
  source_url?: string | null;
  employment_type?: 'full-time' | 'part-time' | 'freelance' | undefined;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_period?: 'year' | 'month' | null;
  seniority?: 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | null;
  contract_type?: 'permanent' | 'fixed-term' | 'freelance';
  salary_currency?: string | null;
  date_posted?: string | null; // ISO yyyy-mm-dd
  valid_through?: string | null; // ISO yyyy-mm-dd
};

function htmlToMarkdown(html: string): string {
  // sehr einfacher, robuster Fallback – ausreichend zum Vorfüllen
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\s*(h\d)[^>]*>/gi, '\n\n**')
    .replace(/<\s*\/h\d\s*>/gi, '**\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();
}

function mapEmploymentType(
  v: string | string[] | undefined,
): ParsedJobImport['employment_type'] {
  const t = toStr(v)?.toLowerCase();
  if (!t) return undefined;
  if (t.includes('full')) return 'full-time';
  if (t.includes('part')) return 'part-time';
  if (t.includes('freelance')) return 'freelance';
  return undefined;
}

function mapContractType(
  v: string | undefined,
): ParsedJobImport['contract_type'] {
  const t = toStr(v)?.toLowerCase();
  if (!t) return undefined;
  if (t.includes('befrist')) return 'fixed-term';
  if (t.includes('unbefrist') || t.includes('perm')) return 'permanent';
  if (t.includes('freelance') || t.includes('contractor')) return 'freelance';
  return undefined;
}

function firstLdJson($: ReturnType<typeof load>): any | null {
  const nodes = $('script[type="application/ld+json"]');
  for (let i = 0; i < nodes.length; i++) {
    const raw = $(nodes[i]).text().trim();
    try {
      const data = JSON.parse(raw);
      // entweder direkt JobPosting, oder @graph mit JobPosting drin
      if (data && data['@type'] === 'JobPosting') return data;
      if (Array.isArray(data)) {
        const jp = data.find((x) => x && x['@type'] === 'JobPosting');
        if (jp) return jp;
      }
      if (data && data['@graph']) {
        const jp = (data['@graph'] as any[]).find(
          (x) => x['@type'] === 'JobPosting',
        );
        if (jp) return jp;
      }
    } catch {
      // ignore chunk; try next
    }
  }
  return null;
}

export function parseGlassdoorJobHtml(html: string): ParsedJobImport {
  const $ = load(html);
  const ld = firstLdJson($);

  const out: ParsedJobImport = {};

  // Basis aus JSON-LD
  if (ld) {
    out.title = norm(ld.title);
    out.source_url = norm(ld.url || ld['og:url'] || undefined);
    out.salary_currency = ld.salaryCurrency || null;

    // location
    const loc =
      ld.jobLocation?.address?.addressLocality ||
      ld.jobLocation?.address?.addressRegion ||
      ld.jobLocation?.address?.addressCountry?.name;
    out.city =
      norm(loc) ||
      norm($('[data-test="location"]').first().text()) ||
      undefined;

    // dates
    if (ld.datePosted) out.date_posted = String(ld.datePosted).substring(0, 10);
    if (ld.validThrough)
      out.valid_through = String(ld.validThrough).substring(0, 10);

    // employment
    out.employment_type = mapEmploymentType(ld.employmentType);
    out.contract_type = mapContractType(ld.employmentType as string);

    // company
    out.company_name = norm(ld.hiringOrganization?.name || null);

    // description
    const descFromLd = textFromHtmlFragment(ld?.description);
    const descFromDom = textFromHtmlFragment(
      $('.JobDetails_jobDescription__uW_fK').html(),
    );
    const descFromAnyDom =
      descFromDom ||
      textFromHtmlFragment(
        $('.jobDescription, [data-test="job-description"]').html(),
      );
    out.description =
      [descFromLd, descFromAnyDom]
        .filter((x): x is string => typeof x === 'string' && x.length > 0)
        .join('\n\n') || null;
    if (out.description) {
      out.description_md = htmlToMarkdown(String(out.description));
    }
  }

  // Fallbacks aus dem DOM (Titel / Ort / Canonical)
  if (!out.title) {
    const h1 = $('h1').first().text().trim();
    if (h1) out.title = norm(h1);
  }
  if (!out.city) {
    const loc = $('[data-test="location"]').first().text().trim();
    if (loc) out.city = norm(loc);
  }
  if (!out.source_url) {
    const canon = $('link[rel="canonical"]').attr('href');
    if (canon) out.source_url = canon;
  }

  // Beschreibung fallback: Haupttextblock
  if (!out.description_md) {
    const main = $('[data-brandviews="MODULE:n=jobview-description"]')
      .text()
      .trim();
    if (main) out.description_md = htmlToMarkdown(main);
  }

  return out;
}
