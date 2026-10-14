import { latestContentSnapshot } from './migration-preview.mjs';

export async function newsletterPreviewPaths() {
  if (process.env.MIGRATION_EXACT_PREVIEW !== '1') return [];
  const snapshot = await latestContentSnapshot();
  const source = [...(snapshot?.posts ?? []), ...(snapshot?.pages ?? [])]
    .find((item) => item.uri === '/free-betting-tips-previews-analysis-by-email' && item.databaseId === 12419);
  if (!source) throw new Error('Missing exact legacy newsletter landing source');
  return [{ params: { newsletterSlug: source.uri.slice(1) }, props: { source } }];
}
