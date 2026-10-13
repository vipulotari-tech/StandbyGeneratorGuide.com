"""Validate production sitemap coverage or staging's non-indexable separation."""
from pathlib import Path
import re
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
assert DIST.is_dir(), "Run a production or staging build first"

robots_path = DIST / "robots.txt"
assert robots_path.is_file(), "robots.txt missing from build"
robots = robots_path.read_text(encoding="utf-8")
html_pages = sorted(DIST.rglob("index.html"))
all_html = sorted(DIST.rglob("*.html"))
built_paths = {
    "/" if page.parent == DIST else "/" + page.parent.relative_to(DIST).as_posix() + "/"
    for page in html_pages
}

if "Sitemap: https://standbygeneratorguide.com/sitemap.xml" in robots:
    base_url = "https://standbygeneratorguide.com"
    assert "Disallow: /" not in robots, "production robots.txt blocks the whole site"
    headers = (DIST / "_headers").read_text(encoding="utf-8")
    scope = ""
    noindex_scopes = []
    for line in headers.splitlines():
        text = line.strip()
        if not text or text.startswith("#"):
            continue
        if not line[0].isspace():
            scope = text
        elif re.match(r"X-Robots-Tag:\s*noindex\b", text, re.I):
            noindex_scopes.append(scope)
    assert sorted(noindex_scopes) == sorted([
        "https://standbygeneratorguide.pages.dev/*",
        "https://:version.standbygeneratorguide.pages.dev/*",
    ]), "noindex must apply only to Pages aliases, never production or global paths"
    direct_path = DIST / "sitemap.xml"
    sitemap_files = sorted(path.name for path in DIST.glob("sitemap*.xml"))
    assert sitemap_files == ["sitemap.xml"], "production must publish only sitemap.xml"
    direct_xml = direct_path.read_text(encoding="utf-8")
    assert "<urlset" in direct_xml and "<sitemapindex" not in direct_xml, "root sitemap must be a flat URL set"
    assert "<lastmod>" not in direct_xml, "root sitemap must not fabricate last-modified dates"
    urls = re.findall(r"<loc>(.*?)</loc>", direct_xml)
    assert len(urls) == len(set(urls)), "duplicate flat sitemap URL"
    assert all(urlparse(url).scheme == "https" and urlparse(url).netloc == "standbygeneratorguide.com" for url in urls), "non-production origin leaked into sitemap"
    expected = {base_url + path for path in built_paths}
    assert set(urls) == expected, {
        "missing": sorted(expected - set(urls)),
        "extra": sorted(set(urls) - expected),
    }
    for page in all_html:
        html = page.read_text(encoding="utf-8")
        if page in html_pages:
            assert re.search(
                r'<link rel="canonical" href="https://standbygeneratorguide\.com/', html
            ), page
            assert 'name="robots" content="noindex' not in html, page
        else:
            assert 'name="robots" content="noindex, nofollow"' in html, page
            assert 'rel="canonical"' not in html, page
    print(f"Production SEO coverage OK: {len(urls)} URLs, self-canonicals, production robots.txt.")
else:
    assert "Disallow: /" in robots, "staging robots.txt must disallow crawling"
    assert not list(DIST.glob("sitemap*.xml")), "staging must not publish sitemap files"
    for page in all_html:
        html = page.read_text(encoding="utf-8")
        assert 'name="robots" content="noindex, nofollow"' in html, page
        assert 'rel="canonical"' not in html, page
        assert "https://standbygeneratorguide.com/" not in html, page
    headers = (DIST / "_headers").read_text(encoding="utf-8")
    assert "X-Robots-Tag: noindex, nofollow" in headers
    print(f"Staging SEO isolation OK: {len(all_html)} HTML pages noindex/nofollow; no sitemap.")

print(f"Built route count (excluding error pages): {len(built_paths)}")
