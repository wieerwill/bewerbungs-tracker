import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../src/markdown';

describe('markdown – sanitization', () => {
  it('renders links with rel=noopener and strips scripts', () => {
    const html = renderMarkdown(
      '[x](https://example.com)<script>alert(1)</script>',
    );
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain('<script>');
  });

  it('allows basic tables and code', () => {
    const html = renderMarkdown('|a|b|\n|---|---|\n|1|2|\n\n`code`');
    expect(html).toContain('<table>');
    expect(html).toContain('<code>');
  });

  it('allows maskable img with alt/title, strips onerror', () => {
    const html = renderMarkdown('![alt](x.png "t")');
    expect(html).toContain('<img src="x.png" alt="alt" title="t"');
    expect(html).not.toContain('onerror=');
  });
});
