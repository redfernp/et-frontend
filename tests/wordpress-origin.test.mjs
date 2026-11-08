import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isWordPressRequest, proxyWordPress } from '../src/worker/wordpress-origin.mjs';
import worker, { serve } from '../src/worker/production.mjs';
const staging = 'https://wordpress-159231-2098144.cloudwaysapps.com';
const env = { WORDPRESS_ORIGIN: staging, WORDPRESS_CANONICAL_ORIGIN: staging, ORIGIN_PRESERVE_HOST: 'false', PREVIEW_NOINDEX: 'true', ASSETS: { fetch: async () => new Response('asset') } };
test('WordPress endpoints, uploads, AJAX and editor previews bypass Astro', () => {
  for (const path of ['/wp-admin', '/wp-admin/admin-ajax.php', '/wp-admin/admin-post.php', '/wp-login.php?action=logout', '/wp-json', '/wp-json/everytip/v1/editorial-seo/1', '/graphql?query=x', '/wp-content/uploads/2026/10/image.jpg', '/wp-content/plugins/ninja-tables/assets/x.js', '/wp-includes/js/jquery/jquery.min.js', '/wp-cron.php', '/xmlrpc.php', '/wp-comments-post.php', '/wp-signup.php', '/wp-activate.php', '/wp-mail.php', '/wp-trackback.php', '/?rest_route=/wp/v2/posts', '/index.php?rest_route=/wp/v2/media', '/article?preview=true', '/?fl_builder', '/.well-known/acme-challenge/abc123']) assert.ok(isWordPressRequest(new URL(path, 'https://www.everytip.co.uk')), path);
  for (const path of ['/', '/free-betting-tips', '/article.html', '/go/betfred', '/sitemap.xml', '/_astro/site.css', '/.well-known/security.txt']) assert.equal(isWordPressRequest(new URL(path, staging)), false, path);
});
test('proxy retains method, query, credentials and body; never follows redirects', async () => {
  const request = new Request('https://test.workers.dev/wp-json/wp/v2/posts/1?context=edit', { method: 'POST', headers: { authorization: 'Basic fixture', cookie: 'wordpress_logged_in=fixture', 'content-type': 'application/json' }, body: '{"title":"fixture"}' });
  const response = await proxyWordPress(request, env, async upstream => {
    assert.equal(upstream.url, staging + '/wp-json/wp/v2/posts/1?context=edit');
    assert.equal(upstream.method, 'POST'); assert.equal(upstream.redirect, 'manual'); assert.equal(upstream.cache, 'no-store');
    assert.equal(upstream.headers.get('authorization'), 'Basic fixture'); assert.equal(upstream.headers.get('cookie'), 'wordpress_logged_in=fixture');
    assert.equal(await upstream.text(), '{"title":"fixture"}');
    return new Response(null, { status: 302, headers: { location: staging + '/wp-login.php?redirect_to=%2Fwp-admin%2F', 'set-cookie': 'wordpress_test_cookie=WP; Path=/; Secure; HttpOnly' } });
  });
  assert.equal(response.status, 302); assert.equal(response.headers.get('location'), 'https://test.workers.dev/wp-login.php?redirect_to=%2Fwp-admin%2F');
  assert.ok(response.headers.get('set-cookie').includes('HttpOnly')); assert.equal(response.headers.get('cache-control'), 'private, no-store');
});
test('production preserves www host but resolves the separate origin; streaming range responses survive', async () => {
  const config = JSON.parse(readFileSync('wrangler.production.jsonc', 'utf8'));
  const r = await proxyWordPress(new Request('https://www.everytip.co.uk/wp-content/uploads/a.jpg', { headers: { range: 'bytes=0-3', 'if-none-match': 'fixture' } }), config.vars, async (upstream, options) => {
    assert.equal(new URL(upstream.url).host, 'www.everytip.co.uk'); assert.equal(options.cf.resolveOverride, 'origin.everytip.co.uk');
    assert.equal(upstream.headers.get('range'), 'bytes=0-3'); assert.equal(upstream.headers.get('if-none-match'), 'fixture');
    return new Response('jpeg', { status: 206, headers: { 'content-range': 'bytes 0-3/100', 'content-type': 'image/jpeg' } });
  });
  assert.equal(r.status, 206); assert.equal(r.headers.get('content-range'), 'bytes 0-3/100'); assert.equal(await r.text(), 'jpeg');
});
test('a network-path-shaped preview URL cannot change the configured upstream', async () => {
  await proxyWordPress(new Request('https://test.workers.dev//other.example/wp-json?preview=true'), env, async upstream => {
    assert.equal(new URL(upstream.url).origin, staging);
    return new Response('ok');
  });
});
test('static routing retains exact html, legacy redirects and forbidden aliases', async () => {
  for (const path of ['/', '/free-betting-tips', '/best-paypal-betting-sites.html', '/_astro/file.css', '/sitemap.xml']) assert.equal((await serve(new Request('https://test.workers.dev' + path), env)).status, 200);
  for (const path of ['/index.html', '/free-betting-tips/index.html']) assert.equal((await serve(new Request('https://test.workers.dev' + path), env)).status, 404);
  const legacy = await serve(new Request('https://test.workers.dev/qf-value-tips-review.html'), env); assert.equal(legacy.status, 301);
  assert.equal((await serve(new Request('https://test.workers.dev/', { method: 'POST' }), env)).status, 405);
});
test('test response guard adds noindex to pages, redirects and errors', async () => {
  for (const path of ['/', '/go/betfred', '/index.html']) assert.equal((await worker.fetch(new Request('https://test.workers.dev' + path), env)).headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.equal((await worker.fetch(new Request('https://www.everytip.co.uk/'), { ...env, PREVIEW_NOINDEX: 'false' })).headers.get('x-robots-tag'), null);
  assert.match(await (await worker.fetch(new Request('https://test.workers.dev/robots.txt'), env)).text(), /Disallow: \/\n/);
  assert.match(await (await worker.fetch(new Request('https://www.everytip.co.uk/robots.txt'), { ...env, PREVIEW_NOINDEX: 'false' })).text(), /Sitemap: https:\/\/www.everytip.co.uk\/sitemap.xml/);
});
test('production serves only www (no origin or wildcard route); test config has none; production is not exposed on workers.dev', () => {
  for (const file of ['wrangler.production.jsonc', 'wrangler.origin-test.jsonc']) {
    const c = JSON.parse(readFileSync(file, 'utf8')); assert.deepEqual(c.routes, file === 'wrangler.production.jsonc' ? [{ pattern: 'www.everytip.co.uk/*', zone_name: 'everytip.co.uk' }] : []); assert.equal(c.assets.run_worker_first, true); assert.equal(c.assets.html_handling, 'none'); assert.equal(c.workers_dev, file === 'wrangler.origin-test.jsonc');
  }
  const production = JSON.parse(readFileSync('wrangler.production.jsonc', 'utf8'));
  assert.equal(production.name, 'et-frontend'); assert.equal(production.assets.directory, './dist'); assert.equal(production.vars.PREVIEW_NOINDEX, 'false');
});
test('redirects keep the newsletter query string', async () => {
  const response = await serve(new Request('https://test.workers.dev/betfred-review.html?utm_source=newsletter&utm_medium=email'), env);
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://test.workers.dev/betfred-review?utm_source=newsletter&utm_medium=email');
});
test('before a 404, a WordPress redirect (old slug) is passed on with the query kept', async () => {
  const config = JSON.parse(readFileSync('wrangler.production.jsonc', 'utf8'));
  const prodEnv = { ...config.vars, ASSETS: { fetch: async () => new Response('missing', { status: 404 }) } };
  const origin = async (upstream) => {
    assert.equal(upstream.method, 'HEAD'); assert.equal(new URL(upstream.url).search, '');
    return new URL(upstream.url).pathname === '/channel-4-racing-tips.html'
      ? new Response(null, { status: 301, headers: { location: 'https://www.everytip.co.uk/channel-4-racing-tips-morning-line.html' } })
      : new Response('old theme page', { status: 200 });
  };
  const moved = await serve(new Request('https://www.everytip.co.uk/channel-4-racing-tips.html?utm_source=newsletter'), prodEnv, origin);
  assert.equal(moved.status, 301);
  assert.equal(moved.headers.get('location'), 'https://www.everytip.co.uk/channel-4-racing-tips-morning-line.html?utm_source=newsletter');
  assert.equal((await serve(new Request('https://www.everytip.co.uk/no-such-page'), prodEnv, origin)).status, 404);
  const offsite = async () => new Response(null, { status: 301, headers: { location: 'https://elsewhere.example/x' } });
  assert.equal((await serve(new Request('https://www.everytip.co.uk/gone.html'), prodEnv, offsite)).status, 404);
});
