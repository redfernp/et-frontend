import test from 'node:test';
import assert from 'node:assert/strict';
import { builderToBlocks } from '../src/lib/builder-to-blocks.mjs';
import { builderTier } from '../src/lib/builder-tiers.mjs';
test('section 0 fixed tiers exclude classic columns and tipster reviews from Tier A', () => {
  assert.equal(builderTier({ uri: '/bet365-review', content: '' }), 'A');
  assert.equal(builderTier({ uri: '/bookie-free-bets-bonus-offers', content: '' }), 'A');
  assert.equal(builderTier({ uri: '/qf-value-tips-review.html', content: '<div class="tve_editor">Guide</div>' }), 'B');
  assert.equal(builderTier({ uri: '/old-john-newsome.html', content: '<p>Classic</p>' }), null);
});
test('builder prose, links, lists, tables and offer references become editable blocks', () => {
  const result = builderToBlocks('<div class="fl-row"><h2>Guide</h2><p>Keep <a href="/go/example">this link</a>.</p><ul><li>One</li></ul><table><tr><td>Data</td></tr></table><div data-everytip-offer-slot="90846"></div></div>');
  for (const block of ['heading','paragraph','list-item','table','acf/everytip-offer-slot']) assert.ok(result.includes(`wp:${block}`));
  assert.match(result, /Keep <a href="\/go\/example">this link<\/a>/);
  assert.doesNotMatch(result, /fl-row/);
  assert.throws(() => builderToBlocks('<form><input></form>'), /integration/);
});
