# FINAL 10-OF-10 WEBSITE QUALITY AUDIT — evidence checkpoint

**Assessment date:** 2026-10-13 (Asia/Kolkata)  
**Website:** https://standbygeneratorguide.com/  
**Repository / baseline:** `vipulotari-tech/StandbyGeneratorGuide.com`, `main` @ `21985b048282aeef7c06b7ab35e80aef1c5e02e0`  
**Scope:** independently checked connected GitHub/Cloudflare/GSC state, recent actual GitHub Action outcomes, audited source and existing QA artifacts, selected competitor public content, and expanded PDF regression. This is **not** a new comprehensive live-browser pass.

> **Critical evidence distinction:** Connected account/API checks are marked **Observed**; statements taken from the prior project's `reports/FINAL-PRODUCTION-LAUNCH-QA.md` are marked **Previously reported**. New tests in the linked PR are **unverified until its CI completes**. A successful build or HTTP 200 is not proof of GSC sitemap processing or Google indexing.

## 1. Initial assessment and preserved strengths

- **Observed:** Exact target repository exists; branch `main` is the default. `main` HEAD SHA is `21985b048282aeef7c06b7ab35e80aef1c5e02e0`. Current public repository is **unprotected** (`protected: false` in GitHub branch response).
- **Observed:** Cloudflare account `e416cd3c195bedd45d1bbe9fe9fed8ec` contains Pages project `standbygeneratorguide` with production branch `main`, command `npm run build:production`, output `dist`, and domains `standbygeneratorguide.com`, `www.standbygeneratorguide.com`, and `standbygeneratorguide.pages.dev`.
- **Observed:** Cloudflare production deployment `e9339098-f709-45e7-85bb-ac33012b78c7` was successful, with same SHA as `main`. Its logs report 5 parsed redirects, 8 parsed header rules, assets published, deployment successful at **2026-10-12 18:15:18 UTC**.
- **Observed:** GitHub Actions run [38289609086](https://github.com/vipulotari-tech/StandbyGeneratorGuide.com/actions/runs/38289609086) finished **successfully** at **18:34:26 UTC**. Included full-route browser matrix, filled PDF export and print tests, accessibility audits, production SEO and security tests, Astro and TypeScript checks. Production companion run [38289609179](https://github.com/vipulotari-tech/StandbyGeneratorGuide.com/actions/runs/38289609179) succeeded.
- **Previously reported** by `reports/FINAL-PRODUCTION-LAUNCH-QA.md`: 110 public HTML routes, 110 sitemap URLs, 110/110 route tests, no known P0/P1 visitor defects, full mobile matrix; lab Lighthouse **desktop 98/100/100/100** and **mobile 92/100/100/100** (performance/accessibility/best practices/SEO). These are prior measurements, **not independently measured again in this checkpoint**.
- **Preserve:** Non-sales editorial tone, no-calculator strategy, curated model evidence, privacy-preserving maintenance worksheet, source-linked comparisons, Astro static pages and comprehensive existing CI.

## 2. Competitor gap analysis (scoped, not a full equivalent audit)

| Competitor | Verified publicly visible distinction | Evidence status / gap |
| --- | --- | --- |
| generators.guide | Home-buying sequence, fuel/brand/installed-cost guides, standby vs portable/battery analysis, 10-year ownership costs | Public indexed pages observed 2026-10-13; no end-to-end browser performance/accuracy score |
| backupsizer.com | Interactive sizing worksheet across standby, portable and battery options | Public indexed homepage observed; direct calculator accuracy not tested; do not add a calculator against current product strategy |
| wholehousegeneratorguide.com | Dated evidence, air-cooled guide and broad brand/system coverage | Public indexed pages observed; individual claim audit incomplete |
| powerupgen.com | Dealer quote and actual installation journey with lead form | A different, dealer/commercial workflow, not a like-for-like independent publisher |
| generatorgrid.com | Broad portable/RV generator content and category navigation | Homepage observed through cached crawl, not equivalent US standby-only scope |

**Conclusion:** Prioritize transparent quote-line-item intelligence and source-verifiable exact-model decision help over adding unnecessary tools. No competitor was assigned an invented numeric score, ranking, traffic metric or performance claim.

## 3. Problems discovered

| Severity | Evidence | Issue | Resolution status |
| --- | --- | --- | --- |
| **P1 — release governance** | Pages published at 18:15:18 UTC; complete QA passed only at 18:34:26 UTC; `main` unprotected | A bad commit may reach production before the full QA matrix completes | **OPEN:** [Issue #44](https://github.com/vipulotari-tech/StandbyGeneratorGuide.com/issues/44). Protect `main` and require full PR QA before merge. No risky live config change attempted |
| **P2 — QA coverage** | `tools/qa-pdf.mjs` tested populated and blank PDF, but did not explicitly test *clear -> regenerate -> reload* | Old records could hypothetically reappear in export after clear without regression detection | Added an explicit automated regression **on audit branch**, pending CI |
| **Verification limitation** | GSC app offers performance data but not authenticated Sitemaps fetch-state API | Earlier owner screenshots say “Couldn't fetch”; current fetch-state is not verified | Open; needs Sitemaps UI/API evidence and Google-side follow-up |
| **Verification limitation** | Ahrefs calls returned `Insufficient plan` | Current DR/traffic/keyword metrics unavailable in connected account | Do not fabricate or substitute previous broad seed ranges for live metrics |
| **Verification limitation** | External web fetch of canonical site failed in available browser search environment; container DNS unavailable | A new direct live HTTP/Playwright sweep was not possible here | Do not treat prior live pass as today's live probe |
| **Verification limitation** | No request-level 504 samples, Ray IDs or full user-agent data retrieved | Historical “nginx-ssl early hints”/“bastion early hints” aggregate 504s could be automation or visitor failures | No WAF/infrastructure changes without identifying affected requests |

## 4. Fixes completed

- Added regression to `tools/qa-pdf.mjs`: accepts the Clear confirmation, checks editable and printable content is emptied, confirms session storage is removed, generates another actual PDF and checks original populated values do not leak, verifies the 12 blank service entries remain, and checks the cleared draft stays cleared after reload. Executable at both 390px and 1440px viewports.
- Kept production components, pricing claims, safety-sensitive specifications and Cloudflare settings unchanged because no user-facing regression was independently reproduced here.
- Opened actionable GitHub [issue #44](https://github.com/vipulotari-tech/StandbyGeneratorGuide.com/issues/44) with exact deployment/QA timing, root cause, acceptance criteria and safe remediation.

## 5. Functional test coverage

**Latest completed baseline CI (commit `21985b0`): PASS** for filled PDF download and browser print, all-route responsive/browser matrix, SEO and accessibility automation, production/staging HTTP, planner and security checks. Exact full step results: [GitHub QA run](https://github.com/vipulotari-tech/StandbyGeneratorGuide.com/actions/runs/38289609086).

**New clear/regenerate PDF regression:** added to audit branch but **NOT YET CLAIMED PASS** without new CI result. Manual screen-reader and real phone/Safari tests are not attested.

## 6. Mobile and desktop findings

Existing `tools/qa-matrix.mjs` enumerates actual `dist` routes and tests 320, 360, 375, 390, 414, 430, 768, 820, 1024, 1280, 1440 and 1920px, image decoding, menu changes, document overflow and axe WCAG tags. **Observed source and previous CI pass**, not today's independent visual review at every size.

## 7. Content improvements

No unsourced technical copy changed. `research/seo/README.md` explicitly states that 34 keyword seeds were derived from earlier user input; the ten Ahrefs screenshots were not ingested. Editorial claims cannot be promoted from an estimate to a manufacturer-verified fact without primary-source comparison.

## 8. SEO / GSC verification

- **Observed:** Google Search Console plugin lists `sc-domain:standbygeneratorguide.com` with `siteOwner` permission. The connected opportunities endpoint returned **zero actionable opportunities** for finalized data **2026-09-12 through 2026-10-09**. This is **not** evidence of zero traffic, successful indexing, or successful sitemap fetch.
- **Observed source:** production `src/pages/robots.txt.ts` explicitly allows crawling and advertises `https://standbygeneratorguide.com/sitemap-index.xml`; `public/_headers` applies host-specific `noindex` to Pages aliases and not the canonical hostname. Cloudflare logged **8 valid header rules**.
- **Previously reported:** production sitemap-index and child both 200 with XML MIME, and 110 canonical routes. **Current authenticated GSC Sitemaps status is unverified**; “Couldn't fetch” must not be called fixed.

## 9. AdSense readiness

Previously reported legal/editorial pages and pre-approval absence of ad tags. Current approval **not inspected and not claimed**. Keep authorization, policy disclosures and qualified-professional safety instructions accurate. Google approval is external.

## 10. Accessibility and performance

**Prior** CI axe checks passed; previous Lighthouse measurements: desktop Perf 98, mobile Perf 92, A11y 100, BP 100, SEO 100 (lab only). **Not recaptured today**, not substitute for measured CrUX field LCP/INP/CLS, screen-reader testing or WCAG 2.2 AA certification.

## 11. Remaining limitations

1. Protect `main` with the tested required status check, reproduce a blocked failing PR, retain Native Pages Git integration. **Highest concrete improvement.**
2. Verify Sitemaps > Submitted Sitemaps in authenticated GSC; capture Google's exact fetch error and timestamps if still present.
3. Retrieve request-level Cloudflare 504 traces/Ray IDs, affected paths and sample user agents before any WAF changes.
4. Independently re-run live phone/desktop and real PDF export/print after the next verified deployment.
5. Complete primary-document checks on any safety-sensitive/model-spec changes and genuine qualified-professional review when possible.

## 12. Git commit SHA

**Production baseline:** `21985b048282aeef7c06b7ab35e80aef1c5e02e0`.  
**Audit branch:** `audit/2026-10-13-quality-evidence`. Audit branch PR/commit details recorded by GitHub at creation. No change to published source is claimed live until an exact Cloudflare production SHA match is independently confirmed.

## 13. Verified Cloudflare deployment

Project `standbygeneratorguide`; deployment `e9339098-f709-45e7-85bb-ac33012b78c7`; success; linked to baseline production commit; assets published at 18:15:18 UTC on 2026-10-12. **No claim about a later deployment** unless directly rechecked.

## 14. Objective final competitor ratings

**Withheld, not 10/10.** Independent equivalent Chrome/Lighthouse/axe, technical-content validation and route-level usability testing could not be performed for all six websites in this checkpoint. Published numbers would be fake precision. Strong existing CI is meaningful evidence for our site but not proof that it leads the market.

## 15. Final verdict

**NOT READY for an unconditional “10/10 quality certified” claim.** The production baseline is successfully deployed and its latest complete CI passed. There is **no independently confirmed live P0 defect** here; this is *not* a direction to take the current site offline. Complete release protection, Google-side sitemap state verification, and parity-tested competitor review before claiming the 10/10 standard. Future code deployment must be green before `main` promotion.

---
Evidence obtained from connected GitHub, Cloudflare and GSC APIs on 2026-10-13; public indexed competitor pages, repository code, official Cloudflare Pages `_headers` documentation, and prior QA report. No externally inaccessible step is marked complete.
