---
name: google-search-console
description: Diagnose Google Search Console sitemap, crawling, and indexing issues for this project. Use when submitting or debugging sitemaps, fixing "Couldn't fetch" errors, validating robots.txt, checking Googlebot accessibility, canonicals, and index directives. Project-specific: standbygeneratorguide.com on Cloudflare Pages.
compatibility: Requires curl and internet access for live HTTP checks; Python 3 for XML parsing. No Google API credentials required. Read-only except resubmission actions performed by the site owner in the GSC UI.
---

# Google Search Console (Custom Project Skill)

> **CUSTOM skill — not authored by Google.** Workflow below is written for this
> repository from official Google Search Central documentation and the site's
> verified production behavior. It fetches no private GSC data and needs no API keys.

## 1. Canonical endpoints (production)

- Sitemap index: `https://standbygeneratorguide.com/sitemap-index.xml`
- Sitemap child: `https://standbygeneratorguide.com/sitemap-0.xml`
- Legacy alias: `https://standbygeneratorguide.com/sitemap.xml` → **301** to the index
- Robots: `https://standbygeneratorguide.com/robots.txt`

## 2. Live fetch checklist (run before touching GSC)

Do NOT trust browser rendering as proof of Googlebot accessibility. Use no-follow
requests so redirects are observed, not silently followed:

```powershell
curl.exe -s -o NUL -w "%{http_code} %{content_type} %{redirect_url}\n" --max-time 25 "https://standbygeneratorguide.com/sitemap-index.xml"
curl.exe -s -o NUL -w "%{http_code} %{content_type} %{redirect_url}\n" --max-time 25 "https://standbygeneratorguide.com/sitemap-0.xml"
curl.exe -s -o NUL -w "%{http_code} %{content_type} %{redirect_url}\n" --max-time 25 "https://standbygeneratorguide.com/robots.txt"
```

Expected: index + child → `200 application/xml…`; robots → `200 text/plain…`;
`/sitemap.xml`, `http://`, `www.`, and `*.pages.dev` → `301` to the canonical apex.

## 3. Sitemap validity rules (Google Search Central)

- UTF-8, valid XML, `sitemapindex`/`urlset` namespace `http://www.sitemaps.org/schemas/sitemap/0.9`.
- Absolute canonical URLs only; every `<loc>` must return HTTP 200 (spot-check with a
  Googlebot UA string; a full sweep script lives in the project's QA history).
- Max 50,000 URLs / 50 MB uncompressed per file (this site: ~110 URLs, ~10 KB).
- Exclude staging/preview hosts, redirect targets' sources, 404s, and noindex pages.
- `robots.txt` must `Allow: /` and advertise exactly one index URL.

## 4. "Couldn't fetch" decision tree

1. **Re-run the live checklist (§2).** Any non-200, wrong MIME, or redirect on the
   submitted URL is the cause — fix in `public/_headers`, `dist/_redirects`
   (via `tools/build-site.mjs`), or `functions/_middleware.js`, rebuild, redeploy.
2. **Stale GSC state.** If live is green, the GSC row predates the fix: in the GSC
   Sitemaps page remove the failed entry (row menu → Remove), re-add
   `sitemap-index.xml`, Submit.
3. **Wait for reprocessing.** "Last read" populates on Google's retry (hours to ~2 days).
   Confirm with URL Inspection → "Test live URL" on the sitemap URL.
4. **Still failing after 48h with green live checks:** suspects are (a) wrong GSC
   property (use the Domain property or exact `https://standbygeneratorguide.com`
   URL-prefix property), or (b) Cloudflare challenging Google's crawler IPs —
   inspect Cloudflare Security → Bots/WAF events for blocked ASN 15169 around the
   retry time. Escalate to the site owner; never disable WAF globally.
5. **Never claim** successful indexing from HTTP checks alone. GSC "Success" is the
   only acceptable evidence.

## 5. Repo QA mapping

- `npm run build:production` — rebuilds `dist/` (sitemaps, robots, `_headers`, `_redirects`).
- `npm run qa:seo` — asserts every route is in the sitemap, canonicals self-reference.
- `node tools/qa-indexing.mjs production` — robots/sitemap/noindex/canonical guards.
- `npm run test:deployment` — www/pages.dev redirect unit tests.
- Live proof: `https://standbygeneratorguide.com/deployment.json` must show the
  deployed commit SHA and `"environment":"production"`.
