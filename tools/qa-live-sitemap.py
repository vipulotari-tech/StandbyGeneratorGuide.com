"""Read-only production sitemap audit (stdlib only; never submits to Google)."""
import concurrent.futures
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import urllib.error
import urllib.request
import urllib.robotparser
import xml.etree.ElementTree as ET

BASE = os.environ.get('BASE_URL', 'https://standbygeneratorguide.com').rstrip('/')
CANONICAL = 'https://standbygeneratorguide.com'


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'SGG-Technical-Audit/1.0'})
    try:
        response = urllib.request.build_opener(NoRedirect).open(request, timeout=30)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, {k.lower(): v for k, v in response.headers.items()}, response.read()


class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonicals = []
        self.robots = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonicals.append(attrs.get('href'))
        if tag == 'meta' and attrs.get('name', '').lower() in ('robots', 'googlebot'):
            self.robots.append(attrs.get('content', ''))


def indexable(directives):
    return all(not {'noindex', 'none'} & set(value.lower().replace(',', ' ').split())
               for value in directives)


status, headers, xml = fetch(BASE + '/sitemap.xml')
assert status == 200, f'Sitemap HTTP {status}'
assert 'application/xml' in headers.get('content-type', '')
assert indexable([headers.get('x-robots-tag', '')]), 'Sitemap noindex header'
root = ET.fromstring(xml)
namespace = '{http://www.sitemaps.org/schemas/sitemap/0.9}'
assert root.tag == namespace + 'urlset', 'Expected flat URL set'
assert all(child.tag == namespace + 'url' for child in root), 'Unexpected sitemap element'
urls = []
for child in root:
    locations = child.findall(namespace + 'loc')
    assert len(locations) == 1 and locations[0].text, 'Each entry needs exactly one loc'
    urls.append(locations[0].text)
assert 0 < len(urls) <= 50000 and len(xml) <= 50 * 1024 * 1024
assert len(urls) == len(set(urls)), 'Duplicate locations'
if os.environ.get('EXPECTED_URLS'):
    assert len(urls) == int(os.environ['EXPECTED_URLS']), 'Unexpected URL count'
assert all(url.startswith(CANONICAL + '/') and '?' not in url and '#' not in url for url in urls)

status, robot_headers, robot_body = fetch(BASE + '/robots.txt')
assert status == 200 and 'text/plain' in robot_headers.get('content-type', '')
robots = urllib.robotparser.RobotFileParser()
robots.parse(robot_body.decode('utf-8').splitlines())
assert robots.site_maps() == [CANONICAL + '/sitemap.xml'], 'Advertise only the canonical sitemap'
assert robots.can_fetch('Googlebot', CANONICAL + '/sitemap.xml')


def check_page(url):
    try:
        status, headers, body = fetch(BASE + url.removeprefix(CANONICAL))
        assert status == 200, f'HTTP {status}'
        assert 'text/html' in headers.get('content-type', ''), 'Not HTML'
        metadata = Metadata()
        metadata.feed(body.decode('utf-8'))
        assert metadata.canonicals == [url], f'Canonical mismatch: {metadata.canonicals}'
        assert indexable(metadata.robots + [headers.get('x-robots-tag', '')]), 'Noindex'
        assert robots.can_fetch('Googlebot', url), 'Blocked by robots.txt'
        return {'url': url, 'status': status, 'result': 'PASS'}
    except Exception as error:
        return {'url': url, 'result': 'FAIL', 'error': str(error)}


with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    pages = list(pool.map(check_page, urls))
retired = []
for route in ['/sitemap-index.xml', '/sitemap-0.xml', '/sitemap-1.xml?qa=retired']:
    status, headers, body = fetch(BASE + route)
    retired.append({'path': route, 'status': status,
                    'result': 'PASS' if status == 404 and headers.get('cache-control') == 'no-store'
                    and b'<urlset' not in body and b'<sitemapindex' not in body else 'FAIL'})
failures = [row for row in pages + retired if row['result'] != 'PASS']
report = {'base': BASE, 'urls': len(urls), 'sitemap_sha256': hashlib.sha256(xml).hexdigest(),
          'pages': pages, 'retired': retired, 'result': 'FAIL' if failures else 'PASS',
          'limitation': 'An audit-client fetch does not verify Googlebot identity, GSC processing or indexing.'}
Path('.qa').mkdir(exist_ok=True)
Path('.qa/live-sitemap.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'result': report['result'], 'urls': len(urls), 'failures': failures, 'retired': retired}, indent=2))
raise SystemExit(1 if failures else 0)
