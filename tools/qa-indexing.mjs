import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const environment = process.argv[2];
assert(['production', 'staging'].includes(environment), 'Usage: node tools/qa-indexing.mjs <production|staging>');

const dist = path.resolve('dist');
const productionOrigin = 'https://standbygeneratorguide.com';
const stagingOrigin = 'https://homegeneratorguide.tender-telescope.workers.dev';
const criticalRoutes = [
  '/cost/standby-generator-cost/',
  '/sizing/what-size-generator-do-i-need/',
  '/planning/sizing/',
  '/installation/what-to-expect/',
  '/comparisons/generac-vs-kohler/',
];

const htmlFiles = fs.readdirSync(dist, { recursive: true })
  .filter((file) => file.endsWith('index.html'));

const pages = new Map();
for (const file of htmlFiles) {
  const normalized = file.replaceAll('\\', '/');
  const route = '/' + normalized.replace(/index\.html$/, '');
  pages.set(route, fs.readFileSync(path.join(dist, file), 'utf8'));
}

assert(pages.size >= 50, `Expected a substantial static site; found only ${pages.size} indexable-style HTML routes`);
const robots = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8');
const sitemapFiles = fs.readdirSync(dist).filter((file) => /^sitemap(?:-.*)?\.xml$/i.test(file));
const headers = fs.readFileSync(path.join(dist, '_headers'), 'utf8');

if (environment === 'staging') {
  assert.match(robots, /User-agent:\s*\*/i);
  assert.match(robots, /Disallow:\s*\//i);
  assert.equal(sitemapFiles.length, 0, 'Staging must not publish sitemap files');
  assert.match(headers, /X-Robots-Tag:\s*noindex,\s*nofollow/i, 'Staging must send a response-level noindex header');

  for (const [route, html] of pages) {
    assert(html.includes('content="noindex, nofollow"'), 'Staging robots meta missing: ' + route);
    assert(!/<link rel="canonical"/.test(html), 'Staging must not emit a canonical: ' + route);
    assert(!/<script type="application\/ld\+json">/.test(html), 'Staging must not emit structured data: ' + route);
  }

  console.log('Staging indexing guard PASS', { pages: pages.size, sitemapFiles: 0, robots: 'blocked' });
  process.exit(0);
}

assert.match(robots, /Allow:\s*\//i, 'Production robots.txt must allow crawling');
assert(!/Disallow:\s*\//i.test(robots), 'Production robots.txt must not block the site root');
for (const agent of ['Googlebot', 'Googlebot-Image', 'Google-Extended', '*']) {
  assert(robots.includes(`User-agent: ${agent}\nAllow: /`),
    `Production robots.txt must permit ${agent} like CalculatorSt`);
}
assert(robots.includes(`Sitemap: ${productionOrigin}/sitemap.xml`),
  'Production robots.txt must advertise the direct /sitemap.xml');
assert(!robots.includes(stagingOrigin), 'Production robots.txt must not reference staging');
// Host-scoped Pages noindex rules are required; the canonical host remains indexable.
const noindexScopes = [];
let currentScope = '';
for (const line of headers.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  if (!/^\s/.test(line)) currentScope = trimmed;
  else if (/^X-Robots-Tag:\s*noindex\b/i.test(trimmed)) noindexScopes.push(currentScope);
}
assert.deepEqual(noindexScopes.sort(), [
  'https://standbygeneratorguide.pages.dev/*',
  'https://:version.standbygeneratorguide.pages.dev/*',
].sort(), 'Only production and preview Pages aliases must receive X-Robots-Tag noindex; never the canonical domain');
assert(sitemapFiles.includes('sitemap.xml'), 'Production must publish direct sitemap.xml');
assert(sitemapFiles.includes('sitemap-index.xml'), 'Keep legacy sitemap index for existing GSC submissions');
assert(sitemapFiles.includes('sitemap-0.xml'), 'Keep legacy child sitemap for existing GSC submissions');
const sitemapXml = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
assert.match(sitemapXml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/,
  'Direct sitemap must be an XML URL set, not an index');
assert(!/<(?:lastmod|priority|changefreq)>/.test(sitemapXml),
  'Do not publish fabricated sitemap dates or obsolete metadata');
const canonicalLocations = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((match) => match[1].replaceAll('&amp;', '&'));
assert.equal(new Set(canonicalLocations).size, canonicalLocations.length,
  'Direct sitemap contains duplicate locations');
assert.deepEqual(new Set(canonicalLocations),
  new Set([...pages.keys()].map((route) => productionOrigin + route)),
  'Direct sitemap must include exactly all indexable canonical page routes');
const redirects = fs.readFileSync(path.join(dist, '_redirects'), 'utf8');
assert(!/^\/sitemap\.xml\s/m.test(redirects),
  'Direct /sitemap.xml must not be redirected to an index');

// Check every published text file, including error documents and JS bundles.
for (const entry of fs.readdirSync(dist, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const file = path.join(entry.parentPath, entry.name);
  const content = fs.readFileSync(file);
  assert(!content.includes(Buffer.from(stagingOrigin)), 'Staging origin leaked into production artifact: ' + path.relative(dist, file));
}

const sitemap = sitemapFiles.map((file) => fs.readFileSync(path.join(dist, file), 'utf8')).join('\n');
assert(!sitemap.includes(stagingOrigin), 'Production sitemap must not reference staging');
assert(!sitemap.includes('/404/'), '404 must not be in the production sitemap');

const inboundSources = new Map(criticalRoutes.map((route) => [route, new Set()]));

for (const [route, html] of pages) {
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  assert.equal(canonical, productionOrigin + route, 'Production self-canonical mismatch: ' + route);
  assert(html.includes('content="index, follow"'), 'Production page is not index/follow: ' + route);
  assert(!html.includes('content="noindex, nofollow"'), 'Production noindex leaked into: ' + route);
  assert(!canonical.includes(stagingOrigin), 'Staging canonical leaked into: ' + route);
  assert(!html.includes(stagingOrigin), 'Staging origin leaked into production HTML: ' + route);

  for (const match of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
    const href = match[1];
    if (!href.startsWith('/')) continue;
    const target = new URL(href, productionOrigin).pathname;
    if (target !== route && inboundSources.has(target)) inboundSources.get(target).add(route);
  }
}

for (const criticalRoute of criticalRoutes) {
  assert(pages.has(criticalRoute), 'Critical SEO route missing from production build: ' + criticalRoute);
  assert(sitemap.includes(`<loc>${productionOrigin}${criticalRoute}</loc>`), 'Critical SEO route missing from sitemap: ' + criticalRoute);
  const sources = inboundSources.get(criticalRoute);
  assert(sources.size >= 3, `Critical route needs at least 3 distinct internal-link sources: ${criticalRoute}; found ${sources.size}`);
}

console.log('Production indexing guard PASS', {
  pages: pages.size,
  sitemapFiles: sitemapFiles.length,
  criticalRoutes: Object.fromEntries([...inboundSources].map(([route, sources]) => [route, sources.size])),
  canonicalOrigin: productionOrigin,
});
