import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { generateFlatSitemap } from './generate-flat-sitemap.mjs';

const origin = 'https://standbygeneratorguide.com';
function fixture() {
  const dir = mkdtempSync(path.join(tmpdir(), 'standby-flat-sitemap-'));
  mkdirSync(path.join(dir, 'cost'));
  const page = (route) =>
    `<html><head><link rel="canonical" href="${origin}${route}"><meta name="robots" content="index, follow"></head></html>`;
  writeFileSync(path.join(dir, 'index.html'), page('/'));
  writeFileSync(path.join(dir, 'cost', 'index.html'), page('/cost/'));
  return dir;
}

test('flat sitemap includes exactly rendered canonical pages without invented dates', () => {
  const dir = fixture();
  try {
    const result = generateFlatSitemap(dir);
    assert.equal(result.urls, 2);
    assert.equal(result.bytes, Buffer.byteLength(readFileSync(path.join(dir, 'sitemap.xml'), 'utf8')));
    const xml = readFileSync(path.join(dir, 'sitemap.xml'), 'utf8');
    assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
    assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
    assert.deepEqual([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]), [origin+'/',origin+'/cost/']);
    assert(!/<lastmod>|<changefreq>|<priority>/.test(xml));
    assert.deepEqual(readdirSync(dir).filter(f => f.startsWith('sitemap')), ['sitemap.xml']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('reject extra index or child sitemap artifacts instead of publishing them', () => {
  const dir = fixture();
  try {
    writeFileSync(path.join(dir, 'sitemap-0.xml'), '<urlset></urlset>');
    assert.throws(() => generateFlatSitemap(dir), /Unexpected sitemap artifact/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('fail closed on canonical mismatch', () => {
  const dir = fixture();
  try {
    writeFileSync(path.join(dir, 'cost', 'index.html'),
      '<html><link rel="canonical" href="https://example.com/cost/"><meta content="index, follow"></html>');
    assert.throws(() => generateFlatSitemap(dir), /Missing or non-canonical URL/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('fail closed on a non-indexable rendered page', () => {
  const dir = fixture();
  try {
    writeFileSync(path.join(dir, 'cost', 'index.html'),
      `<html><link rel="canonical" href="${origin}/cost/"><meta content="noindex, nofollow"></html>`);
    assert.throws(() => generateFlatSitemap(dir), /non-indexable page/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
