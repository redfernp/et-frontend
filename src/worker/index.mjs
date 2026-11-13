import { verifiedLegacyRedirects } from '../lib/legacy-redirects.mjs';
import affiliateInventory from '../../data/affiliate-redirects.json' with { type: 'json' };
import { workerArchiveRedirects } from '../lib/archive-redirects.mjs';
import observedArchiveRedirects from '../../outputs/archive-redirects.json' with { type: 'json' };

const archiveRedirects = workerArchiveRedirects(observedArchiveRedirects);

// Affiliate click counter for the weekly offer ladder (scripts/rerank-offers.mjs reads it back).
// One Analytics Engine data point per human click: the /go/ slug, where on the page it was
// (?pl=top|more from the Top offers ladder), the page it came from and the country. No cookies or
// visitor identifiers are stored. Bots, link checkers and HEAD requests are not counted.
const botAgent = /bot|crawl|spider|slurp|preview|monitor|curl|wget|python|java\/|headless|lighthouse|facebookexternalhit|embedly|whatsapp|telegram|skype/i;
export function recordClick(request, env, url) {
  if (!env?.CLICKS || request.method !== 'GET') return;
  const agent = request.headers.get('user-agent') ?? '';
  if (!agent || botAgent.test(agent)) return;
  let from = '';
  try {
    const referer = new URL(request.headers.get('referer') ?? '');
    from = referer.host === url.host ? referer.pathname : `ext:${referer.host}`;
  } catch {}
  const slug = url.pathname.slice('/go/'.length).replace(/\/$/, '').toLowerCase();
  const placement = (url.searchParams.get('pl') ?? '').replace(/[^a-z0-9-]/gi, '').slice(0, 20);
  try {
    env.CLICKS.writeDataPoint({ indexes: [slug], blobs: [slug, placement, from.slice(0, 200), request.cf?.country ?? ''], doubles: [1] });
  } catch {}
}

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
      if (redirect) recordClick(request, env, url);
      // Unknown slugs go to the homepage, as WordPress's /go/index.php does with its default.
      return redirect ? Response.redirect(redirect.location, redirect.status) : Response.redirect(new URL('/', url), 302);
    }
    if (verifiedLegacyRedirects.has(path)) {
      // Keep the query string so newsletter UTM tags survive the redirect.
      const target = new URL(verifiedLegacyRedirects.get(path), url);
      if (!target.search) target.search = url.search;
      return Response.redirect(target, 301);
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
