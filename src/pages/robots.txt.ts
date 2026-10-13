import type { APIRoute } from 'astro';
import { IS_INDEXABLE, SITE_URL } from '../config/site';

// A separate static build is produced for production and staging. Staging is
// explicitly blocked and carries noindex/nofollow metadata on every HTML page;
// production is crawlable and advertises its own sitemap only.
export const prerender = true;

// Match CalculatorSt's explicit, permissive production crawler groups.
// Google-Extended is a content-use control, not an indexing/ranking signal.
// Staging remains blocked by its own build and headers.
const robotsText = IS_INDEXABLE
  ? `User-agent: Googlebot
Allow: /

User-agent: Googlebot-Image
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: *
Allow: /

# Sitemap
Sitemap: ${SITE_URL}/sitemap.xml
`
  : 'User-agent: *\nDisallow: /\n';

export const GET: APIRoute = () => new Response(robotsText, {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});
