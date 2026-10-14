import test from 'node:test';
import assert from 'node:assert/strict';
import { columnistKeyForUri, normalizeColumnist, normalizeEditor, getColumnistProfiles } from '../src/lib/columnist-profiles.mjs';

test('columnist identity follows the exact editorial slug, not the uploader account', () => {
  assert.equal(columnistKeyForUri('/saturdays-horse-racing-preview-tips-7th-december-2024-seymour-biz.html'), 'seymour');
  assert.equal(columnistKeyForUri('/epl-game-week-15-2023-24-season-premier-league-tips-john-newsome.html'), 'john');
  assert.equal(columnistKeyForUri('/saturday-horse-racing-preview-tips-5th-august-2023-seymour-biz.html'), 'seymour');
  assert.equal(columnistKeyForUri('/sundays-horse-racing-preview-tips-1st-january-seymour-biz.html'), 'seymour');
  assert.equal(columnistKeyForUri('/saturday-horse-racing-preview-tips-16th-june-seymour-biz-lucky-15.html'), 'seymour');
  assert.equal(columnistKeyForUri('/fifa-club-world-cup-2025-tips-finals-john-newsome.html'), 'john');
  assert.equal(columnistKeyForUri('/epl-game-week-33-2025-26-season-premier-league-tips-john-newsome-2.html'), 'john');
  assert.equal(columnistKeyForUri('/bet365-review-john-newsome'), null);
  assert.equal(columnistKeyForUri('/archive/john-newsome.html'), null);
  assert.equal(columnistKeyForUri('/bet365-review'), null);
});

test('faceless editor profile uses only the WordPress ET logo', () => {
  const editor = normalizeEditor({ databaseId: 5, name: 'Everytip', slug: 'erick', uri: '/author/erick', avatar: { url: 'https://wordpress-159231-2098144.cloudwaysapps.com/wp-content/uploads/2025/06/cropped-ET.jpg' } });
  assert.equal(editor.image, 'https://www.everytip.co.uk/wp-content/uploads/2025/06/cropped-ET.jpg');
  assert.equal(editor.name, 'EveryTip Editorial Team');
});

test('profile photo is sourced from WordPress uploads and mapped to the live media host', () => {
  const profile = normalizeColumnist('seymour', {
    databaseId: 7, name: 'Seymour Biz', slug: 'seymourb', description: 'Horse racing columnist.', uri: '/author/seymourb',
    avatar: { url: 'https://wordpress-159231-2098144.cloudwaysapps.com/wp-content/uploads/2025/06/Seymour-Biz-Horse-Racing-Feature-Writer-300x300.png' },
  });
  assert.equal(profile.image, 'https://www.everytip.co.uk/wp-content/uploads/2025/06/Seymour-Biz-Horse-Racing-Feature-Writer-300x300.png');
  assert.throws(() => normalizeColumnist('seymour', { ...profile, avatar: { url: 'https://other.example/photo.png' }, description: 'Bio' }), /Unexpected/);
});

test('offline QA keeps author cards without calling staging GraphQL', async () => {
  const before = process.env.MIGRATION_OFFLINE_SNAPSHOT;
  process.env.MIGRATION_OFFLINE_SNAPSHOT = '1';
  try {
    const profiles = await getColumnistProfiles();
    assert.equal(profiles.seymour.name, 'Seymour Biz');
    assert.equal(profiles.john.name, 'John Newsome');
    assert.match(profiles.editor.image, /\/cropped-ET\.jpg$/);
    assert.ok(Object.values(profiles).every((profile) => profile.id === 0));
  } finally {
    if (before === undefined) delete process.env.MIGRATION_OFFLINE_SNAPSHOT;
    else process.env.MIGRATION_OFFLINE_SNAPSHOT = before;
  }
});
