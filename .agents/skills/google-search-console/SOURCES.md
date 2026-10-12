# Sources — google-search-console skill (custom)

This skill is **custom-written for this repository**; it is not authored by Google
and contains no copied upstream skill text.

Reference inputs consulted during skill discovery (2026-10-12):

- Official Google skills collection: https://github.com/google/skills (Apache-2.0,
  ~21.2k stars). Verified to contain **no** Search Console, sitemap, robots.txt, or
  publisher-AdSense skill — only Analytics APIs and advertiser-side Ads API/Mobile Ads
  (AdMob) skills, which are out of scope here. Nothing vendored from it.
- Community GSC API skill: https://github.com/SeoToolkit/web-analytics-agent-skill
  (45 stars, single commit, **no license file** → not vendored verbatim; OAuth/API-key
  workflow informed §5's no-credentials stance). Attribution retained via this link.
- Official Google Search Central documentation (sitemap protocol, robots.txt
  specifications, Search Console sitemap report behavior) as the normative basis for
  §§3–4. Key pages: `developers.google.com/search/docs/crawling-indexing/sitemaps/*`,
  `.../robots/*`, `support.google.com/webmasters/answer/7451001` (sitemap report errors).
- This repository's own verified production behavior (curl-measured 2026-10-12) for §1–§2.
