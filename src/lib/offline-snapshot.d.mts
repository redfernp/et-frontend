export type SnapshotNode = {
  databaseId: number;
  uri: string;
  title: string;
  content: string;
  modified: string;
};
export function offlinePreviewEnabled(): boolean;
export function offlineSnapshotNode(uri: string, type: 'posts' | 'pages'): Promise<SnapshotNode | null>;
