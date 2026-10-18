import { verifiedLegacyRedirects } from '../lib/legacy-redirects.mjs';
import affiliateInventory from '../../data/affiliate-redirects.json' with { type: 'json' };
import { workerArchiveRedirects } from '../lib/archive-redirects.mjs';
import observedArchiveRedirects from '../../outputs/archive-redirects.json' with { type: 'json' };

const archiveRedirects = workerArchiveRedirects(observedArchiveRedirects);

// Static assets are tried first by Cloudflare except for /index.html aliases
// and verified redirects, which Wrangler routes here first.
// Legacy extensionless WordPress pages are internally resolved without redirect.

export default {
  async fetch(request, env) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    if (path.startsWith('/go/')) {
      const redirect = affiliateInventory.redirects[path + url.search] || affiliateInventory.redirects[path];
      // Unknown slugs go to the homepage, as WordPress's /go/index.php does with its default.
      return redirect ? Response.redirect(redirect.location, redirect.status) : Response.redirect(new URL('/', url), 302);
    }
    if (verifiedLegacyRedirects.has(path)) {
      return Response.redirect(new URL(verifiedLegacyRedirects.get(path), url), 301);
    }
    if (archiveRedirects[path]) {
      const redirect = archiveRedirects[path];
      return Response.redirect(new URL(redirect.location, url), redirect.status);
    }
    if (path.includes('\\') || path.includes('//') || /\.[^/]+\/?$/.test(path)) {
      return new Response('Not Found', { status: 404 });
    }
    // Existing public WordPress pages are extensionless without a trailing slash.
    // Pilot routes keep their slash so current design-preview links still work.
    if (path !== '/' && path.endsWith('/') && !path.startsWith('/pilot/')) {
      return new Response('Not Found', { status: 404 });
    }

    const assetPath = path === '/' ? '/index.html' : `${path.replace(/\/$/, '')}/index.html`;
    const assetUrl = new URL(assetPath, url);
    const response = await env.ASSETS.fetch(new Request(assetUrl, request));
    if (!response.ok && response.status !== 304) return new Response('Not Found', { status: 404 });
    return response;
  },
};
