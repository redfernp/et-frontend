import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../src/worker/index.mjs';
import { verifiedLegacyRedirects } from '../src/lib/legacy-redirects.mjs';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const wrangler = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
const paths = [];
const env = {
  ASSETS: {
    async fetch(request) {
      const path = new URL(request.url).pathname;
      paths.push(path);
      return existsSync(join(dist, path.replace(/^\/+/, '')))
        ? new Response('asset', { status: 200, headers: { 'content-type': 'text/html' } })
        : new Response('missing', { status: 404 });
    },
  },
};

test('Wrangler disables HTML normalization and SPA fallback for legacy URL parity', () => {
  assert.equal(wrangler.assets.html_handling, 'none');
  assert.notEqual(wrangler.assets.not_found_handling, 'single-page-application');
  assert.deepEqual(wrangler.assets.run_worker_first.slice(0, 2), ['/index.html', '/*/index.html']);
  assert.deepEqual(new Set(wrangler.assets.run_worker_first.slice(2)), new Set(verifiedLegacyRedirects.keys()));
  const previewWrangler = JSON.parse(readFileSync(new URL('../wrangler.preview.jsonc', import.meta.url), 'utf8'));
  assert.deepEqual(previewWrangler.assets.run_worker_first, wrangler.assets.run_worker_first);
});

test('exact public .html file exists without an Astro directory variant', () => {
  assert.ok(existsSync(join(dist, 'best-paypal-betting-sites.html')));
  assert.ok(!existsSync(join(dist, 'best-paypal-betting-sites.html', 'index.html')));
});

test('exact public extensionless page and homepage resolve without browser redirects', async () => {
  for (const [requested, asset] of [
    ['/free-betting-tips', '/free-betting-tips/index.html'],
    ['/', '/index.html'],
  ]) {
    const response = await worker.fetch(new Request(`https://preview.example${requested}`), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('location'), null);
    assert.equal(paths.at(-1), asset);
  }
});

test('missing and file-like routes do not silently resolve', async () => {
  const missing = await worker.fetch(new Request('https://preview.example/pilot/no-such-page'), env);
  const html = await worker.fetch(new Request('https://preview.example/pilot/no-such-page.html'), env);
  assert.equal(missing.status, 404);
  assert.equal(html.status, 404);
});

test('wrong .html alias, malformed path and unsupported method cannot become 200', async () => {
  for (const path of [
    '/index.html',
    '/best-paypal-betting-sites',
    '/best-paypal-betting-sites.html/',
    '/free-betting-tips/index.html',
    '/racecourses/kempton-racing-tips/index.html',
    '/free-betting-tips//extra',
    '/pilot/no-such-page.css',
  ]) {
    const response = await worker.fetch(new Request(`https://preview.example${path}`), env);
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.get('location'), null, path);
  }
  const post = await worker.fetch(new Request('https://preview.example/free-betting-tips', { method: 'POST' }), env);
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('location'), null);
});

test('HEAD keeps exact status and has no redirect header', async () => {
  const existing = await worker.fetch(new Request('https://preview.example/free-betting-tips', { method: 'HEAD' }), env);
  const missing = await worker.fetch(new Request('https://preview.example/no-such-page', { method: 'HEAD' }), env);
  assert.equal(existing.status, 200);
  assert.equal(missing.status, 404);
  assert.equal(existing.headers.get('location'), null);
});

test('public page trailing-slash variant is not a duplicate 200', async () => {
  const response = await worker.fetch(new Request('https://preview.example/free-betting-tips/'), env);
  assert.equal(response.status, 404);
});

test('verified WordPress redirects remain 301 rather than becoming preview pages', async () => {
  for (const [source, target] of verifiedLegacyRedirects) {
    const targetAsset = target.endsWith('.html') ? join(dist, target.slice(1)) : join(dist, target.slice(1), 'index.html');
    assert.ok(existsSync(targetAsset), `Missing local redirect target: ${target}`);
    const sourceAsset = source.endsWith('.html') ? join(dist, source.slice(1)) : join(dist, source.slice(1), 'index.html');
    assert.ok(!existsSync(sourceAsset), `Redirect source became a 200 asset: ${source}`);
    const response = await worker.fetch(new Request(`https://preview.example${source}`, { method: 'HEAD' }), env);
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('location'), `https://preview.example${target}`);
  }
});
