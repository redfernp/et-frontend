// Read-only staging REST roundtrip check for private builder-roundup drafts.
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { extractBuilderRoundup } from '../src/lib/builder-roundup-preview.mjs';
import { classicHtmlToBlocks } from '../src/lib/classic-to-gutenberg.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const specs = [
  { sourceId: 75678, draftId: 90892, uri: '/best-bookie-for-lucky-15-bets-uk-ireland' },
  { sourceId: 75043, draftId: 90893, uri: '/what-is-best-way-to-bet-on-greyhounds' },
  { sourceId: 75853, draftId: 90894, uri: '/high-stakes-betting-sites-for-high-rollers-vips' },
];
const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? 'https://wordpress-159231-2098144.cloudwaysapps.com');
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Only the named EveryTip staging host is permitted');
}
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!username || !password) throw new Error('Missing staging REST credentials');
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const snapshot = await latestContentSnapshot();
if (!snapshot) throw new Error('Missing local snapshot');
const results = [];
const captures = [];
for (const spec of specs) {
  const source = snapshot.pages.find((page) => page.databaseId === spec.sourceId && page.uri === spec.uri);
  if (!source) throw new Error(`Missing local source ${spec.sourceId}`);
  const editorial = extractBuilderRoundup(source);
  const expected = classicHtmlToBlocks(`${editorial.intro}\n${editorial.body}`);
  const response = await fetch(new URL(`/wp-json/wp/v2/pages/${spec.draftId}?context=edit`, site), {
    headers: { Authorization: authorization }, signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Staging draft ${spec.draftId}: HTTP ${response.status}`);
  const page = await response.json();
  const verified = page.id === spec.draftId && page.status === 'draft' && page.content?.raw === expected &&
    page.slug === `staging-gutenberg-editorial-${spec.uri.slice(1)}-2026`;
  results.push({ sourceId: spec.sourceId, draftId: spec.draftId, status: page.status, verified });
  if (verified) captures.push({ sourceId: spec.sourceId, draftId: spec.draftId, uri: spec.uri,
    status: page.status, modified: page.modified, content: page.content.raw });
  if (!verified) break;
}
console.log(JSON.stringify({ environment: 'staging', results }, null, 2));
if (results.length !== specs.length || results.some((item) => !item.verified)) process.exitCode = 1;
if (process.argv.includes('--capture') && !process.exitCode) {
  const directory = resolve(process.cwd(), 'data/raw');
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, 'staging-builder-editorial-drafts.json'),
    JSON.stringify({ capturedAt: new Date().toISOString(), pages: captures }, null, 2));
  console.log('Captured verified draft bodies to ignored local data/raw fixture.');
}
