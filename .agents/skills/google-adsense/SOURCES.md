# Sources — google-adsense skill (custom)

This skill is **custom-written for this repository**; it is not authored by Google
and contains no copied upstream skill text.

Reference inputs consulted during skill discovery (2026-10-12):

- Official Google skills collection: https://github.com/google/skills (Apache-2.0).
  Verified that its advertising skills cover only the advertiser-side Google Ads API
  and AdMob Mobile Ads SDKs — **not** publisher AdSense. Nothing vendored from it;
  advertiser tooling was deliberately excluded to avoid Google Ads/AdSense confusion.
- No reputable dedicated publisher-AdSense agent skill was found (searched
  `google/skills`, `SeoToolkit/web-analytics-agent-skill`,
  `magnus919/agent-skills`, web search for "adsense agent skill SKILL.md"). Per the
  project brief, this skill was therefore created custom and is labeled as such.
- Official Google AdSense Help / Program policies as the normative basis for the
  checklist: `support.google.com/adsense` (eligibility, site review readiness,
  ownership verification, ads.txt specification via IAB Tech Lab `ads.txt` v1.1).
- This repository's own structure (`src/config/site.ts` `ADS_ENABLED`, policy pages,
  QA tooling) for project-specific checks.
