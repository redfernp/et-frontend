// Read-only, content-free summary of current staging WPGraphQL priority pages.
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { priorityPages, readStagingPriorityPage } from '../src/lib/staging-priority-page-cms.mjs';

const snapshot = await latestContentSnapshot();
if (!snapshot) throw new Error('No dated WordPress snapshot');
const rows = [];
for (const [uri, id] of Object.entries(priorityPages)) {
  const expected = snapshot.pages.find((page) => page.databaseId === id && page.uri === uri);
  if (!expected) throw new Error(`Priority page ${uri} absent from snapshot`);
  const fresh = await readStagingPriorityPage(expected);
  rows.push({ id, uri, modified: fresh.modified, htmlLength: fresh.content.length,
    titlePresent: Boolean(fresh.seo.title), descriptionPresent: Boolean(fresh.seo.metaDesc),
    robots: fresh.seo.metaRobotsNoindex });
}
console.log(JSON.stringify({ environment: 'staging', mode: 'read-only', pages: rows }, null, 2));
