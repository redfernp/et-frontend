import test from 'node:test';
import assert from 'node:assert/strict';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { extractFreeTipsEditorial } from '../src/lib/free-tips-editorial.mjs';
import { validateFreeTipsEditorialDraft, readStagingFreeTipsEditorialDraft } from '../src/lib/staging-free-tips-editorial-draft.mjs';

const snapshot = await latestContentSnapshot();
const source = [...snapshot.posts, ...snapshot.pages].find((item) => item.uri === '/free-betting-tips');
const editorial = extractFreeTipsEditorial(source);
const draft = (content = editorial.html) => ({ data: { page: {
  databaseId: 91010, slug: 'staging-free-tips-evergreen-gutenberg-2026-10-13',
  status: 'draft', modified: '2026-10-13T12:00:00', content,
} } });

test('free-tips Gutenberg editorial draft bridge validates a fixed unpublished identity and 34 core sections', () => {
  const result = validateFreeTipsEditorialDraft(draft(), source);
  assert.equal(result.sourceNodeCount, 34);
  assert.equal(result.draftId, 91010);
  assert.match(result.html, /Free Horse Racing Tips/);
  assert.doesNotMatch(result.html, /<a\b|\/go\//i);
  const gutenbergClasses = editorial.html.replaceAll('<h2>', '<h2 class="wp-block-heading">')
    .replaceAll('<h3>', '<h3 class="wp-block-heading">')
    .replaceAll('<p>', '<p class="wp-block-paragraph">');
  assert.equal(validateFreeTipsEditorialDraft(draft(gutenbergClasses), source).sourceNodeCount, 34);
  assert.doesNotMatch(validateFreeTipsEditorialDraft(draft(gutenbergClasses), source).html, /class=/);

  const published = draft(); published.data.page.status = 'publish';
  assert.throws(() => validateFreeTipsEditorialDraft(published, source), /identity\/status/);
  const wrongPage = draft(); wrongPage.data.page.databaseId = 76939;
  assert.throws(() => validateFreeTipsEditorialDraft(wrongPage, source), /identity\/status/);
  assert.throws(() => validateFreeTipsEditorialDraft(draft(), { ...source, uri: '/elsewhere' }), /snapshot identity/);
  assert.throws(() => validateFreeTipsEditorialDraft(draft(`${editorial.html}<p>Extra</p>`), source), /block structure/);
  assert.throws(() => validateFreeTipsEditorialDraft(draft(`Unexpected copy${editorial.html}`), source), /unexpected top-level/);
  assert.throws(() => validateFreeTipsEditorialDraft(draft(editorial.html.replace('<p>', '<p class="ad">')), source), /block structure/);
  assert.throws(() => validateFreeTipsEditorialDraft(draft(editorial.html.replace('</p>', '<a href="/go/bookie">Join</a></p>')), source), /links, embeds or commercial/);
  assert.throws(() => validateFreeTipsEditorialDraft(draft(editorial.html.replace('</p>', '<script>alert(1)</script></p>')), source), /links, embeds or commercial/);
  assert.throws(() => validateFreeTipsEditorialDraft(draft(editorial.html.replace('</p>', '<b>Bet £10</b></p>')), source), /links, embeds or commercial/);
});

test('draft bridge needs both local opt-in flags and staging credentials, and never falls back on failure', async () => {
  const keys = ['MIGRATION_EXACT_PREVIEW', 'MIGRATION_STAGING_FREE_TIPS_DRAFT_READ',
    'EVERYTIP_WP_BASE_URL', 'EVERYTIP_WP_USERNAME', 'EVERYTIP_WP_APPLICATION_PASSWORD'];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  let calls = 0;
  try {
    process.env.MIGRATION_EXACT_PREVIEW = '0';
    process.env.MIGRATION_STAGING_FREE_TIPS_DRAFT_READ = '1';
    await assert.rejects(readStagingFreeTipsEditorialDraft(source, { fetchImpl: async () => { calls++; } }), /both explicit/);
    process.env.MIGRATION_EXACT_PREVIEW = '1';
    process.env.EVERYTIP_WP_BASE_URL = 'https://www.everytip.co.uk';
    await assert.rejects(readStagingFreeTipsEditorialDraft(source, { fetchImpl: async () => { calls++; } }), /staging-only/);
    process.env.EVERYTIP_WP_BASE_URL = 'https://wordpress-159231-2098144.cloudwaysapps.com';
    delete process.env.EVERYTIP_WP_USERNAME;
    await assert.rejects(readStagingFreeTipsEditorialDraft(source, { fetchImpl: async () => { calls++; } }), /credentials/);
    process.env.EVERYTIP_WP_USERNAME = 'test-editor';
    process.env.EVERYTIP_WP_APPLICATION_PASSWORD = 'test-app-password';
    await assert.rejects(readStagingFreeTipsEditorialDraft(source, { fetchImpl: async () => ({ ok: false, status: 503 }) }), /HTTP 503/);
    const result = await readStagingFreeTipsEditorialDraft(source, { fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, 'https://wordpress-159231-2098144.cloudwaysapps.com/graphql');
      assert.equal(options.method, 'POST');
      assert.match(options.headers.Authorization, /^Basic /);
      assert.match(JSON.parse(options.body).query, /91010/);
      return { ok: true, json: async () => draft() };
    } });
    assert.equal(result.draftId, 91010);
    assert.equal(calls, 1);
  } finally {
    for (const key of keys) previous[key] === undefined ? delete process.env[key] : process.env[key] = previous[key];
  }
});
