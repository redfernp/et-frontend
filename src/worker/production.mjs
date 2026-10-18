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
  if (/\.[^/]+$/.test(url.pathname)) return env.ASSETS.fetch(request);
  return astroWorker.fetch(request, env);
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
