import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanupBuilderHtml, launchHtml } from '../src/lib/builder-cleanup.mjs';

test('unwraps builder layout and keeps semantic content, tables, images and offer slots', () => {
  const html = cleanupBuilderHtml('<div class="fl-row" style="width:1000px"><div class="tve_editor"><h2>Heading</h2><p>Text <a href="/go/test">Offer</a></p><img src="/image.png" alt="Image"><table><tr><td>Current row</td></tr></table><div data-everytip-offer-slot="42"></div></div></div>');
  assert.doesNotMatch(html, /fl-row|tve_editor|style=/);
  assert.match(html, /<h2>Heading<\/h2>/);
  assert.match(html, /<td>Current row<\/td>/);
  assert.match(html, /data-everytip-offer-slot="42"/);
  assert.match(html, /src="\/image.png"/);
});

test('localises editorial links and retains working affiliate paths with required relations', () => {
  const html = launchHtml('<a href="https://stage.example/page">Page</a><a href="/go/bookie?x=1" rel="noopener">Offer</a><table><tr><td>Live row</td></tr></table>', 'https://stage.example/graphql');
  assert.match(html, /href="\/page"/);
  assert.match(html, /href="https:\/\/www.everytip.co.uk\/go\/bookie\?x=1"/);
  assert.match(html, /rel="noopener nofollow"/);
  assert.match(html, /Live row/);
});
