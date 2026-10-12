---
name: ultimate-seo
description: Unified SEO workflow for standbygeneratorguide.com combining Claude SEO depth with BeyondSEO evidence discipline. Use for technical audits, sitemap/robots validation, keyword-to-page mapping from user-supplied research, hub improvements, internal linking, schema checks, AdSense readiness, and Cloudflare Pages verification. Astro.js static publisher, US homeowners, no local pages, no calculators.
compatibility: Requires curl + internet for live checks, Node 22 + npm for repo QA, Python 3 only for read-only stdlib scripts. No paid APIs, no crawler deps. Never invent rankings, volumes, or approvals.
---

# Ultimate SEO (Custom Unified Skill)

> **CUSTOM synthesis — not authored by Google, AgriciDaniel, or Beyond Tahir.**
> Combines, in own words, the strongest compatible capabilities of the two vendored
> sources below. For full detail, read the referenced source files; this file routes.
>
> - **Claude SEO** — `claude-seo/` (`AgriciDaniel/claude-seo`, MIT). 25 portable
>   sub-skills, 19 agents, 60 scripts. Depth source: per-area playbooks.
> - **BeyondSEO** — `beyondseo/` (`beyondtahir/beyondseo` v2.9.1, MIT).
>   Discipline source: evidence contracts, buyer-language queries, authorized work.

## 1. Source routing (use the right tool, no duplicates)

| Need | Primary source | Notes |
|---|---|---|
| Sitemap analyze/validate | `claude-seo/skills/seo-sitemap/SKILL.md` | 50k/50MB caps, 200-only, no priority/changefreq |
| Technical audit (9 cats) | `claude-seo/skills/seo-technical/SKILL.md` | Skip IndexNow/Bing; SSG site, critical tags in HTML |
| GSC/PSI/CrUX field data | `claude-seo/skills/seo-google/SKILL.md` | Needs owner credentials; without them, use curl + repo QA |
| Keyword clustering | `claude-seo/skills/seo-cluster/SKILL.md` | SERP-overlap method; no paid API required for small sets |
| Content briefs (new/improve) | `claude-seo/skills/seo-content-brief/SKILL.md` | Improve-existing default; hub-coverage rule |
| E-E-A-T/content quality | `claude-seo/skills/seo-content/SKILL.md` | Near-YMYL bar for electrical/safety topics |
| Schema detect/validate | `claude-seo/skills/seo-schema/SKILL.md` + `claude-seo/schema/templates.json` | JSON-LD only; FAQ rich results retired (info only) |
| Images/alt/perf | `claude-seo/skills/seo-images/SKILL.md` | WebP checked-in, SHA-verified build; hero never lazy |
| AI-citation readiness | `claude-seo/skills/seo-geo/SKILL.md` | Answer blocks, Q-headings, tables; `llms.txt` = zero Google weight |
| Drift/baseline diffs | `claude-seo/skills/seo-drift/SKILL.md` | Baseline before/after deploys when changing SEO surfaces |
| Strategy/roadmap | `claude-seo/skills/seo-plan/SKILL.md` | Publisher branch only |
| Evidence rules + buyer queries | `beyondseo/SKILL.md` §§Understand/Explain + `beyondseo/docs/discovery-and-competitors.md` | Fact/inference/hypothesis labels; natural buyer phrasing |
| Audit delivery contract | `beyondseo/references/audit-delivery.md`, `playbooks/core/seo-house-workflow.md` | Per-finding: URL, evidence, date, impact, action, acceptance check |
| Competitor pages | `claude-seo/skills/seo-competitor-pages/SKILL.md` (filtered) | Neutral roundups only; no sales CTAs, no affiliation bias |
| SXO/intent check | `claude-seo/skills/seo-sxo/SKILL.md` | Page-type vs SERP mismatch verdicts |
| Out of scope | seo-local/maps/hreflang/ecommerce/programmatic + all API-key extensions | National publisher, no GBP/cart/i18n; record as N/A, don't run |

## 2. Non-negotiable rules (BeyondSEO precedence on conflicts)

1. **Evidence labels on every material claim:** Observed / Inference / Hypothesis /
   Unresolved — with source URL + date. Never invent rankings, traffic, volumes, KD,
   citations, or causes of exclusion.
2. **No simulated success:** a fetch script passing is not indexing; GSC "Success" is
   the only indexing evidence; owner-account approval is the only AdSense evidence.
3. **Authorized scope only:** no new pages, no scope expansion, no calculator, no local
   installer pages without explicit owner authorization. Existing `ADS_ENABLED=false`;
   no ad code before approval; `ads.txt` stays absent until Google issues real values.
4. **One strong page per intent:** no keyword-variation splinter pages, no thin/doorway
   pages, no stuffing. Cost queries share one authoritative cost guide where intent matches.
5. **Editorial honesty:** no hands-on-testing, licensed-expertise, or endorsement claims;
   never alter verified manufacturer specs without an authoritative source recheck.
6. **Keyword data discipline:** user-supplied research (e.g., Ahrefs screenshot seed
   ranges `>10,000 / >1,000 / >100 / <100`) are estimates, never precise volumes.
   "Easy" never promises rankings. Exclude irrelevant terms (e.g., non-generator
   phrases) and out-of-model queries.

## 3. Project workflow (Astro + Cloudflare Pages)

1. **Scope:** name URL set, intent, and acceptance checks first.
2. **Live verify (curl, no-follow):** sitemap index + child (200 `application/xml`),
   robots (200 `text/plain`), `/sitemap.xml` + http + www + pages.dev (301 apex),
   sample pages (self-canonical, `index, follow`, no `X-Robots-Tag`).
3. **Repo verify:** `npm run build:production`, `npm run qa:seo`,
   `node tools/qa-indexing.mjs production`, `npm run test:deployment`.
4. **Keyword work:** map user-supplied keywords to real URLs in
   `research/seo/keyword-to-url-map.csv`; actions Keep/Improve/Consolidate/Create;
   clusters in `research/seo/keyword-clusters.md`; raw ranges in
   `research/seo/ahrefs-keyword-research.csv`. Never invent precise volumes.
5. **Implement:** metadata, headings, answer blocks, internal links, schema parity,
   image alts — natural US homeowner English. Keep titles/descriptions unique
   (`qa:seo` enforces). Preserve verified specs and disclosures.
6. **Deploy verify:** push `main` → Pages rebuild → `deployment.json` commit match →
   re-run live checks. Report GSC/AdSense as **pending owner actions**.

## 4. Resolved contradictions (follow these)

- FAQ schema: info-only, no rich-result benefit (claude-seo 2026-05-07 note wins).
- `llms.txt`: keep maintained, claim zero Google weight.
- Crawler identity: Googlebot ≠ Google-Extended; never block Googlebot via robots.
- Scores (E-E-A-T/GEO/SXO numbers) are heuristics, never reported as Google metrics.
