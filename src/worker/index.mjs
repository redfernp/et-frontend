import { verifiedLegacyRedirects } from '../lib/legacy-redirects.mjs';

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
    if (verifiedLegacyRedirects.has(path)) {
      return Response.redirect(new URL(verifiedLegacyRedirects.get(path), url), 301);
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
