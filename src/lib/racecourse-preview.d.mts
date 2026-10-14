export type RacecourseEditorial = {
  hero: { src: string; alt: string } | null;
  introHtml: string;
  sections: { heading: string; html: string }[];
  discardedModules: number;
};
export function extractRacecoursePreview(record: { uri: string; content: string }): RacecourseEditorial;
export function racecoursePreviewPaths(): Promise<Array<{
  params: { course: string };
  props: {
    record: { uri: string; databaseId: number; title: string; modified: string };
    editorial: RacecourseEditorial;
    snapshotDate: string;
    crawlRow: { indexability: string; canonical: string };
  };
}>>;
export function topLevelRacecoursePreviewPaths(): Promise<Array<{
  params: { courseSlug: string };
  props: {
    record: { uri: string; databaseId: number; title: string; modified: string; seo?: { title?: string; metaDesc?: string } };
    editorial: RacecourseEditorial;
    snapshotDate: string;
    crawlRow: { indexability: string; canonical: string };
  };
}>>;
