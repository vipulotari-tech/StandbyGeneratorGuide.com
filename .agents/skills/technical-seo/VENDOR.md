# Vendor provenance — technical-seo skill

- **Upstream source:** https://github.com/magnus919/agent-skills (`seo/` directory)
- **Upstream commit vendored:** `fb3253335cdb1156522901ef52f9897212b2e4b5` (branch `main`)
- **Upstream license:** MIT (see upstream `LICENSE`; `SKILL.md` frontmatter also declares `license: MIT`).
  Vendoring with attribution is permitted provided the MIT copyright/license notice is
  preserved — it is, inside the vendored files and this record.
- **What was vendored:** the complete `seo/` skill directory, byte-identical
  (SHA-256 verified 2026-10-12): `SKILL.md`, `README.md`, `references/` (15 files),
  `scripts/` (3 files), `templates/` (5 files), `assets/audit-report-template.md`,
  `evals/evals.json`. Nothing added, removed, or edited.
- **Security review (2026-10-12):** all three `scripts/*.py` read in full. They use
  Python 3.9+ standard library only (`argparse`, `json`, `re`, `sys`, `html.parser`,
  `pathlib`, `urllib`, `hashlib`, `unittest`, `runpy`, `tempfile`). Read-only HTML
  inspection; no credential handling, no exfiltration, no installers, no network writes.
  No `run_all.sh` / `pip install` style bootstrap exists in this skill.
- **Why selected:** full-spectrum technical SEO workflow (crawlability, indexability,
  robots, sitemaps, canonicals, performance, mobile, HTTPS) plus evidence-grading rules
  that match this repository's QA approach. General-purpose collection (122 stars,
  1,040 commits, actively maintained); previous turns verified scope fit.
- **What was NOT taken from upstream:** nothing else from that repository was installed.
- **Refresh policy:** re-verify upstream `SKILL.md` + scripts before pulling updates;
  record the new commit SHA here.
