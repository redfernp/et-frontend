import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePriorityHeadPreview } from '../src/lib/priority-head-preview-guard.mjs';

const source = { uri: '/', databaseId: 16, seo: { title: 'EveryTip &amp; Free Tips', metaDesc: 'Horse racing &amp; football' } };
const expected = { uri: '/', id: 16 };
const html = '<!DOCTYPE html><html><head><meta name="robots" content="noindex,nofollow"><meta name="everytip-preview" content="not-for-publication"><meta name="description" content="Horse racing &amp; football"><title>EveryTip &amp; Free Tips</title></head><body><p>Local review</p></body></html>';

test('exact priority preview keeps published source SEO identity but never becomes indexable', () => {
  const result = validatePriorityHeadPreview(html, source, expected);
  assert.equal(result.title, 'EveryTip & Free Tips');
  assert.equal(result.canonical, null);
  assert.equal(result.previewOnly, true);
  assert.throws(() => validatePriorityHeadPreview(html.replace('noindex,nofollow', 'index,follow'), source, expected), /guard failed/);
  assert.throws(() => validatePriorityHeadPreview(html.replace('</head>', '<link rel="canonical" href="https://www.everytip.co.uk/"></head>'), source, expected), /guard failed/);
  assert.throws(() => validatePriorityHeadPreview(html.replace('EveryTip &amp; Free Tips</title>', 'Draft SEO</title>'), source, expected), /guard failed/);
  assert.throws(() => validatePriorityHeadPreview(html.replace('Local review', 'migration-draft-home-evergreen-editorial'), source, expected), /guard failed/);
  assert.throws(() => validatePriorityHeadPreview(html, { ...source, databaseId: 91013 }, expected), /identity/);
});
