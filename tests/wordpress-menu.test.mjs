import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMenuTree, publicNavigation, publicMenuFallback } from '../src/lib/menu-tree.ts';
import { getWordPressMenu } from '../src/lib/wordpress-menu.ts';

const item = (id, uri, parentId = null, order = 1) => ({ id, label: id, uri, parentId, order, target: null });

test('WordPress order, hierarchy and exact .html path survive mapping', () => {
  const tree = buildMenuTree([
    item('child', '/nap-of-the-day.html', 'parent', 3),
    item('second', '/daily-newsletter', null, 2),
    item('parent', '#', null, 1),
  ]);
  assert.deepEqual(tree.map((node) => node.id), ['parent', 'second']);
  assert.equal(tree[0].href, null);
  assert.equal(tree[0].children[0].href, '/nap-of-the-day.html');
});

test('menu mapper rejects unsafe paths and broken hierarchy', () => {
  assert.throws(() => buildMenuTree([item('bad', 'https://example.com')]), /Unexpected/);
  assert.throws(() => buildMenuTree([item('bad', '//example.com')]), /Unexpected/);
  assert.throws(() => buildMenuTree([item('orphan', '/page', 'missing')]), /Missing parent/);
  assert.throws(() => buildMenuTree([item('a', '#', 'b'), item('b', '#', 'a')]), /orphan or cycle/);
});

test('public menu emits only verified exact routes and keeps useful parent groups', () => {
  const tree = buildMenuTree([
    item('parent', '#', null, 1),
    item('html', '/guide.html', 'parent', 2),
    item('missing', '/unbuilt', 'parent', 3),
  ]);
  const result = publicNavigation(tree, ['/guide.html']);
  assert.equal(result.length, 1);
  assert.equal(result[0].href, null);
  assert.deepEqual(result[0].children.map((child) => child.href), ['/guide.html']);
  assert.deepEqual(publicNavigation(publicMenuFallback, []), []);
  assert.deepEqual(publicNavigation(publicMenuFallback, ['/']), [publicMenuFallback[0]]);
});

test('offline QA identifies the fallback menu without contacting WordPress', async () => {
  const before = process.env.MIGRATION_OFFLINE_SNAPSHOT;
  process.env.MIGRATION_OFFLINE_SNAPSHOT = '1';
  try {
    const menu = await getWordPressMenu('PRIMARY');
    assert.equal(menu.id, 0);
    assert.match(menu.name, /Offline/);
    assert.deepEqual(menu.items, publicMenuFallback);
    await assert.rejects(getWordPressMenu('FOOTER'), /No offline preview menu/);
  } finally {
    if (before === undefined) delete process.env.MIGRATION_OFFLINE_SNAPSHOT;
    else process.env.MIGRATION_OFFLINE_SNAPSHOT = before;
  }
});
