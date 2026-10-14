// Read-only opt-in probe. It writes no snapshot and does not alter Astro routes.
import { discoverPublishedContent } from '../src/lib/published-content-discovery.mjs';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { comparePublishedInventory } from '../src/lib/published-content-drift.mjs';

const inventory = await discoverPublishedContent({
  onProgress: ({ kind, page, count }) => console.log(`${kind} page ${page}: ${count} records validated`),
});
const snapshot = await latestContentSnapshot();
if (!snapshot) throw new Error('No dated WordPress snapshot for comparison');
const drift = comparePublishedInventory(snapshot, inventory);
console.log(JSON.stringify({
  source: inventory.source,
  discoveredAt: inventory.discoveredAt,
  posts: inventory.posts.length,
  pages: inventory.pages.length,
  nonRoutablePages: inventory.nonRoutablePages.map(({ databaseId, slug, isPostsPage }) => ({ databaseId, slug, isPostsPage })),
  total: inventory.posts.length + inventory.pages.length,
  comparedWith: snapshot.generatedAt,
  driftCounts: Object.fromEntries(Object.entries(drift).map(([kind, records]) => [kind, records.length])),
  driftSamples: Object.fromEntries(Object.entries(drift).map(([kind, records]) => [kind, records.slice(0, 20)])),
}, null, 2));
