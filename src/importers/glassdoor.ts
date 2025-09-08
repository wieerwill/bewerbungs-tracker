import { load } from 'cheerio';
import { fetch } from 'undici';
import type { Company } from '../types';

type ParsedCompany = Pick<
  Company,
  | 'name'
  | 'website'
  | 'city'
  | 'size_range'
  | 'industry'
  | 'hiring_page'
  | 'note'
> & {
  // Zusatzinfos, die wir in die Note markdownen
  _meta?: {
    rating?: string | null;
    recommend_pct?: string | null;
    review_count?: string | null;
    ceo_name?: string | null;
    ceo_approval?: string | null;
    founded?: string | null;
    revenue?: string | null;
    company_type?: string | null;
    locations_count?: string | null;
    canonical?: string | null;
    source_url?: string | null;
  };
};

const txt = (s?: string | null) => (s ? s.trim() : null);
const norm = (s?: string | null) => (s ? s.replace(/\s+/g, ' ').trim() : null);

function textOf($: cheerio.CheerioAPI, selector: string) {
  const t = $(selector).first().text();
  return norm(t) ?? null;
}

function firstLinkHref($: cheerio.CheerioAPI, selector: string) {
  const href = $(selector).first().attr('href');
  return href ? href.trim() : null;
}

function findFirstH1($: cheerio.CheerioAPI): string | null {
  const t = $('h1').first().text();
  return norm(t) ?? null;
}

function findWebsite($: cheerio.CheerioAPI): string | null {
  // bevorzugt data-test="employer-website"
  const hrefTest = firstLinkHref($, 'a[data-test="employer-website"]');
  if (hrefTest) return hrefTest;

  // Fallback: erstes externes http(s)-Link, das nicht auf Glassdoor zeigt
  const candidates = $('a[href^="http"]').toArray();
  for (const a of candidates) {
    const href = $(a).attr('href');
    if (href && !/glassdoor\./i.test(href)) return href;
  }
  return null;
}

function findOverviewListItems($: cheerio.CheerioAPI): string[] {
  // Auf der Seite befindet sich eine UL mit Unternehmensdetails.
  // Wir werten ALLE <li> global aus und matchen per Inhalt.
  return $('li')
    .toArray()
    .map((el) => norm($(el).text()) || '')
    .filter(Boolean);
}

function extractFromDetails(items: string[]) {
  const out: {
    city?: string | null;
    size?: string | null;
    founded?: string | null;
    revenue?: string | null;
    company_type?: string | null;
    locations_count?: string | null;
    industry?: string | null;
  } = {};

  for (const item of items) {
    if (
      !out.city &&
      /deutschland|straße|gasse|stadt|münchen|berlin|hamburg/i.test(item)
    ) {
      out.city = item;
    }
    if (!out.size && /(mitarbeiter|employees)/i.test(item)) {
      out.size = item.replace(/^mehr als\s*/i, 'Mehr als ').replace(/^\s*/, '');
    }
    if (!out.locations_count && /standorte/i.test(item)) {
      out.locations_count = item;
    }
    if (!out.company_type && /^art:/i.test(item)) {
      out.company_type = item.replace(/^Art:\s*/i, '');
    }
    if (!out.founded && /gegründet/i.test(item)) {
      out.founded = item.replace(/^Gegründet\s*/i, '');
    }
    if (!out.revenue && /umsatz/i.test(item)) {
      out.revenue = item.replace(/^Umsatz:\s*/i, '');
    }
    if (
      !out.industry &&
      /unternehmenssoftware|netzwerk|industrie|branche/i.test(item)
    ) {
      out.industry = item;
    }
  }

  return out;
}

function findDescription($: cheerio.CheerioAPI): string | null {
  // bevorzugt data-test="employerDescription"
  const t = textOf($, '[data-test="employerDescription"]');
  if (t) return t;

  // Fallback: größerer Textblock in der Nähe von "Überblick"
  const blocks = $('[class*="Description"], [class*="textBlock"], p').toArray();
  for (const el of blocks) {
    const s = norm($(el).text());
    if (s && s.length > 120) return s;
  }
  return null;
}

