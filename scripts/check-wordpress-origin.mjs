// Read-only launch gate for the isolated staging-origin Worker. Never follows /go partners.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { isWordPressRequest } from '../src/worker/wordpress-origin.mjs';
const origin = new URL(process.argv[2]);
if (origin.hostname !== 'et-frontend-origin-test.jpredfern1979.workers.dev' && !origin.hostname.endsWith('-et-frontend-origin-test.jpredfern1979.workers.dev')) throw new Error('Only the isolated origin-test Worker is permitted');
const staging = 'https://wordpress-159231-2098144.cloudwaysapps.com';
const paths = new Set(); let references = 0;
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await scan(file);
    else if (file.endsWith('.html')) {
      for (const match of (await readFile(file, 'utf8')).matchAll(/https?:\/\/[^\s"'<>]+\/wp-content\/[^\s"'<>]+/g)) {
        const url = new URL(match[0].replaceAll('&amp;', '&'));
        assert.ok(isWordPressRequest(url)); references++;
        if (/\.(?:jpg|png|webp)$/i.test(url.pathname)) paths.add(url.pathname);
      }
    }
  }
}
await scan('dist');
const results = [];
async function request(path, options = {}) {
  const r = await fetch(new URL(path, origin), { ...options, redirect: 'manual', signal: AbortSignal.timeout(60000) });
  assert.equal(r.headers.get('x-robots-tag'), 'noindex, nofollow', path);
  return r;
}
for (const path of ['/', '/free-betting-tips', '/best-paypal-betting-sites.html', '/sitemap.xml']) {
  const r = await request(path); assert.equal(r.status, 200, path); await r.body?.cancel(); results.push({ path, status: 200, kind: 'astro' });
}
const admin = await request('/wp-admin/'); assert.ok([301, 302].includes(admin.status));
const loginURL = new URL(admin.headers.get('location'), origin);
assert.equal(loginURL.origin, origin.origin); assert.equal(loginURL.pathname, '/wp-login.php'); await admin.body?.cancel();
const login = await request(loginURL.pathname + loginURL.search); assert.equal(login.status, 200);
assert.match(await login.text(), /name=["']log["']/); results.push({ path: '/wp-admin/', status: admin.status, loginStatus: 200 });
for (const path of ['/wp-json/', '/wp-json/wp/v2/posts?per_page=1&_fields=id', '/index.php?rest_route=/wp/v2/posts&per_page=1&_fields=id']) {
  const r = await request(path); assert.equal(r.status, 200, path); const data = await r.json(); assert.ok(data); results.push({ path, status: 200, kind: 'rest' });
}
for (const method of ['GET', 'POST']) {
  const query = '{ generalSettings { title } }';
  const r = await request(method === 'GET' ? `/graphql?query=${encodeURIComponent(query)}` : '/graphql', method === 'POST' ? { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) } : {});
  assert.equal(r.status, 200); const data = await r.json(); assert.ok(data.data?.generalSettings?.title); assert.ok(!data.errors); results.push({ path: '/graphql', method, status: 200 });
}
const js = await request('/wp-includes/js/jquery/jquery.min.js'); assert.equal(js.status, 200); await js.body?.cancel(); results.push({ path: '/wp-includes/js/jquery/jquery.min.js', status: 200 });
const images = [...paths].sort();
const hash = buffer => createHash('sha256').update(Buffer.from(buffer)).digest('hex');
const candidates = [...new Set([...Array.from({ length: Math.min(10, images.length) }, (_, i) => images[Math.floor(i * images.length / 10)]), ...images])];
const originMissing = []; let verifiedImages = 0;
for (const path of candidates) {
  if (verifiedImages === 10) break;
  const r = await request(path);
  const direct = await fetch(staging + path, { redirect: 'manual', signal: AbortSignal.timeout(60000) });
  assert.equal(r.status, direct.status, path);
  if (direct.status === 404) { originMissing.push(path); await r.body?.cancel(); await direct.body?.cancel(); continue; }
  assert.equal(r.status, 200, path); assert.match(r.headers.get('content-type'), /^image\//);
  const actual = hash(await r.arrayBuffer());
  assert.equal(actual, hash(await direct.arrayBuffer()), path); verifiedImages++; results.push({ path, status: 200, kind: 'image', byteIdentical: true });
}
assert.equal(verifiedImages, 10, 'Need ten available images through the proxy');
const affiliates = JSON.parse(await readFile('data/affiliate-redirects.json', 'utf8')).redirects;
for (const [path, expected] of Object.entries(affiliates)) {
  const r = await request(path, { method: 'HEAD' }); assert.equal(r.status, expected.status, path); assert.equal(r.headers.get('location'), expected.location, path); await r.body?.cancel();
}
const output = { origin: origin.origin, checkedAt: new Date().toISOString(), mediaReferencesRouted: references, uniqueImagePaths: paths.size, originMissing, affiliateRedirects: Object.keys(affiliates).length, results };
await writeFile('outputs/wordpress-origin-check.json', JSON.stringify(output, null, 2));
console.log(JSON.stringify({ ...output, results: results.length, failures: 0 }));
