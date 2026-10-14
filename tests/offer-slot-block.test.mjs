import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = new URL('../wordpress-plugins/everytip-content-model/', import.meta.url);

test('offer slot block is a constrained ACF Gutenberg reference', async () => {
  const block = JSON.parse(await readFile(new URL('blocks/offer-slot/block.json', base), 'utf8'));
  const plugin = await readFile(new URL('everytip-content-model.php', base), 'utf8');
  const render = await readFile(new URL('blocks/offer-slot/render.php', base), 'utf8');
  assert.equal(block.name, 'acf/everytip-offer-slot');
  assert.deepEqual(block.acf.postTypes, ['post', 'page']);
  assert.equal(block.supports.html, false);
  assert.match(plugin, /'name' => 'et_slot_offer'.*'post_type' => array\( 'et_offer' \)/);
  assert.match(render, /data-everytip-offer-slot/);
  assert.doesNotMatch(render, /affiliate_url|full_terms|compact_terms|public_headline/);
});
