// Cloudflare Pages Functions middleware (part of the Pages project, not a separate Worker).
//
// - https://standbygeneratorguide.pages.dev/* -> 301 to https://standbygeneratorguide.com/*
//   (same path + query). Prevents duplicate-content indexing of the Pages default domain
//   while keeping the custom production domain fully indexable.
// - Preview deployments (*.standbygeneratorguide.pages.dev, e.g. <hash>--) keep serving
//   with `X-Robots-Tag: noindex, nofollow` so deployment QA still works without indexing.
// - www redirects to the canonical apex even when a zone Redirect Rule is absent.
// - The production apex passes through without noindex.
//
// Never add a global noindex rule: the canonical production host must remain indexable.

const PRODUCTION_HOST = 'standbygeneratorguide.com';
const PAGES_DEFAULT_HOST = 'standbygeneratorguide.pages.dev';
const WWW_HOST = 'www.standbygeneratorguide.com';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const hostname = url.hostname.toLowerCase();

  // Permanent redirect: Pages default domain -> production apex (preserve path + query).
  if (hostname === PAGES_DEFAULT_HOST || hostname === WWW_HOST) {
    url.protocol = 'https:';
    url.hostname = PRODUCTION_HOST;
    url.port = '';
    return Response.redirect(url.toString(), 301);
  }

  // Deleted assets can remain in the custom-domain asset cache after a deploy.
  // Retire the former index and numbered children before consulting that cache.
  // Keep /sitemap.xml as the only sitemap, including for HEAD/query requests.
  if (/^\/sitemap-(?:index|\d+)\.xml$/.test(url.pathname)) {
    return new Response(context.request.method === 'HEAD' ? null : 'Not found\n', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex',
      },
    });
  }

  // Preview deployments: never index, never redirect (keeps hash-URL QA usable).
  // Cloudflare already adds noindex to preview URLs; set it explicitly as well.
  if (hostname.endsWith('.pages.dev')) {
    const response = await context.next();
    const headers = new Headers(response.headers);
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return context.next();
}
