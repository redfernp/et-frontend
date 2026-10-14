// WordPress advances an unpublished draft's date during REST content edits.
// Restore only the pre-repair draft date after an independently verified body.
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
  /^wp-paypal-draft-90868-pre-repair-.*\.json$/.test(name)).sort().at(-1);
if (!backupName) throw new Error('PayPal draft backup missing');
const backup = JSON.parse(await readFile(new URL(backupName, directory), 'utf8'));
const converted = await readFile(new URL('../data/raw/wp-gutenberg-preview-58743.html', import.meta.url), 'utf8');
const read = async () => {
  const response = await fetch(new URL('/wp-json/wp/v2/posts/90868?context=edit', site),
    { headers, signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`Draft read HTTP ${response.status}`);
  return response.json();
};
const current = await read();
if (backup.draft?.id !== 90868 || current.id !== 90868 || current.status !== 'draft' ||
    current.slug !== backup.draft.slug || current.content?.raw !== converted ||
    JSON.stringify(current.acf) !== JSON.stringify(backup.draft.acf) ||
    current.author !== backup.draft.author || current.featured_media !== backup.draft.featuredMedia ||
    JSON.stringify(current.categories) !== JSON.stringify(backup.draft.categories) ||
    current.title?.raw !== backup.draft.title) {
  throw new Error('Draft no longer matches guarded repair; refusing date change');
}
if (current.date !== backup.draft.date) {
  const response = await fetch(new URL('/wp-json/wp/v2/posts/90868', site), {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: backup.draft.date }), signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error(`Draft date restore HTTP ${response.status}`);
}
const after = await read();
const verified = after.id === 90868 && after.status === 'draft' &&
  after.date === backup.draft.date && after.content?.raw === converted &&
  JSON.stringify(after.acf) === JSON.stringify(backup.draft.acf);
console.log(JSON.stringify({ environment: 'staging', draftId: 90868, dateRestored: after.date,
  bodyAndAcfStable: verified, backup: backupName }, null, 2));
if (!verified) process.exitCode = 1;
