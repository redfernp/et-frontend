import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { auditMediaDirectory, auditMediaHtml } from './audit-preview-local-media.mjs';

test('checks local src, srcset and poster, including relative routes', () => {
  const html = '<img src="/brand.png" srcset="/brand-small.png 1x, /brand.png 2x"><video poster="../poster.jpg"><source src="https://example.org/external.webp"></video>';
  const result = auditMediaHtml(html, '/article/', (pathname) => pathname !== '/poster.jpg');
  assert.deepEqual(result.references, ['/brand.png', '/brand-small.png', '/brand.png', '/poster.jpg']);
  assert.deepEqual(result.missing.map((item) => item.pathname), ['/poster.jpg']);
  assert.equal(result.externalHosts.get('example.org'), 1);
});

test('ignores remote URLs and fails closed on invalid local URL encoding', () => {
  const result = auditMediaHtml('<img src="data:image/png;base64,aaa"><img src="//cdn.example.org/logo.png"><img src="/%ZZ.png">', '/', () => true);
  assert.equal(result.references.length, 0);
  assert.deepEqual(result.missing.map((item) => item.reason), ['invalid URL encoding']);
  assert.equal(result.externalHosts.get('cdn.example.org'), 1);
});

test('rejects staging-host media accidentally embedded in a release preview', () => {
  const result = auditMediaHtml('<img src="https://wordpress-123.cloudwaysapps.com/wp-content/pic.png">', '/', () => true);
  assert.deepEqual(result.missing.map((item) => item.reason), ['staging media URL in built preview']);
});

test('audits a static build without modifying it', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'everytip-media-audit-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'article'));
  fs.writeFileSync(path.join(root, 'logo.png'), 'fixture');
  fs.writeFileSync(path.join(root, 'article', 'index.html'), '<img src="/logo.png"><img src="missing.png">');
  const result = auditMediaDirectory(root);
  assert.equal(result.htmlFiles, 1);
  assert.equal(result.localReferences, 2);
  assert.deepEqual(result.missing.map((item) => item.pathname), ['/article/missing.png']);
});
