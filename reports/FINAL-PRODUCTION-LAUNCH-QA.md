# FINAL PRODUCTION LAUNCH QA — StandbyGeneratorGuide.com

- Date: 2026-10-12. Method: ultimate-seo skill (strict) + repo QA suites + independent probes.
- Source commit under test: see §15. Live verification: https://standbygeneratorguide.com/.

## Verdict: READY TO LAUNCH

No P0/P1 defects remain. One P2 (stale metadata date) and one stale test fixed and
re-verified. GSC indexing and AdSense approval are external Google decisions and are
not claimed; both remain pending owner actions (§9–§10).

## 1. Inventory (Phase 2)

- 72 static `src/pages` routes + dynamic `/models/[slug]/` (data-driven, 32 configs).
- `dist/`: 110 pages + `404.html` + `500.html`. Sitemap: 110 URLs.
- src × dist × sitemap: zero mismatch, zero orphans, zero broken internal links
  (qa-matrix + link sweep). Live sweep 2026-10-12: **110/110 HTTP 200** (Googlebot UA).
- No on-site search UI exists (verified by source grep) — search testing N/A, correctly.

## 2–4. Coverage

- Pages tested: 110/110 (static) + 110/110 live + 110-route browser functional audit.
- Automated suites executed: ~35 (list in §12 of chat log; all PASS, exit 0).
- Manual/repro probes: hub audit (12 pages), content-accuracy review (12 files),
  custom 62-check browser probe (7 viewports × 8 routes + persistence + PDF download +
  print-media + mobile menu/Escape) — all PASS.
- Viewports: 320/375/390/430/768/1024/1440/1920 + 320px-height case. Zero horizontal
  overflow anywhere. Touch targets, sticky header, footer verified via suites.

## 5. Bugs by severity

| ID | Severity | Finding | Root cause | Fix | Evidence |
|---|---|---|---|---|---|
| B1 | P2 | `generac-vs-kohler` showed `updated 2026-10-07` vs sources `verified 2026-10-04` (also fed schema `dateModified`) | stale metadata | aligned `updated` to `2026-10-04` | rebuilt HTML shows matching dates; qa:seo PASS |
| B2 | P2 (test) | `tools/qa-hero.py` asserted a retired inline-SVG hero (`hero svg missing`) | homepage redesign left test stale | rewrote test to current cinematic-hero contract (section + described hi-pri LCP img + H1) | `qa-hero.py` PASS |
| — | info | `qa-granular` notes 404/500 lack canonical | by design: noindex error docs carry no canonical (matches repo convention) | none needed | both `noindex, nofollow`, proper statuses |

P0/P1: none found. No dead buttons (145 buttons exercised), no misleading controls.

## 6. Print/PDF (Phase 5)

- Static: global + per-page `@media print` rules, `beforeprint` detail-opening +
  value-sync handlers, input de-chroming, table repeat headers.
- `tools/qa-pdf.mjs` (poppler `pdftotext`/`pdfinfo`) cannot run on this Windows box —
  marked environment-limited, NOT passed-by-assumption. CI runs it on Ubuntu.
- Substituted with real browser checks (Playwright/Chromium): session persistence
  across reload ✓, `#download-log` yields a valid `%PDF` download ✓, entered values
  present under print emulation ✓, planner print buttons covered by qa-planners ✓.

## 7. Content accuracy (Phase 6)

- Independent review of homepage + 10 hubs + model-spec structure: 11/12 clean
  (all prices/MSRPs source-dated, no testing/licensed/expertise claims, specs
  model-scoped, estimates labeled). Only issue was B1.
- Buyer journeys A–E supported by existing hubs (buying guide, cost + breakdown +
  quote checklist, five-brand + pair comparisons, load-based sizing + wattage chart,
  maintenance + log + schedules). No new claims introduced by this QA round.

## 8. SEO validation (Phase 7)

- 110/110 unique titles/descriptions, self-canonicals, `index, follow`, single H1s,
  110/110 valid JSON-LD, all images alt, 8,843 internal links resolved, keyword map
  (`research/seo/keyword-to-url-map.csv`) actions implemented (4 hub link upgrades).
- No cannibalization created; no splinter pages; no stuffing.

## 9. GSC sitemap status (Phase 8)

- Live: index + child 200 `application/xml`, robots 200, `/sitemap.xml`/http/www/
  pages.dev 301 apex, 110/110 child URLs 200, correct namespaces, no staging refs.
- GSC "Couldn't fetch" is stale console state; resubmission (`sitemap-index.xml`)
  remains an owner action. No GSC success claimed.

## 10. AdSense readiness (Phase 9)

- 110 original pages, privacy (+CMP commitment), About/Contact/Editorial, nav,
  mobile, no pre-approval ad code, `ads.txt` correctly absent. `qa-adsense-readiness`
  PASS. Approval + verification remain owner account actions; no ID invented.

## 11. Accessibility

- axe: 110/110 mobile routes PASS + homepage 320/1440 + no-JS nav + planner audits
  (0 violations incl. populated-quotes case); keyboard focus indicator verified;
  labels/alt/contrast covered by qa-brand (CTA 6.58:1) and suites.
- Statement kept narrow: automated + keyboard checks only, not full WCAG 2.2 AA
  certification (manual screen-reader pass not performed — noted limit).

## 12. Lighthouse (lab, live production)

| Preset | Perf | A11y | BP | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| Desktop | 98 | 100 | 100 | 100 | 0.7s | 0 | 30ms |
| Mobile | 92 | 100 | 100 | 100 | 2.1s | 0 | 260ms |

All targets met (Perf ≥90, others ≥95, LCP ≤2.5, CLS ≤0.1). PSI API quota
exhausted (anonymous), CrUX field data unavailable pre-launch — INP needs real-user
data post-launch. JS/CSS ≈40KB gzip; hero WebP with dimensions + fetchpriority.

## 13–14. Security

- Live headers: HSTS, nosniff, DENY, strict referrer/permissions policies,
  hash-based CSP (no script `unsafe-inline`), MIME-correct sitemap/robots.
- `npm audit`: 0 vulnerabilities. `qa-security` PASS (261 files). No secrets in
  repo/logs. No Cloudflare setting weakened. WAF internals need owner dashboard
  review (Googlebot-UA fetches unchallenged).

## 15–17. Release + deployment + smoke

- Commit: **see `git log` (this report committed alongside B1/B2 fixes)**.
  Push: `main`, no force. Working tree clean otherwise.
- Cloudflare Pages: `deployment.json` commit match verified post-push.
- Post-deploy smoke: homepage, hubs, comparisons, cost/sizing/maintenance,
  maintenance-log download, policy pages, robots/sitemap/redirects — all green.

## 18. Remaining limits (not blockers)

1. GSC resubmission + AdSense application (owner). 2. Full `qa-pdf` poppler run
   (CI/Ubuntu). 3. Screen-reader manual pass. 4. CrUX/INP field data post-launch.
   5. Ahrefs screenshot extraction still pending attachment (seed data in use).
