import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { representativeExactArticlePaths } from '../src/lib/exact-article-route.mjs';
import { representativeArticle } from '../src/lib/staging-article-cms.mjs';
import { parseCrawlCsv } from '../src/lib/exact-route-preview.mjs';

const record = () => ({ ...representativeArticle, title: 'John Newsome tips', content: '<p>Editorial copy</p>', date: '2026-09-15T00:00:00', modified: '2026-09-15T00:00:00', seo: { metaRobotsNoindex: 'index' } });
const snapshotRead = async () => ({ generatedAt: '2026-10-02T17:36:37Z', posts: [record()] });

test('the exact .html route exists only behind the local preview opt-in', async () => {
  const prior = process.env.MIGRATION_EXACT_PREVIEW;
  try {
    delete process.env.MIGRATION_EXACT_PREVIEW;
    assert.deepEqual(await representativeExactArticlePaths({ snapshotRead: async () => { throw new Error('Must not load'); } }), []);
    process.env.MIGRATION_EXACT_PREVIEW = '1';
    const paths = await representativeExactArticlePaths({ snapshotRead, selectRecord: async (baseline) => ({ record: baseline, sourceMode: 'dated-snapshot-preview' }) });
    assert.equal(paths.length, 1);
    assert.equal(`${paths[0].params.cmsArticleSlug}.html`, representativeArticle.uri.slice(1));
    assert.equal(paths[0].props.record.databaseId, 90485);
    assert.equal(paths[0].props.sourceMode, 'dated-snapshot-preview');
  } finally {
    if (prior === undefined) delete process.env.MIGRATION_EXACT_PREVIEW;
    else process.env.MIGRATION_EXACT_PREVIEW = prior;
  }
});

test('the new article is not silently counted among the 1,057 historic crawl paths', async () => {
  const crawl = parseCrawlCsv(await readFile(new URL('../docs/everytip-template-map-2026-09-30.csv', import.meta.url), 'utf8'));
  const successful = crawl.filter(({ status_code }) => status_code === '200');
  assert.equal(successful.length, 1057);
  assert.equal(successful.some(({ path }) => path === representativeArticle.uri), false);
});

test('opted-in exact article route fails closed on mismatched or unsafe content', async () => {
  const prior = process.env.MIGRATION_EXACT_PREVIEW;
  process.env.MIGRATION_EXACT_PREVIEW = '1';
  try {
    await assert.rejects(representativeExactArticlePaths({ snapshotRead: async () => ({ posts: [] }) }), /requires a matching/);
    await assert.rejects(representativeExactArticlePaths({ snapshotRead, selectRecord: async () => { throw new Error('Fresh CMS unavailable'); } }), /Fresh CMS unavailable/);
    await assert.rejects(representativeExactArticlePaths({ snapshotRead, selectRecord: async () => ({ record: { ...record(), content: '<script>active</script>' }, sourceMode: 'fresh-staging-wpgraphql-preview' }) }), /needs content conversion/);
  } finally {
    if (prior === undefined) delete process.env.MIGRATION_EXACT_PREVIEW;
    else process.env.MIGRATION_EXACT_PREVIEW = prior;
  }
});
