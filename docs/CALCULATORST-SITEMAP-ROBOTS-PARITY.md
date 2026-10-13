# CalculatorSt robots.txt and sitemap pattern → StandbyGeneratorGuide.com

**Date:** 2026-10-13  
**CalculatorSt repository:** `vipulotari-tech/calculatorst.com`, main commit `3dd00181e82479075789d980e99a7f7af567c03d`  
**StandbyGeneratorGuide.com baseline:** `vipulotari-tech/StandbyGeneratorGuide.com`, main commit `21985b048282aeef7c06b7ab35e80aef1c5e02e0`.

## Evidence and limitations

- **Observed live:** a Cloudflare Browser Rendering request to `https://calculatorst.com/robots.txt` returned the four allowed groups (Googlebot, Googlebot-Image, Google-Extended, and `*`) and `Sitemap: https://calculatorst.com/sitemap.xml` on 2026-10-13.
- **Observed repository source, not live HTTP:** CalculatorSt `src/pages/sitemap.xml.ts` builds a direct, UTF-8 XML `<urlset>` from canonical category/calculator routes, without synthetic `lastmod`; `src/pages/robots.txt.ts` matches the live robots document. The attempt to fetch the live CalculatorSt XML sitemap was rate-limited and is **not** recorded as verified live.
- **Observed source:** SGG previously generated Astro `/sitemap-index.xml` and `/sitemap-0.xml`, and appended `/sitemap.xml /sitemap-index.xml 301` in `tools/build-site.mjs`.
- **Standards:** Google accepts both `urlset` and index sitemaps; there is no SEO ranking preference. A single sitemap has a 50,000-URL/50-MiB cap. `lastmod` is optional, but should be accurate when supplied. Google-Extended is a Google content-use control (training and grounding), not a Google Search ranking or inclusion directive. Official references: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap and https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers .

## Implemented changes (on this PR branch; merge only after successful CI)

1. Production `robots.txt` mirrors CalculatorSt groups exactly, using SGG's own apex hostname and direct `/sitemap.xml`. Staging `robots.txt` still says `Disallow: /` and has no sitemap.
2. `tools/generate-flat-sitemap.mjs` builds a directly served `dist/sitemap.xml` from **actual rendered, canonical, indexable HTML**, not a manual URL list. It publishes only apex URLs, no inferred `lastmod`, `changefreq`, or `priority`.
3. Astro's existing `sitemap-index.xml` and `sitemap-0.xml` remain available so any older Google Search Console submissions do not break. The builder requires exact URL-set parity with the child sitemap. If the number of child sitemaps increases, fail safely instead of publishing a partial root sitemap.
4. Removed SGG's build-time `/sitemap.xml` redirect to the index; response becomes direct 200 XML with explicit Content-Type and cache headers.
5. Extended unit/HTTP/SEO/Pages-domain checks to require a direct sitemap and complete, duplicate-free canonical URLs; kept existing domain-alias redirects, security headers, indexation guards and staging exclusions unchanged.

## Required release acceptance

- `npm run test:deployment` (includes flat sitemap unit tests) PASS.
- `npm run build:staging`: no sitemap files, robots `Disallow: /`, staging `noindex`.
- `npm run build:production`: real `dist/sitemap.xml` XML, zero missing/extra URL or redirect, existing index/child stay present; `npm run qa:seo` PASS.
- `npm run qa:http:production`: `GET /sitemap.xml` direct 200 `application/xml`, plus old index 200.
- GitHub CI green before main merge; post-deployment confirm exact Pages SHA; manually inspect live robot/sitemap and GSC submitted sitemap status.

**Important:** Updating sitemap location does **not** by itself fix GSC “Couldn't fetch,” change Google crawl frequency, or guarantee indexing. Submitting `sitemap.xml` in authenticated Google Search Console is a separate verification/action.
