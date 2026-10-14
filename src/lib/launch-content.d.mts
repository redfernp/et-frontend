export interface LaunchRecord {
  databaseId: number;
  uri: string;
  title: string;
  content: string;
  date: string;
  modified: string;
  status: string;
  kind: string;
  seo: { title: string; metaDesc: string; canonical: string; metaRobotsNoindex: string; metaRobotsNofollow: string } | null;
}
export const endpoint: string;
export function launchContent(): Promise<LaunchRecord[]>;
export function robotsFor(record: LaunchRecord): string;
export function requestGraphql(query: string, variables?: Record<string, unknown>): Promise<any>;
