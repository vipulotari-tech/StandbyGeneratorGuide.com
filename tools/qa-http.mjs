import assert from 'node:assert/strict';
import fs from 'node:fs';

const environment = process.argv[2];
assert(['staging', 'production'].includes(environment), 'Usage: node tools/qa-http.mjs <staging|production>');
const base = (process.env.BASE_URL ?? 'http://127.0.0.1:8321').replace(/\/$/, '');
const request = (path, options = {}) => fetch(base + path, { redirect: 'manual', signal: AbortSignal.timeout(20000), ...options });
const home = await request('/');
assert.equal(home.status, 200);
for (const [header, value] of Object.entries({
  'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin', 'strict-transport-security': 'max-age=31536000',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
})) assert.equal(home.headers.get(header), value, header);
assert.match(home.headers.get('content-security-policy') ?? '', /script-src 'self' 'sha256-/);
const html = await home.text();
if (environment === 'staging') {
  assert.match(home.headers.get('x-robots-tag') ?? '', /noindex/);
  assert.match(html, /content="noindex, nofollow"/);
  assert(!html.includes('rel="canonical"'));
} else {
  assert(!/noindex/i.test(home.headers.get('x-robots-tag') ?? ''));
  assert(html.includes('rel="canonical" href="https://standbygeneratorguide.com/"'));
  assert(!html.includes('tender-telescope.workers.dev'));
}
const robots = await request('/robots.txt');
assert.equal(robots.status, 200);
const robotsText = await robots.text();
assert.match(robotsText, environment === 'staging' ? /Disallow: \// : /Allow: \//);
for (const old of ['/sitemap-index.xml', '/sitemap-0.xml']) {
  assert.equal((await request(old)).status, 404, old + ' must not be published');
}
const directSitemap = await request('/sitemap.xml');
assert.equal(directSitemap.status, environment === 'staging' ? 404 : 200,
  'CalculatorSt-style sitemap.xml must be a direct 200 response, not a redirect');
if (environment === 'production') {
  assert(!/noindex|none/i.test(directSitemap.headers.get('x-robots-tag') ?? ''),
    'Canonical sitemap must not carry a noindex response header');
  assert.match(directSitemap.headers.get('content-type') ?? '', /application\/xml/,
    'Direct sitemap must have XML Content-Type');
  const xml = await directSitemap.text();
  assert(xml.includes('<urlset') && xml.includes('<loc>https://standbygeneratorguide.com/</loc>'),
    'Direct sitemap must expose indexable apex URLs');
  assert(robotsText.includes('Sitemap: https://standbygeneratorguide.com/sitemap.xml'),
    'Robots must advertise direct sitemap');
}
const missing = await request('/qa-deliberately-missing-launch-route/');
assert.equal(missing.status, 404, 'Missing page must not be a soft 404');
assert.match(await missing.text(), /noindex, nofollow/);
for (const privatePath of ['/.env', '/.git/config', '/package.json', '/src/config/site.ts']) {
  assert.equal((await request(privatePath)).status, 404, privatePath);
}
for (const [legacy, target] of [
  ['/sizing/calculator', '/sizing/what-size-generator-do-i-need/'],
  ['/sizing/calculator/', '/sizing/what-size-generator-do-i-need/'],
  ['/author/vipul-otari', '/editorial-team/'],
  ['/author/vipul-otari/', '/editorial-team/'],
]) {
  const response = await request(legacy + '?ref=launch-audit');
  assert.equal(response.status, 301, legacy);
  const destination = new URL(response.headers.get('location'), base);
  assert.equal(destination.origin, new URL(base).origin, 'Legacy redirects must remain same-origin');
  assert.equal(destination.pathname, target, legacy);
  assert.equal(destination.search, '?ref=launch-audit', 'Preserve legacy query');
  assert.equal((await request(destination.pathname)).status, 200);
}
const css = html.match(/href="([^\"]+\.css)"/)?.[1];
assert(css, 'Missing built CSS');
const asset = await request(css);
assert.equal(asset.status, 200);
assert.match(asset.headers.get('content-type') ?? '', /text\/css/);
assert.match(asset.headers.get('cache-control') ?? '', /max-age=31536000.*immutable/);
const manifestResponse = await request('/deployment.json');
assert.equal(manifestResponse.status, 200);
const manifest = await manifestResponse.json();
assert.equal(manifest.environment, environment);
if (process.env.EXPECTED_COMMIT) assert.equal(manifest.commit, process.env.EXPECTED_COMMIT, 'Deployed commit mismatch');
fs.mkdirSync('.qa', { recursive: true });
const report = { result: 'PASS', environment, base, manifest, checked: ['security headers', 'robots', 'sitemap', 'real 404', 'private paths', 'four legacy redirects and queries', 'immutable assets'] };
fs.writeFileSync(`.qa/http-${environment}.json`, JSON.stringify(report, null, 2));
console.log('HTTP deployment QA PASS', report);
