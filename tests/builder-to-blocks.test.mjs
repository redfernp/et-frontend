import test from 'node:test';
import assert from 'node:assert/strict';
import { builderToBlocks, tierAOfferBlocks } from '../src/lib/builder-to-blocks.mjs';
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

test('Tier A preserves review prose and adds references without hard-coded terms', () => {
  const result = tierAOfferBlocks('<p>Independent review</p>', [90846,90848]);
  assert.match(result, /Independent review/);
  assert.equal((result.match(/wp:acf\/everytip-offer-slot/g) || []).length, 2);
  assert.doesNotMatch(result, /compact_terms|Free Bets/);
  assert.throws(() => tierAOfferBlocks('<p>Review</p>', []), /at least one/);
});

test('Tier A Ninja tables remain dynamic WordPress shortcodes', () => {
  const result = builderToBlocks('<p>Table follows</p><table data-footable_id="57082" data-ninja_table_instance="instance_0"><tr><td>Rendered row</td></tr></table>');
  assert.match(result, /wp:shortcode/);
  assert.match(result, /\[ninja_tables id="57082"\]/);
  assert.doesNotMatch(result, /Rendered row/);
});
