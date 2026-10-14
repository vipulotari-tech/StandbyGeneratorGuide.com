import assert from 'node:assert/strict';
import { test } from 'node:test';
import redirect from '../workers/www-redirect.mjs';
import { inlineScriptHashes, securityPolicy } from './security-policy.mjs';

test('www and legacy domains redirect to fixed HTTPS apex preserving path and query', () => {
  for (const origin of ['http://www.standbygeneratorguide.com', 'https://www.standbygeneratorguide.com', 'http://localhost:8322', 'https://www.homegeneratorguide.com', 'https://homegeneratorguide.com', 'http://homegeneratorguide.com']) {
    const response = redirect.fetch(new Request(origin + '/cost/standby-generator-cost/?utm_source=mail&x=%2F'));
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('location'), 'https://standbygeneratorguide.com/cost/standby-generator-cost/?utm_source=mail&x=%2F');
    assert.equal(response.headers.get('strict-transport-security'), 'max-age=31536000');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal(response.headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()');
  }
});
test('redirect cannot use a user-controlled destination', () => {
  const response = redirect.fetch(new Request('https://www.standbygeneratorguide.com//evil.example/path?next=https://evil.example'));
  assert.equal(new URL(response.headers.get('location')).origin, 'https://standbygeneratorguide.com');
});
test('CSP permits only exact executable inline content and deduplicates hashes', () => {
  const html = '<script type="module">console.log("trusted")</script><script type="application/ld+json">{"name":"Site"}</script>';
  const [hash] = inlineScriptHashes(html);
  const policy = securityPolicy([html, html]);
  assert.equal(policy.split(hash).length - 1, 1);
  assert.notEqual(inlineScriptHashes('<script>console.log("changed")</script>')[0], hash);
  assert.equal(inlineScriptHashes('<script src="/app.js"></script>').length, 0);
  assert(!policy.match(/script-src[^;]*unsafe-/));
  assert(policy.includes("frame-ancestors 'none'"));
});

test('CSP permits the configured analytics script and collection without unsafe execution', () => {
  const policy = securityPolicy(['<script>window.dataLayer = [];</script>']);
  const directives = new Map(policy.split('; ').map(part => {
    const [name, ...sources] = part.split(' ');
    return [name, sources];
  }));
  assert(directives.get('script-src').includes('https://www.googletagmanager.com'));
  assert(directives.get('connect-src').includes('https://*.google-analytics.com'));
  assert(directives.get('img-src').includes('https://*.google-analytics.com'));
  assert(!policy.includes("'unsafe-eval'"));
  assert(!directives.get('script-src').includes("'unsafe-inline'"));
  assert(!directives.get('script-src').includes('*'));
  assert.deepEqual(directives.get('frame-src'), ["'none'"]);
});
