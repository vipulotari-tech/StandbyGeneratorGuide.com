import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * CalculatorSt-style, directly fetchable /sitemap.xml: a flat canonical URL
 * set, built from the actual Astro output rather than a hand-maintained list.
 *
 * Retain Astro's existing /sitemap-index.xml and /sitemap-0.xml for previously
 * submitted Search Console sitemaps. The two representations must stay equal.
 */
export function generateFlatSitemap(directory, origin = 'https://standbygeneratorguide.com') {
  const files = readdirSync(directory, { recursive: true })
    .filter((file) => file.endsWith('index.html'));
  assert(files.length >= 1, 'No rendered HTML pages found for production sitemap');

  const urls = new Set();
  for (const file of files) {
    const route = '/' + file.replaceAll('\\', '/').replace(/index\.html$/, '');
    const html = readFileSync(path.join(directory, file), 'utf8');
    assert(html.includes('content="index, follow"'),
      `Sitemap cannot include a non-indexable page: ${route}`);
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    assert.equal(canonical, origin + route, `Missing or non-canonical URL for ${route}`);
    assert(!urls.has(canonical), `Duplicate sitemap URL: ${canonical}`);
    urls.add(canonical);
  }

  // One flat sitemap is valid only under Google's 50,000 URL / 50 MiB limits.
  assert(urls.size <= 50000, 'Flat sitemap exceeds 50,000 URLs; split sitemaps instead');

  const legacyFiles = readdirSync(directory)
    .filter((file) => /^sitemap-\d+\.xml$/.test(file));
  assert.equal(legacyFiles.length, 1,
    'Expected exactly one existing Astro sitemap child; retain the index if more are generated');
  const legacyXml = readFileSync(path.join(directory, legacyFiles[0]), 'utf8');
  assert(legacyXml.includes('<urlset'), 'Legacy Astro sitemap child is not a URL set');
  const legacyLocs = [...legacyXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
    match[1].replaceAll('&amp;', '&'));
  assert.deepEqual(new Set(legacyLocs), urls,
    'Flat sitemap routes differ from legacy sitemap; investigate before publishing');

  const ordered = [...urls].sort((a, b) => a === origin + '/' ? -1 : b === origin + '/' ? 1 : a.localeCompare(b));
  const escapeXml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
  const entries = ordered.map((url) =>
    `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
  assert(Buffer.byteLength(xml, 'utf8') <= 50 * 1024 * 1024, 'Flat sitemap exceeds 50 MiB');
  writeFileSync(path.join(directory, 'sitemap.xml'), xml, 'utf8');
  return { urls: urls.size, bytes: Buffer.byteLength(xml, 'utf8'), legacy: legacyFiles[0] };
}
