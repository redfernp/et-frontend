// Keep WordPress's authentication, permissions and response semantics at origin.
export function isWordPressRequest(url) {
  const path = url.pathname;
  return /^\/(?:wp-admin|wp-json|graphql)/.test(path) ||
    /^\/(?:wp-content|wp-includes)(?:\/|$)/.test(path) ||
    /^\/(?:wp-login|wp-cron|xmlrpc|wp-comments-post|wp-signup|wp-activate|wp-trackback|wp-mail|wp-links-opml)\.php(?:\/|$)/.test(path) ||
    ((path === '/' || path === '/index.php') && url.searchParams.has('rest_route')) ||
    ['preview', 'preview_id', 'customize_changeset_uuid', 'customize_theme', 'fl_builder', 'tve', 'elementor-preview'].some(key => url.searchParams.has(key));
}

export async function proxyWordPress(request, env, fetchOrigin = fetch) {
  const incoming = new URL(request.url);
  const origin = new URL(env.WORDPRESS_ORIGIN);
  const canonical = new URL(env.WORDPRESS_CANONICAL_ORIGIN);
  for (const value of [origin, canonical]) {
    if (value.protocol !== 'https:' || value.username || value.password || value.pathname !== '/' || value.search || value.hash) throw new Error('Invalid WordPress origin configuration');
  }
  const preserveHost = env.ORIGIN_PRESERVE_HOST === 'true';
  if (origin.host === incoming.host || (preserveHost && origin.host === canonical.host)) throw new Error('WordPress origin must bypass the frontend hostname');
  const upstream = new URL(preserveHost ? canonical : origin);
  upstream.pathname = incoming.pathname;
  upstream.search = incoming.search;
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('x-forwarded-host', canonical.host);
  headers.set('x-forwarded-proto', 'https');
  const init = { method: request.method, headers, redirect: 'manual', cache: 'no-store' };
  if (!['GET', 'HEAD'].includes(request.method)) { init.body = request.body; init.duplex = 'half'; }
  // Same-zone resolveOverride preserves the public Host and TLS name while
  // selecting the dedicated Cloudways DNS target. Never use a Worker custom domain.
  const options = preserveHost ? { cf: { resolveOverride: origin.hostname } } : {};
  const response = await fetchOrigin(new Request(upstream, init), options);
  const result = new Response(response.body, response);
  // Do not cache authenticated API/editor responses, or follow redirects carrying credentials.
  result.headers.set('cache-control', 'private, no-store');
  const location = result.headers.get('location');
  if (location) {
    const target = new URL(location, upstream);
    if ([origin.origin, canonical.origin].includes(target.origin) && isWordPressRequest(target)) {
      target.protocol = incoming.protocol;
      target.host = incoming.host;
      result.headers.set('location', target.href);
    }
  }
  return result;
}
