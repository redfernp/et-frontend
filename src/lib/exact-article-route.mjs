import { assessContent, latestContentSnapshot } from './migration-preview.mjs';
import { exactArticlePreviewRecord, representativeArticle } from './staging-article-cms.mjs';

/**
 * The September crawl predates this article, so it is deliberately not added to
 * the historic 1,057-path inventory. This local-only route is generated solely
 * when the exact-preview switch is enabled.
 */
export async function representativeExactArticlePaths({
  snapshotRead = latestContentSnapshot,
  selectRecord = exactArticlePreviewRecord,
} = {}) {
  if (process.env.MIGRATION_EXACT_PREVIEW !== '1') return [];
  const snapshot = await snapshotRead();
  const baseline = snapshot?.posts.find(({ uri }) => uri === representativeArticle.uri);
  if (!baseline || baseline.databaseId !== representativeArticle.databaseId || baseline.slug !== representativeArticle.slug) {
    throw new Error('Exact John Newsome preview requires a matching published-post snapshot record');
  }
  const { record, sourceMode } = await selectRecord(baseline);
  if (record.databaseId !== representativeArticle.databaseId || record.uri !== representativeArticle.uri ||
      record.slug !== representativeArticle.slug || !['dated-snapshot-preview', 'fresh-staging-wpgraphql-preview'].includes(sourceMode)) {
    throw new Error('Exact John Newsome preview source identity mismatch');
  }
  const issues = assessContent(record);
  if (issues.length) throw new Error(`Exact John Newsome preview needs content conversion: ${issues.join(', ')}`);
  return [{
    params: { cmsArticleSlug: representativeArticle.slug },
    props: { record, sourceMode, snapshotDate: snapshot.generatedAt },
  }];
}
