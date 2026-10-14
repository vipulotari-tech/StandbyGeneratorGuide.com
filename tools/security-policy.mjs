import { createHash } from 'node:crypto';

export function inlineScriptHashes(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes, body]) => body.trim() && !/\bsrc\s*=|application\/(?:ld\+json|json)/i.test(attributes))
    .map(([, , body]) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`);
}

export function securityPolicy(htmlPages) {
  const hashes = [...new Set(htmlPages.flatMap(inlineScriptHashes))].sort();
  // Style attributes support existing editorial diagrams; executable scripts
  // require an allowed URL or an exact build-generated hash (no unsafe-inline).
  // Preserve the site's Google Analytics tag without enabling Ads or arbitrary
  // third-party scripts. Sources: developers.google.com/tag-platform/security/guides/csp
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(' ')} https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://www.googletagmanager.com https://*.google-analytics.com",
    "font-src 'self'",
    "connect-src 'self' https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self' mailto:",
  ].join('; ');
}
