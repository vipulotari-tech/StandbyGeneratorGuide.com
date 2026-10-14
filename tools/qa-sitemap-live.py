"""Read-only production sitemap audit. Uses stdlib; never submits to GSC.

Run after build:production. Optional BASE_URL targets a local production preview; sitemap
locations and canonicals must still use the production origin.
"""
import concurrent.futures
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import urllib.error
import urllib.request
import urllib.robotparser
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

ORIGIN = 'https://standbygeneratorguide.com'
BASE = os.environ.get('BASE_URL', ORIGIN).rstrip('/')
NS = '{http://www.sitemaps.org/schemas/sitemap/0.9}'
OUT = Path('.qa/sitemap-live.json')
UA = 'StandbyGeneratorGuide authorized QA'


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fetch(url, method='GET', agent=UA):
    req = urllib.request.Request(url, method=method, headers={'User-Agent': agent})
    try:
        response = urllib.request.build_opener(NoRedirect).open(req, timeout=30)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        body = response.read()
        return {'url': url, 'status': response.code,
                'headers': {k.lower(): v for k, v in response.headers.items()},
                'body': body.decode('utf-8'),
                'sha256': hashlib.sha256(body).hexdigest()}


def summary(response):
    return {k: v for k, v in response.items() if k != 'body'}


class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonicals = []
        self.robots = []

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == 'link' and 'canonical' in attrs.get('rel', '').split():
            self.canonicals.append(attrs.get('href'))
        if tag == 'meta' and attrs.get('name', '').lower() in ('robots', 'googlebot'):
            self.robots.append(attrs.get('content', ''))


def audit():
    errors = []
    report = {'base': BASE, 'checkedAt': datetime.now(timezone.utc).isoformat(), 'googlebotVerified': False,
              'note': 'Public HTTP checks do not verify Google fetching or indexing.'}

    def check(condition, message):
        if not condition:
            errors.append(message)

    sitemap = fetch(BASE + '/sitemap.xml')
    report['sitemap'] = summary(sitemap)
    check(sitemap['status'] == 200, 'sitemap.xml must return direct HTTP 200')
    check('application/xml' in sitemap['headers'].get('content-type', ''), 'Sitemap MIME must be XML')
    check('noindex' not in sitemap['headers'].get('x-robots-tag', '').lower(), 'Sitemap has noindex header')
    root = ET.fromstring(sitemap['body'])
    check(root.tag == NS + 'urlset', 'Sitemap must be a urlset, not an index')
    urls = [node.text for node in root.findall(NS + 'url/' + NS + 'loc')]
    check(bool(urls) and len(urls) == len(set(urls)), 'Sitemap must have nonempty unique URLs')
    check(len(urls) <= 50000 and len(sitemap['body'].encode()) <= 50 * 1024 * 1024, 'Sitemap exceeds protocol limits')
    built = ET.parse('dist/sitemap.xml').getroot()
    expected = [node.text for node in built.findall(NS + 'url/' + NS + 'loc')]
    check(set(urls) == set(expected), 'Live URL inventory differs from production build')
    variants = [fetch(BASE + '/sitemap.xml', method='HEAD'),
                fetch(BASE + '/sitemap.xml', agent='Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')]
    report['sitemapVariants'] = [summary(r) for r in variants]
    for response in variants:
        check(response['status'] == 200, 'Sitemap HEAD/user-agent check failed')
        check('application/xml' in response['headers'].get('content-type', ''), 'Sitemap variant MIME mismatch')
    check(variants[1]['sha256'] == sitemap['sha256'], 'Sitemap differs by user agent')
    robots = fetch(BASE + '/robots.txt')
    report['robots'] = summary(robots)
    check(robots['status'] == 200, 'robots.txt must return HTTP 200')
    check('text/plain' in robots['headers'].get('content-type', ''), 'robots.txt MIME must be plain text')
    directives = [line.strip() for line in robots['body'].splitlines() if line.lower().startswith('sitemap:')]
    check(directives == ['Sitemap: ' + ORIGIN + '/sitemap.xml'], 'robots.txt must advertise only sitemap.xml')
    parser = urllib.robotparser.RobotFileParser()
    parser.parse(robots['body'].splitlines())
    check(parser.can_fetch('Googlebot', ORIGIN + '/sitemap.xml'), 'robots.txt blocks sitemap')
    retired = [fetch(BASE + p) for p in ['/sitemap-index.xml', '/sitemap-0.xml']]
    report['retired'] = [summary(r) for r in retired]
    for response in retired:
        check(response['status'] in (404, 410), 'Retired sitemap still served: ' + response['url'])

    def page(url):
        check(url.startswith(ORIGIN + '/') and not urlsplit(url).query and not urlsplit(url).fragment,
              'Noncanonical sitemap URL: ' + url)
        check(parser.can_fetch('Googlebot', url), 'robots.txt blocks ' + url)
        response = fetch(BASE + urlsplit(url).path)
        metadata = Metadata()
        metadata.feed(response['body'])
        check(response['status'] == 200, f'{url}: HTTP {response["status"]}')
        check('text/html' in response['headers'].get('content-type', ''), 'Non-HTML page: ' + url)
        check(metadata.canonicals == [url], 'Canonical mismatch: ' + url)
        check('noindex' not in ','.join(metadata.robots).lower(), 'Meta noindex: ' + url)
        check('noindex' not in response['headers'].get('x-robots-tag', '').lower(), 'Header noindex: ' + url)
        return {**summary(response), 'canonicals': metadata.canonicals, 'robots': metadata.robots}

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        report['pages'] = list(pool.map(page, urls))
    report['pageCount'] = len(urls)
    report['errors'] = errors
    report['result'] = 'FAIL' if errors else 'PASS'
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: report[k] for k in ['result', 'pageCount', 'errors', 'note']}, indent=2))
    return 1 if errors else 0


if __name__ == '__main__':
    raise SystemExit(audit())
