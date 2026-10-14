import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const php = await readFile(new URL('../wordpress-plugins/everytip-content-model/everytip-content-model.php', import.meta.url), 'utf8');

test('offer read route remains readable and returns an additive revision token', () => {
  assert.match(php, /function everytip_offer_api_state\(/);
  assert.match(php, /\$state\['revision_token'\] = hash\( 'sha256', wp_json_encode\( \$state \) \)/);
  assert.match(php, /function everytip_offer_api_read\([\s\S]*?rest_ensure_response\( \$state \)/);
  assert.match(php, /'\/offer\/\(\?P<id>\\d\+\)'[\s\S]*?'methods'\s*=> WP_REST_Server::READABLE/);
});

test('offer UID write route is PATCH-only, capability checked and revision guarded', () => {
  assert.match(php, /'\/offer\/\(\?P<id>\\d\+\)\/uid'[\s\S]*?'methods'\s*=> 'PATCH'/);
  assert.match(php, /'callback'\s*=> 'everytip_offer_api_write_uid'/);
  assert.match(php, /'permission_callback'\s*=> 'everytip_offer_api_permission'/);
  assert.match(php, /current_user_can\( 'edit_post', \$id \)/);
  assert.match(php, /hash_equals\( \$before\['revision_token'\], \$body\['expected_revision'\] \)/);
  assert.match(php, /'draft' !== \$before\['status'\] \|\| 'draft' !== \(string\) \$before\['fields'\]\['et_offer_status'\]/);
});

test('offer and existing SEO endpoints use the route ID, not an overriding request or query parameter', () => {
  for (const name of [
    'everytip_offer_api_permission',
    'everytip_offer_api_read',
    'everytip_offer_api_write_uid',
    'everytip_editorial_seo_permission',
    'everytip_editorial_seo_read',
    'everytip_editorial_seo_write',
  ]) {
    const start = php.indexOf(`function ${name}(`);
    assert.ok(start >= 0, `${name} exists`);
    const end = php.indexOf('\n}', start);
    const body = php.slice(start, end);
    assert.match(body, /\$request->get_url_params\(\)/);
    assert.doesNotMatch(body, /\$request\['id'\]/);
  }
});

test('UID writer accepts only one permanent UID and fails closed on duplicates', () => {
  assert.match(php, /2 !== count\( \$body \)/);
  assert.match(php, /\^\[a-z\]\[a-z0-9\]\*\(\?:-\[a-z0-9\]\+\)\*\$/);
  assert.match(php, /everytip_offer_uid_immutable/);
  assert.match(php, /LOWER\(TRIM\(m\.meta_value\)\) = %s/);
  assert.match(php, /add_option\( \$edit_lock, get_current_user_id\(\), '', false \)/);
  assert.match(php, /finally \{\s*delete_option\( \$edit_lock \)/);
  assert.match(php, /add_option\( \$claim, \$id, '', false \)/);
  assert.match(php, /update_field\( 'field_et_offer_uid_v1', \$body\['uid'\], \$id \)/);
  assert.match(php, /everytip_offer_uid_readback/);
  assert.doesNotMatch(php.slice(php.indexOf('function everytip_offer_api_write_uid'), php.indexOf('function everytip_register_offer_api')), /wp_update_post|update_post_meta\( \$id, 'public_headline'|update_post_meta\( \$id, 'compact_terms'/);
});
