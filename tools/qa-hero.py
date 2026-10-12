import re

h = open('dist/index.html', encoding='utf-8').read()
sec = re.search(r'<section class="cinematic-home-hero".*?</section>', h, re.S)
assert sec, 'hero section missing'
hero = sec.group(0)
imgs = re.findall(r'<img ([^>]+)>', hero)
assert imgs, 'hero image missing'
first = imgs[0]


def attr(name):
    m = re.search(name + r'="([^"]*)"', first)
    return m.group(1) if m else None


assert attr('src'), 'hero img src missing'
assert attr('alt') and len(attr('alt')) >= 10, 'hero img needs descriptive alt'
assert (attr('width') or '').isdigit() and (attr('height') or '').isdigit(), \
    'hero img needs explicit width/height (CLS)'
assert attr('fetchpriority') == 'high', 'hero LCP image must be fetchpriority=high'
assert re.search(r'<h1[^>]*>', hero), 'hero must contain the page H1'
print('cinematic hero OK: section + described hi-pri LCP image with dimensions + H1')
