export type BuilderRoundupEditorial = {
  hero: { src: string; alt: string } | null;
  intro: string;
  body: string;
  topic: string;
  withheldNodes: number;
  sourceNodeCount: number;
};
export const builderRoundupConfigs: Record<string, unknown>;
export function extractBuilderRoundup(record: { uri: string; content: string }): BuilderRoundupEditorial;
export function builderRoundupPreviewPaths(): Promise<Array<{
  params: { roundupSlug: string };
  props: {
    record: { uri: string; title: string; databaseId: number; modified: string; seo?: { title?: string; metaDesc?: string } };
    editorial: BuilderRoundupEditorial;
    draft?: { sourceId: number; draftId: number; uri: string; status: 'draft'; modified: string; content: string };
    crawlRow: { indexability: string; canonical: string };
    snapshotDate: string;
  };
}>>;
