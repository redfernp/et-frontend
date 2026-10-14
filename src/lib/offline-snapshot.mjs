import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

// Explicit local-preview switch only. A production build must use live CMS data.
export function offlinePreviewEnabled() {
  return process.env.MIGRATION_OFFLINE_SNAPSHOT === '1';
}

export async function offlineSnapshotNode(uri, type) {
  if (!offlinePreviewEnabled()) return null;
  if (type !== 'posts' && type !== 'pages') throw new Error(`Unsupported snapshot type: ${type}`);
  const directory = join(process.cwd(), 'data', 'raw');
  const files = (await readdir(directory)).filter((name) => /^staging-wordpress-public-.*\.json$/.test(name)).sort();
  if (!files.length) throw new Error('Offline preview requested without a WordPress content snapshot');
  const snapshot = JSON.parse(await readFile(join(directory, files.at(-1)), 'utf8'));
  const node = snapshot[type].find((entry) => entry.uri === uri);
  if (!node) throw new Error(`Missing ${type} URI in offline WordPress snapshot: ${uri}`);
  console.warn(`Using dated WordPress snapshot ${snapshot.generatedAt} for pilot ${uri}; not a publication source`);
  return node;
}
