import assert from 'node:assert/strict';
import fs from 'node:fs';

const PAGES_HOST = 'https://standbygeneratorguide.pages.dev';
const APEX_HOST = 'https://standbygeneratorguide.com';

const fetchManual = (url) => fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20000) });

const paths = [
  '/',
  '/cost/standby-generator-cost/',
  '/cost/',
  '/sitemap-index.xml',
  '/sitemap.xml',
  '/robots.txt',
  '/qa-deliberately-missing-launch-route/',
];

const results = [];

// 1. Host-scoped Pages noindex is safe; global or apex noindex is forbidden.
const headersFile = fs.readFileSync('dist/_headers', 'utf8');
let activePattern = '';
const robotsScopes = [];
for (const line of headersFile.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  if (!/^\s/.test(line)) activePattern = trimmed;
  else if (/^X-Robots-Tag:\s*noindex\b/i.test(trimmed)) robotsScopes.push(activePattern);
}
assert.deepEqual(robotsScopes.sort(), [
  'https://standbygeneratorguide.pages.dev/*',
  'https://:version.standbygeneratorguide.pages.dev/*',
].sort(), 'Only Pages aliases may have noindex, not the canonical domain');
results.push('noindex restricted to Pages aliases; canonical domain remains indexable');

// 2. Pages default domain: every path must 301 to the identical apex URL.
for (const path of paths) {
  const res = await fetchManual(PAGES_HOST + path);
  assert.equal(res.status, 301, `pages.dev ${path} must 301 (got ${res.status})`);
  const location = res.headers.get('location');
  assert(location, `pages.dev ${path} missing Location header`);
  const dest = new URL(location);
  assert.equal(dest.origin, APEX_HOST, `pages.dev ${path} must redirect to apex origin (got ${dest.origin})`);
  assert.equal(dest.pathname + dest.search, path, `pages.dev ${path} must preserve path+query`);
  assert(!/noindex/i.test(res.headers.get('x-robots-tag') ?? ''), `pages.dev ${path} redirect must not need a noindex header`);
  results.push(`pages.dev ${path} -> 301 ${dest.pathname}`);
}

// Query preservation check.
const qRes = await fetchManual(`${PAGES_HOST}/cost/standby-generator-cost/?ref=qa-test`);
assert.equal(qRes.status, 301);
assert.equal(new URL(qRes.headers.get('location')).search, '?ref=qa-test', 'pages.dev redirect must preserve query');
results.push('pages.dev query string preserved');

// 3. Apex must remain fully indexable: 200s, no noindex header, canonical apex, robots Allow, sitemap apex URLs.
const apexHome = await fetchManual(`${APEX_HOST}/`);
assert.equal(apexHome.status, 200, 'apex homepage must be 200');
assert(!/noindex/i.test(apexHome.headers.get('x-robots-tag') ?? ''), 'apex must not send X-Robots-Tag noindex');
const apexHtml = await apexHome.text();
assert(apexHtml.includes('rel="canonical" href="https://standbygeneratorguide.com/"'), 'apex canonical must be apex');
assert(!apexHtml.includes('standbygeneratorguide.pages.dev'), 'apex HTML must not reference pages.dev');
results.push('apex / 200, canonical apex, no noindex header');

const apexArticle = await fetchManual(`${APEX_HOST}/cost/standby-generator-cost/`);
assert.equal(apexArticle.status, 200, 'apex article must be 200');
assert(!/noindex/i.test(apexArticle.headers.get('x-robots-tag') ?? ''), 'apex article must not send noindex');
results.push('apex article 200, indexable');

const apexCategory = await fetchManual(`${APEX_HOST}/cost/`);
assert.equal(apexCategory.status, 200, 'apex category must be 200');
results.push('apex category 200');

const apexRobots = await (await fetchManual(`${APEX_HOST}/robots.txt`)).text();
assert.match(apexRobots, /Allow: \//, 'apex robots.txt must Allow');
assert.match(apexRobots, /https:\/\/standbygeneratorguide\.com\/sitemap\.xml/, 'apex robots.txt direct sitemap must be apex');
results.push('apex robots.txt Allow + apex sitemap');

const directSitemapRes = await fetchManual(`${APEX_HOST}/sitemap.xml`);
assert.equal(directSitemapRes.status, 200, 'apex direct sitemap.xml must be 200');
assert.match(directSitemapRes.headers.get('content-type') ?? '', /application\/xml/);
assert((await directSitemapRes.text()).includes('<loc>https://standbygeneratorguide.com/</loc>'));
results.push('apex /sitemap.xml direct 200 XML with canonical URLs');

const apexSitemapRes = await fetchManual(`${APEX_HOST}/sitemap-index.xml`);
assert.equal(apexSitemapRes.status, 200, 'apex sitemap must be 200');
assert((await apexSitemapRes.text()).includes('https://standbygeneratorguide.com/sitemap-0.xml'), 'apex sitemap URLs must be apex');
results.push('apex sitemap-index.xml 200 with apex URLs');

const apexMissing = await fetchManual(`${APEX_HOST}/qa-deliberately-missing-launch-route/`);
assert.equal(apexMissing.status, 404, 'apex missing page must be 404');
results.push('apex 404 returns 404');

fs.mkdirSync('.qa', { recursive: true });
const report = { result: 'PASS', pagesHost: PAGES_HOST, apexHost: APEX_HOST, checked: results };
fs.writeFileSync('.qa/pages-domain.json', JSON.stringify(report, null, 2));
console.log('Pages default-domain QA PASS', report);
