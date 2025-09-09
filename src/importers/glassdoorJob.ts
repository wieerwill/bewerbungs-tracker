import { Element, load, type CheerioAPI } from 'cheerio';

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

function normWS(s: string): string {
  return s
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\s+\s/g, ' ')
    .trim();
}
function collapseBlankLines(s: string): string {
  return s.replace(/\n{3,}/g, '\n\n').trim();
}
function dedupeBlocks(md: string): string {
  const blocks = md
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const b of blocks) {
    const key = b.replace(/\s+/g, ' ').toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(b);
    }
  }
  return out.join('\n\n');
}

/** Wähle die beste Description-Root im DOM */
function selectDescriptionRoot($: CheerioAPI) {
  let root = $('.JobDetails_jobDescription__uW_fK').first(); // aktuelle Klasse
  if (!root.length)
    root = $('.jobDescription, [data-test="job-description"]').first();
  if (!root.length) {
    // Fallback: Modul-Container
    root = $('[data-brandviews="MODULE:n=jobview-description"]').first();
  }
  return root.length ? root : null;
}

/** DOM → Markdown (ohne Zusatzpakete), mit einfacher Struktur */
function domToMarkdown(
  $: CheerioAPI,
  $root: ReturnType<CheerioAPI['root']> | any,
): string {
  const lines: string[] = [];

  function walk(
    el: Element,
    ctx: { listDepth: number; ordered: boolean } = {
      listDepth: 0,
      ordered: false,
    },
  ) {
    const tag = el.tagName?.toLowerCase() ?? '';

    // Skip Scripte/Styles
    if (tag === 'script' || tag === 'style' || tag === 'noscript') return;

    // Blockelemente
    if (/^h[1-6]$/.test(tag)) {
      const level = Number(tag[1]);
      const t = normWS($(el).text());
      if (t) lines.push(`${'#'.repeat(Math.min(3, level))} ${t}`);
      return;
    }
    if (tag === 'p') {
      const t = inlineChildrenToMarkdown($, el);
      if (t) lines.push(t);
      return;
    }
    if (tag === 'br') {
      lines.push('');
      return;
    }
    if (tag === 'ul' || tag === 'ol') {
      const ordered = tag === 'ol';
      $(el)
        .children('li')
        .each((_i, li) => {
          const itemText = inlineChildrenToMarkdown($, li);
          if (itemText) {
            const prefix = ordered ? '1.' : '-';
            lines.push(`${'  '.repeat(ctx.listDepth)}${prefix} ${itemText}`);
            // Nested lists
            $(li)
              .children('ul,ol')
              .each((_j, sub) => {
                walk(sub as Element, {
                  listDepth: ctx.listDepth + 1,
                  ordered: sub.tagName?.toLowerCase() === 'ol',
                });
              });
          }
        });
      return;
    }
    if (tag === 'div' || tag === 'section' || tag === 'article') {
      const t = inlineChildrenToMarkdown($, el);
      if (t) lines.push(t);
      $(el)
        .children()
        .each((_i, c) => walk(c as Element, ctx));
      return;
    }

    // Default: Kinder traversieren
    $(el)
      .children()
      .each((_i, c) => walk(c as Element, ctx));
  }

  function inlineChildrenToMarkdown($: CheerioAPI, el: Element): string {
    let out = '';
    $(el)
      .contents()
      .each((_i, node) => {
        if (node.type === 'text') {
          const t = normWS($(node).text());
          if (t) out += t;
          return;
        }
        if (node.type === 'tag') {
          const tag = node.tagName?.toLowerCase() ?? '';
          if (tag === 'br') {
            out += '\n';
            return;
          }
          if (tag === 'strong' || tag === 'b') {
            const t = inlineChildrenToMarkdown($, node as Element);
            if (t) out += `**${t}**`;
            return;
          }
          if (tag === 'em' || tag === 'i') {
            const t = inlineChildrenToMarkdown($, node as Element);
            if (t) out += `*${t}*`;
            return;
          }
          if (tag === 'a') {
            const t =
              inlineChildrenToMarkdown($, node as Element) ||
              normWS($(node).attr('href') || '');
            const href = $(node).attr('href');
            if (t && href) out += `[${t}](${href})`;
            else if (t) out += t;
            return;
          }
          if (/^h[1-6]$/.test(tag) || tag === 'p') {
            // Blocke als Zeilenumbruch trennen
            const t = inlineChildrenToMarkdown($, node as Element);
            if (t) out += (out ? '\n' : '') + t;
            return;
          }
          // Standard: weiter runter
          const t = inlineChildrenToMarkdown($, node as Element);
          if (t) out += t;
        }
      });
    // Zeilenbrüche aufräumen
    out = out
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return out;
  }

  // Starte bei $root (kann die Description-Box sein)
  $root.children().each((_i: number, el: Element) => walk(el));
  // Nachbearbeitung
  const md = collapseBlankLines(dedupeBlocks(lines.join('\n\n')));
  return md;
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

function mapEmploymentType(
  v: string | string[] | undefined,
): ParsedJobImport['employment_type'] {
  const t = Array.isArray(v)
    ? v.join(' ').toLowerCase()
    : toStr(v)?.toLowerCase();
  if (!t) return undefined;
  if (t.includes('full')) return 'full-time';
  if (t.includes('part')) return 'part-time';
  if (t.includes('freelance') || t.includes('contract')) return 'freelance';
  return undefined;
}

function mapContractType(
  v: string | undefined,
): ParsedJobImport['contract_type'] {
  const t = toStr(Array.isArray(v) ? v.join(' ') : (v as any))?.toLowerCase();
  if (!t) return undefined;
  if (t.includes('befrist')) return 'fixed-term';
  if (t.includes('unbefrist') || t.includes('perm')) return 'permanent';
  if (t.includes('freelance') || t.includes('contract')) return 'freelance';
  return undefined;
}

function firstLdJson($: CheerioAPI): any | null {
  const nodes = $('script[type="application/ld+json"]');
  for (let i = 0; i < nodes.length; i++) {
    const raw = $(nodes[i]).text().trim();
    try {
      const data = JSON.parse(raw);
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
    } catch {}
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

    const loc =
      ld.jobLocation?.address?.addressLocality ||
      ld.jobLocation?.address?.addressRegion ||
      ld.jobLocation?.address?.addressCountry?.name;
    out.city =
      norm(loc) ||
      norm($('[data-test="location"]').first().text()) ||
      undefined;

    if (ld.datePosted) out.date_posted = String(ld.datePosted).substring(0, 10);
    if (ld.validThrough)
      out.valid_through = String(ld.validThrough).substring(0, 10);

    out.employment_type = mapEmploymentType(ld.employmentType);
    out.contract_type = mapContractType(ld.employmentType as string);
    out.company_name = norm(ld.hiringOrganization?.name || null);
  }

  const descRoot = selectDescriptionRoot($);
  if (descRoot) {
    const md = domToMarkdown($, descRoot);
    if (md) {
      out.description_md = md;
      out.description = md;
    }
  }

  if (!out.description_md && ld?.description) {
    // LD-HTML → Markdown
    const $frag = load(`<div>${ld.description}</div>`);
    const md = domToMarkdown($frag, $frag('div').first());
    if (md) {
      out.description_md = md;
      out.description = md;
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

  return out;
}
