import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { securityPolicy } from './security-policy.mjs';
import { generateFlatSitemap } from './generate-flat-sitemap.mjs';

const environment = process.argv[2] ?? 'production';
if (!['production', 'staging'].includes(environment)) {
  console.error('Usage: node tools/build-site.mjs <production|staging>');
  process.exit(2);
}

// Verify user-supplied WebP bytes checked into Git, without external network calls.
const imageSync = spawnSync(process.execPath, ['tools/sync-user-editorial-images.mjs'], { stdio: 'inherit' });
if (imageSync.status !== 0) process.exit(imageSync.status ?? 1);

const evidence = spawnSync(process.execPath, ['tools/validate-evidence.mjs'], {stdio:'inherit'});
if(evidence.status!==0) process.exit(evidence.status??1);

const astroCli = resolve('node_modules/astro/bin/astro.mjs');
// Start with an empty generated output directory. A previous target's HTML must
// not survive or be served while Astro prerenders the next target.
const outputDirectory = resolve('dist');
mkdirSync(outputDirectory, { recursive: true });
// Keep the directory itself: Windows preview watchers can hold its handle open.
for (const entry of readdirSync(outputDirectory)) {
  rmSync(resolve(outputDirectory, entry), { recursive: true, force: true, maxRetries: 3 });
}
// Environment-specific metadata must never reuse pages from the other target.
// Force a full build when switching between staging and production in one checkout.
const result = spawnSync(process.execPath, [astroCli, 'build', '--force'], {
  stdio: 'inherit',
  env: { ...process.env, PUBLIC_SITE_ENV: environment },
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);

// Production publishes a direct /sitemap.xml like CalculatorSt.
// Preserve Astro's index and child files for existing GSC submissions.
if (environment === 'staging') {
  for (const file of readdirSync(resolve('dist'))) {
    if (/^sitemap(?:-.*)?\.xml$/i.test(file)) rmSync(resolve('dist', file));
  }
} else {
  console.log('Flat sitemap:', generateFlatSitemap(resolve('dist')));
}

// Static host header files are deployment-specific. Add staging's response-
// level noindex directive to the existing global rule instead of creating a
// second wildcard rule that some static hosts may parse inconsistently.
const headersPath = resolve('dist/_headers');
const baseHeaders = readFileSync(resolve('public/_headers'), 'utf8').trimEnd();
const htmlPages = readdirSync(resolve('dist'), { recursive: true })
  .filter((file) => file.endsWith('.html'))
  .map((file) => readFileSync(resolve('dist', file), 'utf8'));
const cspLine = `  Content-Security-Policy: ${securityPolicy(htmlPages)}`;
if (cspLine.length > 2000) throw new Error('CSP exceeds Cloudflare header line limit. Externalize inline scripts.');
let outputHeaders = baseHeaders.replace(/^  Content-Security-Policy:.*$/m, cspLine);
if (environment === 'staging') {
  const globalRule = /^\/\*$/m;
  if (!globalRule.test(baseHeaders)) {
    throw new Error('Expected a global /* rule in public/_headers for the staging noindex header.');
  }
  outputHeaders = outputHeaders.replace(globalRule, '/*\n  X-Robots-Tag: noindex, nofollow');
}
writeFileSync(headersPath, `${outputHeaders.trimEnd()}\n`, 'utf8');
const gitCommit = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
writeFileSync(resolve('dist/deployment.json'), JSON.stringify({
  environment,
  commit: process.env.CF_PAGES_COMMIT_SHA ?? process.env.GITHUB_SHA ?? gitCommit.stdout?.trim() ?? 'unknown',
}) + '\n');
// Cloudflare's Git build runs this command without the full GitHub QA workflow.
// Refuse deployment output whose indexing state disagrees with its target.
const indexing = spawnSync(process.execPath, ['tools/qa-indexing.mjs', environment], { stdio: 'inherit' });
if (indexing.status !== 0) process.exit(indexing.status ?? 1);
console.log(`Built ${environment} output; robots metadata and canonical origin are environment-specific.`);
