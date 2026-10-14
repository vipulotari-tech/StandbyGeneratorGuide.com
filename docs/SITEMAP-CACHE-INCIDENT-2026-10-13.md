# Sitemap delivery investigation — 2026-10-13

## Confirmed production fault

At the start of this audit, production was serving commit
`af86e179448714915f936e43de6c32bdc8ae4a97`, Pages deployment
`27e7dcef-bb05-4b48-981d-d533c7b80d9c` (successful at 05:34:30 UTC).
That build contains only `sitemap.xml`. Its live bytes match a fresh local
production build: 110 URLs, 10,259 bytes, SHA-256
`2eff328e729ce863004f54377895ee7955b93e2e5962fe6af2fd8d5f774471e1`.

Nevertheless, the bare `/sitemap-index.xml` and `/sitemap-0.xml` URLs still
returned HTTP 200 XML with `X-Robots-Tag: noindex` and
`Cache-Control: public, s-maxage=604800`. Observed Age values were 48,613 and
5,650 seconds respectively. Query-string variants returned the current 404.
A successful, targeted zone purge of all three sitemap URLs did not eliminate
the stale bare-URL responses. The existing production HTTP test reproduced
the problem: expected old sitemap 404, received 200.

This establishes stale retired-asset delivery. It does not establish which
internal cache tier retained the response or exactly what Google received.
Do not describe this evidence as proof of the entire GSC failure's cause.

## Fix

Pages middleware now returns an explicit, non-cacheable 404 for retired index
and numbered child sitemap paths before calling the asset handler. Query
variants and HEAD are covered. Domain-alias redirects and the canonical
`/sitemap.xml` response are preserved. No content, layouts, WAF protection,
DNS records, or Google submissions are changed.

## Verification and limits

- Initial live audit: 110/110 pages returned 200 HTML, matching canonicals,
  and no noindex metadata or headers.
- Production build, sitemap parity, SEO and security checks passed.
- Cloudflare zone: no custom rulesets, IP access rules, Page Rules or Worker
  routes. Bot Fight Mode and crawler protection were disabled.
- Sampled firewall-event query for 00:00–06:20 UTC returned no records;
  an empty sampled dataset does not prove no historical blocking.
- Requests with Googlebot and InspectionTool user-agent strings returned the
  same current XML. These are simulated clients, not verified Google fetches.
- Analytics exposed requests bearing a Googlebot user agent, but this plan
  denied the bot-management/ASN fields needed to substantiate their identity.
- The attached GSC screenshots show successful processing of an older index
  and failed child fetches. The authenticated GSC session was unavailable;
  the detailed Google failure reason and current processing status remain
  unverified.

Reproduce production checks after deployment:

```sh
BASE_URL=https://standbygeneratorguide.com EXPECTED_COMMIT=<deployed-sha> npm run qa:http:production
EXPECTED_URLS=110 python3 tools/qa-live-sitemap.py
```

In Search Console, retain only the canonical sitemap submission. Inspect
`https://standbygeneratorguide.com/sitemap.xml` with **Test live URL** and
check **Crawl allowed: Yes** and **Page fetch: Successful**. Do not repeatedly
resubmit. A successful live fetch does not itself prove successful sitemap
processing or URL indexing.
