import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = new URL('../wordpress-plugins/everytip-content-model/', import.meta.url);
const auditUrl = new URL('../artifacts/staging-ninja-shortcodes/audit-2026-10-13T19-51-32.541Z.json', import.meta.url);

test('tip-table block is a reference-only ACF Gutenberg block', async () => {
  const block = JSON.parse(await readFile(new URL('blocks/tip-table/block.json', base), 'utf8'));
  const plugin = await readFile(new URL('everytip-content-model.php', base), 'utf8');
  const render = await readFile(new URL('blocks/tip-table/render.php', base), 'utf8');
  assert.equal(block.name, 'acf/everytip-tip-table');
  assert.deepEqual(block.acf.postTypes, ['post', 'page']);
  assert.equal(block.supports.html, false);
  assert.equal(block.supports.customClassName, false);
  assert.match(plugin, /'name'\s*=>\s*'et_tip_table_id'/);
  assert.match(plugin, /'name'\s*=>\s*'et_tip_table_filter'/);
  assert.match(plugin, /register_block_type\( __DIR__ \. '\/blocks\/tip-table' \)/);
  assert.match(render, /data-everytip-tip-table-id/);
  assert.match(render, /data-everytip-tip-table-filter/);
  assert.match(render, /esc_attr\( \$filter \)/);
  assert.doesNotMatch(render, /do_shortcode|<table|<tr|<td|ninja_tables/i);
  assert.doesNotMatch(render, /trim\(\s*\$filter\s*\)/);
});

test('packaged allowlist exactly matches the authenticated raw Ninja audit', async () => {
  const registry = JSON.parse(await readFile(new URL('blocks/tip-table/legacy-table-ids.json', base), 'utf8'));
  const audit = JSON.parse(await readFile(auditUrl, 'utf8'));
  const expected = audit.tableIds.map(Number).sort((a, b) => a - b);
  assert.equal(expected.length, 49);
  assert.deepEqual(registry.ids, expected);
  assert.equal(new Set(registry.ids).size, registry.ids.length);
  assert.ok(registry.ids.every((id) => Number.isInteger(id) && id > 0));
});
