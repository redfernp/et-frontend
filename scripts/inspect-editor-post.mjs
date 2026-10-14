// Authenticated, read-only inspection of one staging WordPress post.
// Run with: node --env-file=.env.local scripts/inspect-editor-post.mjs 77061
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const base = process.env.EVERYTIP_WP_BASE_URL;
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
const id = Number(process.argv[2]);
if (!base || !username || !password || !Number.isSafeInteger(id) || id <= 0) {
  throw new Error('Staging credentials and one numeric post ID are required');
}
const site = new URL(base);
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Inspection is restricted to EveryTip staging');
}
const response = await fetch(new URL(`/wp-json/wp/v2/posts/${id}?context=edit`, site), {
  headers: { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` },
  signal: AbortSignal.timeout(45000),
});
if (!response.ok) throw new Error(`REST inspection failed: HTTP ${response.status}`);
const post = await response.json();
const content = post.content?.raw ?? '';
if (process.argv.includes('--save-raw')) {
  const rawDir = fileURLToPath(new URL('../data/raw/', import.meta.url));
  await mkdir(rawDir, { recursive: true });
  await writeFile(new URL(`../data/raw/wp-rest-post-${id}.raw.html`, import.meta.url), content);
}
console.log(JSON.stringify({
  id: post.id,
  slug: post.slug,
  status: post.status,
  date: post.date,
  modified: post.modified,
  editor: post._links?.['wp:action-unfiltered-html'] ? 'unfiltered-html-allowed' : 'unknown',
  contentLength: content.length,
  existingBlocks: (content.match(/<!--\s+wp:/g) ?? []).length,
  builderMarkers: /\bfl-builder\b|\bfl-row\b|\bfl-col\b|\btve_[\w-]+\b|\bthrv_[\w-]+\b/i.test(content),
  shortcodes: /\[(?:ninja_tables|adinserter|su_|vc_|et_|fl_builder|thrive_)[^\]]*\]/i.test(content),
  activeEmbeds: /<\s*(?:script|iframe|form)\b/i.test(content),
}, null, 2));
