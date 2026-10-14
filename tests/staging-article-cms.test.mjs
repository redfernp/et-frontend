import test from 'node:test';
import assert from 'node:assert/strict';
import {
  exactArticlePreviewRecord, readStagingArticle, representativeArticle, representativeArticlePreview, validateArticleRead,
} from '../src/lib/staging-article-cms.mjs';

function payload() {
  return { data: { post: {
    ...representativeArticle, status: 'publish', title: 'John Newsome article', content: '<p>Real editorial copy</p>',
    date: '2026-09-15T07:18:25', modified: '2026-09-15T07:18:25',
    seo: { title: 'SEO title', metaDesc: 'Description', canonical: '', metaRobotsNoindex: 'index', metaRobotsNofollow: 'follow' },
  } } };
}

test('article contract checks exact WordPress ID, slug, URL, published state, body and SEO', () => {
  const article = validateArticleRead(payload());
  assert.equal(article.uri, representativeArticle.uri);
  assert.equal(article.sourceMode, 'fresh-staging-wpgraphql-preview');
  assert.equal(article.seo.metaRobotsNoindex, 'index');
  const wrongPath = payload(); wrongPath.data.post.uri = '/different.html';
  assert.throws(() => validateArticleRead(wrongPath), /identity/);
  const draft = payload(); draft.data.post.status = 'draft';
  assert.throws(() => validateArticleRead(draft), /publication state/);
  const noSeo = payload(); noSeo.data.post.seo = null;
  assert.throws(() => validateArticleRead(noSeo), /SEO contract/);
  assert.throws(() => validateArticleRead({ errors: [{ message: 'Denied' }] }), /Denied/);
});

test('fresh article query is read-only and restricted to staging WPGraphQL', async () => {
  const calls = [];
  const article = await readStagingArticle(representativeArticle, {
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return { ok: true, json: async () => payload() };
    },
  });
  assert.equal(article.databaseId, 90485);
  assert.equal(calls[0].url, 'https://wordpress-159231-2098144.cloudwaysapps.com/graphql');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(JSON.parse(calls[0].options.body).variables.id, '90485');
  assert.equal(calls[0].options.headers.Authorization, undefined);
  await assert.rejects(readStagingArticle(representativeArticle, {
    endpoint: 'https://www.everytip.co.uk/graphql', fetchImpl: () => { throw new Error('Must not query live'); },
  }), /restricted/);
});

test('offline article is a dated preview and opted-in errors never fall back', async () => {
  const prior = process.env.MIGRATION_STAGING_ARTICLE_READ;
  try {
    delete process.env.MIGRATION_STAGING_ARTICLE_READ;
    const offline = await representativeArticlePreview({
      snapshotRead: async () => ({ generatedAt: '2026-10-02T00:00:00Z', posts: [payload().data.post] }),
    });
    assert.equal(offline.sourceMode, 'dated-snapshot-preview');
    process.env.MIGRATION_STAGING_ARTICLE_READ = '1';
    await assert.rejects(representativeArticlePreview({
      freshRead: async () => { throw new Error('Fresh CMS unavailable'); },
      snapshotRead: async () => { throw new Error('Snapshot must not run'); },
    }), /Fresh CMS unavailable/);
  } finally {
    if (prior === undefined) delete process.env.MIGRATION_STAGING_ARTICLE_READ;
    else process.env.MIGRATION_STAGING_ARTICLE_READ = prior;
  }
});

test('exact-path pilot keeps snapshot by default and accepts only safe, validated fresh content when opted in', async () => {
  const prior = process.env.MIGRATION_STAGING_ARTICLE_READ;
  const snapshot = payload().data.post;
  try {
    delete process.env.MIGRATION_STAGING_ARTICLE_READ;
    const dated = await exactArticlePreviewRecord(snapshot, { freshRead: async () => { throw new Error('Must not fetch'); } });
    assert.equal(dated.record, snapshot);
    assert.equal(dated.sourceMode, 'dated-snapshot-preview');
    process.env.MIGRATION_STAGING_ARTICLE_READ = '1';
    const fresh = await exactArticlePreviewRecord(snapshot, { freshRead: async () => payload().data.post });
    assert.equal(fresh.record.uri, representativeArticle.uri);
    assert.equal(fresh.sourceMode, 'fresh-staging-wpgraphql-preview');
    await assert.rejects(exactArticlePreviewRecord(snapshot, { freshRead: async () => { throw new Error('CMS unavailable'); } }), /CMS unavailable/);
    const unsafe = payload().data.post; unsafe.content = '<iframe src="https://example.test"></iframe>';
    await assert.rejects(exactArticlePreviewRecord(snapshot, { freshRead: async () => unsafe }), /editorial conversion/);
    await assert.rejects(exactArticlePreviewRecord({ ...snapshot, slug: 'other' }), /snapshot identity mismatch/);
  } finally {
    if (prior === undefined) delete process.env.MIGRATION_STAGING_ARTICLE_READ;
    else process.env.MIGRATION_STAGING_ARTICLE_READ = prior;
  }
});