function extractRatings($: cheerio.CheerioAPI) {
  const rating =
    textOf(
      $,
      '[data-test="employerReviewsHeader"] ~ div [data-test="rating-headline"] p',
    ) ?? textOf($, '[data-test="employerOverviewModule"] header + span'); // 4,1 ★
  const recommend = textOf($, '[data-test="recommendToFriend"]'); // "85 % würden..."
  const reviewCount = textOf($, '[data-test="review-count"]'); // "(166 Bewertungen...)"
  const ceoName = textOf(
    $,
    '[data-test="ceo-overview"] .review-overview_ceoName__8AcsH, [data-test="ceo-overview"] p',
  );
  const ceoAppr = textOf(
    $,
    '[data-test="ceo-overview"] .review-overview_ceoApproval__oy27U, [data-test="ceo-overview"] p:contains("%")',
  );

  return {
    rating: rating ? rating.replace(/★/g, '').trim() : null,
    recommend_pct: recommend ? recommend.replace(/\s+/g, ' ').trim() : null,
    review_count: reviewCount ? reviewCount.replace(/\s+/g, ' ').trim() : null,
    ceo_name: ceoName ?? null,
    ceo_approval: ceoAppr ?? null,
  };
}

export function parseGlassdoorHtml(
  html: string,
  sourceUrl?: string,
): ParsedCompany {
  const $ = load(html, { decodeEntities: true });

  const name =
    findFirstH1($) ??
    txt($('meta[property="og:title"]').attr('content')) ??
    null;

  const canonical = txt($('link[rel="canonical"]').attr('href')) ?? null;
  const website = findWebsite($);
  const listItems = findOverviewListItems($);
  const details = extractFromDetails(listItems);
  const desc = findDescription($);
  const ratings = extractRatings($);

  const noteLines: string[] = [];
  if (desc) noteLines.push(`**Kurzbeschreibung (Glassdoor):**\n\n${desc}`);
  if (details.company_type)
    noteLines.push(`- Unternehmenstyp: ${details.company_type}`);
  if (details.founded) noteLines.push(`- Gegründet: ${details.founded}`);
  if (details.revenue) noteLines.push(`- Umsatz: ${details.revenue}`);
  if (details.locations_count)
    noteLines.push(`- Standorte: ${details.locations_count}`);
  if (ratings.rating) noteLines.push(`- Bewertung: ${ratings.rating}`);
  if (ratings.recommend_pct)
    noteLines.push(`- Empfehlung: ${ratings.recommend_pct}`);
  if (ratings.review_count)
    noteLines.push(`- Bewertungen: ${ratings.review_count}`);
  if (ratings.ceo_name) noteLines.push(`- CEO: ${ratings.ceo_name}`);
  if (ratings.ceo_approval)
    noteLines.push(`- CEO-Zustimmung: ${ratings.ceo_approval}`);
  if (canonical) noteLines.push(`- Canonical: ${canonical}`);

  return {
    name: name ?? '',
    website: website ?? null,
    city: details.city ?? null,
    size_range: details.size ?? null,
    industry: details.industry ?? null,
    hiring_page: website ?? null,
    note: noteLines.length ? noteLines.join('\n') : null,
    _meta: {
      ...ratings,
      founded: details.founded ?? null,
      revenue: details.revenue ?? null,
      company_type: details.company_type ?? null,
      locations_count: details.locations_count ?? null,
      canonical,
      source_url: sourceUrl ?? null,
    },
  };
}

export async function fetchAndParseGlassdoor(
  url: string,
): Promise<ParsedCompany> {
  // einfache Domain-Validierung
  if (!/^https?:\/\/(www\.)?glassdoor\.[a-z.]+\/.+/i.test(url)) {
    throw new Error('Nur Glassdoor-URLs sind erlaubt.');
  }
  const res = await fetch(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      referer: 'https://www.glassdoor.de/',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return parseGlassdoorHtml(html, url);
}
