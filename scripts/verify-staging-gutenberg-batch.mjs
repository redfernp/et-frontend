// Read-only post-conversion check against saved originals and WordPress rendering.
import { readFile, readdir } from 'node:fs/promises';
import { parseDocument } from 'htmlparser2';

const ids = process.argv.slice(2).map(Number);
if (!ids.length || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
  throw new Error('Usage: verify-staging-gutenberg-batch.mjs <post-id> [post-id ...]');
}
const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? '');
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') throw new Error('Staging host only');
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!username || !password) throw new Error('Missing staging credentials');
const auth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const text = (html) => {
  const read = (node) => node.name === 'br' ? ' ' : node.type === 'text' ? node.data : (node.children ?? []).map(read).join('');
  return read(parseDocument(html, { decodeEntities: true })).replace(/\s+/g, ' ').trim();
};
const firstDifference = (left, right) => {
  let position = 0;
  while (position < Math.min(left.length, right.length) && left[position] === right[position]) position++;
  if (position === left.length && position === right.length) return null;
  return { position, source: left.slice(Math.max(0, position - 24), position + 24),
    rendered: right.slice(Math.max(0, position - 24), position + 24) };
};
const normalizeTypography = (value) => value.replace(/[‘’′]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-');
const renderedMatchesSource = (source, rendered) => {
  const expected = normalizeTypography(source);
  const actual = normalizeTypography(rendered);
  if (!expected.includes('[current_date]')) return expected === actual;
  const parts = expected.split('[current_date]');
  let offset = 0;
  for (let index = 0; index < parts.length; index++) {
    if (!actual.startsWith(parts[index], offset)) return false;
    offset += parts[index].length;
    if (index < parts.length - 1) {
      const date = actual.slice(offset).match(/^[0-9]{1,2}(?:st|nd|rd|th) [A-Z][a-z]+ [0-9]{4}/)?.[0];
      if (!date) return false;
      offset += date.length;
    }
  }
  return offset === actual.length;
};
const comparableSource = (source, rendered) => {
  const date = normalizeTypography(rendered).match(/\b[0-9]{1,2}(?:st|nd|rd|th) [A-Z][a-z]+ [0-9]{4}\b/)?.[0];
  return normalizeTypography(source).replaceAll('[current_date]', date ?? '[current_date]');
};
let failed = false;
let inconclusive = false;
for (const id of ids) {
  const directory = new URL('../data/raw/', import.meta.url);
  const filename = (await readdir(directory)).filter((name) => new RegExp(`^wp-preconversion-${id}-\\d{4}-\\d{2}-\\d{2}\\.json$`).test(name)).sort().at(-1);
  if (!filename) throw new Error(`No dated preconversion backup for ${id}`);
  const backup = JSON.parse(await readFile(new URL(filename, directory), 'utf8'));
  let response;
  try {
    response = await fetch(new URL(`/wp-json/wp/v2/posts/${id}?context=edit`, site), {
      headers: { Authorization: auth }, signal: AbortSignal.timeout(60000),
    });
  } catch (error) {
    console.log(JSON.stringify({ id, status: 'inconclusive', reason: `Staging REST unavailable: ${error.name}` }));
    inconclusive = true;
    break;
  }
  if (!response.ok) throw new Error(`Staging REST ${id}: HTTP ${response.status}`);
  const current = await response.json();
  const rawEqual = current.content?.raw === backup.converted;
  const originalText = text(backup.before.content);
  const rawTextEqual = text(current.content?.raw ?? '') === originalText;
  const renderedText = text(current.content?.rendered ?? '');
  const renderedContainsOriginal = renderedMatchesSource(originalText, renderedText);
  const seo = current.yoast_head_json;
  const seoStable = JSON.stringify(seo && { title: seo.title, description: seo.description,
    canonical: seo.canonical, robots: seo.robots }) === JSON.stringify(backup.before.seo);
  const statusStable = current.id === id && current.slug === backup.before.slug && current.status === backup.before.status;
  const verified = rawEqual && rawTextEqual && renderedContainsOriginal && seoStable && statusStable;
  if (!verified) failed = true;
  console.log(JSON.stringify({ id, verified, rawEqual, rawTextEqual, renderedContainsOriginal,
    seoStable, statusStable, originalTextLength: originalText.length, renderedTextLength: renderedText.length,
    firstDifference: renderedContainsOriginal ? null : firstDifference(comparableSource(originalText, renderedText), normalizeTypography(renderedText)) }));
}
if (failed) process.exitCode = 1;
else if (inconclusive) process.exitCode = 2;
