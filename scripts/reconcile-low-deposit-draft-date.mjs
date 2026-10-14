// WordPress advances the date of an unpublished draft on a REST content edit.
// Restore only the saved pre-repair date after verifying body and ACF state.
import { readFile, readdir } from 'node:fs/promises';

const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? '');
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Named EveryTip staging host only');
}
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!username || !password) throw new Error('Missing staging REST credentials');
const headers = { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` };
const directory = new URL('../data/raw/', import.meta.url);
const backupName = (await readdir(directory)).filter((name) =>
  /^wp-low-deposit-draft-90880-pre-repair-.*\.json$/.test(name)).sort().at(-1);
if (!backupName) throw new Error('Low-deposit draft backup missing');
const backup = JSON.parse(await readFile(new URL(backupName, directory), 'utf8'));
const url = new URL('/wp-json/wp/v2/posts/90880?context=edit', site);
const read = async () => {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`Draft read HTTP ${response.status}`);
  return response.json();
};
const current = await read();
if (backup.draft?.id !== 90880 || current.id !== 90880 || current.status !== 'draft' ||
    current.slug !== backup.draft.slug || current.content?.raw !== backup.revised ||
    JSON.stringify(current.acf) !== JSON.stringify(backup.draft.acf) ||
    current.author !== backup.draft.author || current.featured_media !== backup.draft.featuredMedia ||
    JSON.stringify(current.categories) !== JSON.stringify(backup.draft.categories) ||
    current.title?.raw !== backup.draft.title) {
  throw new Error('Draft no longer matches guarded repair; refusing date change');
}
if (current.date !== backup.draft.date) {
  const response = await fetch(new URL('/wp-json/wp/v2/posts/90880', site), {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: backup.draft.date }), signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error(`Draft date restore HTTP ${response.status}`);
}
const after = await read();
const verified = after.id === 90880 && after.status === 'draft' &&
  after.date === backup.draft.date && after.content?.raw === backup.revised &&
  JSON.stringify(after.acf) === JSON.stringify(backup.draft.acf);
console.log(JSON.stringify({ environment: 'staging', draftId: 90880,
  dateRestored: after.date, bodyAndAcfStable: verified, backup: backupName }, null, 2));
if (!verified) process.exitCode = 1;
