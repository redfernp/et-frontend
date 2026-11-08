import astroWorker from './index.mjs';
import { isWordPressRequest, proxyWordPress } from './wordpress-origin.mjs';
import { verifiedLegacyRedirects } from '../lib/legacy-redirects.mjs';

// Both configs run this before ALL assets, so WordPress never hits Astro's 404.
export async function serve(request, env, fetchOrigin = fetch) {
  const url = new URL(request.url);
  if (isWordPressRequest(url)) return proxyWordPress(request, env, fetchOrigin);
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method Not Allowed', { status: 405 });
  if (url.pathname === '/robots.txt') {
    const body = env.PREVIEW_NOINDEX === 'true' ? 'User-agent: *\nDisallow: /\n' :
      'User-agent: *\nAllow: /\nDisallow: /wp-admin/\nDisallow: /cgi-bin/\nDisallow: /tmp/\nDisallow: /go/\nDisallow: */feed\nAllow: /wp-admin/admin-ajax.php\nSitemap: https://www.everytip.co.uk/sitemap.xml\n';
    return new Response(request.method === 'HEAD' ? null : body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
  if (url.pathname.startsWith('/go/') || verifiedLegacyRedirects.has(url.pathname)) return astroWorker.fetch(request, env);
  if (url.pathname.includes('//') || url.pathname.includes('\\') || /(?:^|\/)index\.html$/.test(url.pathname)) return new Response('Not Found', { status: 404 });
  // The existing preview relies on assets-first for exact .html and build assets.
  // In production's worker-first mode we must explicitly serve these exact files.
  const response = /\.[^/]+$/.test(url.pathname) ? await env.ASSETS.fetch(request) : await astroWorker.fetch(request, env);
  if (response.status !== 404) return response;
  return await wordpressRedirect(request, env, fetchOrigin) ?? response;
}

// Before a 404, ask WordPress: it still knows old slugs (a post whose address changed) and its
// own redirect rules, which stopped firing when Astro took over public pages. Only a redirect
// to another page on this site is passed on, with the visitor's query (newsletter UTM tags) kept.
async function wordpressRedirect(request, env, fetchOrigin) {
  const url = new URL(request.url);
  if (!env.WORDPRESS_ORIGIN || url.pathname.startsWith('/go/')) return null;
  const probe = new URL(url.pathname, url);
  let origin;
  try { origin = await proxyWordPress(new Request(probe, { method: 'HEAD' }), env, fetchOrigin); } catch { return null; }
  if (![301, 302, 307, 308].includes(origin.status) || !origin.headers.get('location')) return null;
  const target = new URL(origin.headers.get('location'), probe);
  if (target.host !== url.host || target.pathname === url.pathname || isWordPressRequest(target)) return null;
  target.protocol = url.protocol;
  if (!target.search) target.search = url.search;
  return new Response(null, { status: 301, headers: { location: target.href, 'cache-control': 'public, max-age=3600' } });
}

export default {
  async fetch(request, env) {
    let response;
    try { response = await serve(request, env); }
    catch { response = new Response('WordPress origin unavailable', { status: 502, headers: { 'cache-control': 'no-store' } }); }
    if (env.PREVIEW_NOINDEX === 'true') {
      response = new Response(response.body, response);
      response.headers.set('x-robots-tag', 'noindex, nofollow');
    }
    return response;
  },
};
