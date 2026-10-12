---
name: google-adsense
description: Audit this project's readiness for Google AdSense program policies and site review. Use when checking ownership verification, ads.txt, privacy policy, navigation, original-content sufficiency, trust signals, and mobile usability. Never approves or guarantees AdSense acceptance; account actions stay with the site owner.
compatibility: Requires curl and internet access for live checks. No AdSense account access needed or used. Read-only; never inject ad code or fabricate publisher IDs.
---

# Google AdSense Readiness (Custom Project Skill)

> **CUSTOM skill — not authored by Google.** Do not confuse Google **AdSense**
> (publisher monetization, this skill) with Google **Ads** (advertiser platform) or
> AdMob Mobile Ads SDK — different products, policies, and integrations.

## 1. Account-side actions (site owner only, never the agent)

- Site ownership verification in the AdSense account (meta tag or `ads.txt` snippet
  exactly as issued by Google for **that** account).
- `ads.txt` lines must use **authentic account values only**. Never invent a
  `pub-XXXXXXXXXXXXXXXX` ID. Correct form once issued:
  `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f79c000000000000` (certification ID may vary).
- The "Ready for review / Request review" button and any policy-violation appeals.

## 2. Site-readiness audit checklist

Run each check and record Observed / Missing:

1. **Crawlability:** homepage + key templates return 200, canonical apex, no global
   noindex (`X-Robots-Tag` or robots meta). Reuse the search-console skill's live checklist.
2. **ads.txt:** `https://standbygeneratorguide.com/ads.txt` must exist once the owner
   provides values; before that, its **absence is correct** — a placeholder or guessed
   ID is a policy violation, not progress.
3. **Ownership/contact:** reachable About, Contact, Editorial team/policy pages with a
   real contact path (this site: `/about/`, `/contact/`, `/editorial-team/`,
   `/editorial-policy/`).
4. **Privacy policy:** a `/privacy-policy/` page disclosing cookies/analytics/advertising
   data use, as required before serving personalized ads.
5. **Original content sufficiency:** substantial, human-useful pages (this site: 110+
   guides, model records, comparisons). No thin, scraped, or doorway pages.
6. **Navigation & UX:** consistent header/footer nav, no broken internal links
   (`npm run qa:seo` asserts 8,800+ internal links), mobile-usable layouts.
7. **Prohibited content/traffic:** no invalid-click encouragement, no copyrighted-text
   scraping, no deceptive claims. Editorial disclosures must stay accurate.
8. **No ad code before approval:** do not add `adsbygoogle.js` or ad units until the
   account is approved; per `src/config/site.ts`, advertising is currently disabled
(`ADS_ENABLED = false`).

## 3. Evidence rules

- Every finding cites the live URL + check date. "Ready" means nothing observed
  blocking — it is **not** an approval prediction.
- Never claim AdSense approval, revenue, or review success without confirmation
  shown inside the owner's AdSense account.
