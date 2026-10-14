// Independent readback for the small, explicitly allowlisted staging page pilot.
import { readFile, readdir } from 'node:fs/promises';
import { parseDocument } from 'htmlparser2';

const id = Number(process.argv[2]);
if (![70281, 9310].includes(id)) throw new Error('Usage: verify-staging-gutenberg-page.mjs <70281|9310>');
const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? '');
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Staging host only');
}
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!username || !password) throw new Error('Missing staging REST credentials');
const directory = new URL('../data/raw/', import.meta.url);
const filename = (await readdir(directory)).filter((name) =>
  new RegExp(`^wp-page-preconversion-${id}-\\d{4}-\\d{2}-\\d{2}\\.json$`).test(name)).sort().at(-1);
if (!filename) throw new Error(`No saved original for page ${id}`);
const backup = JSON.parse(await readFile(new URL(filename, directory), 'utf8'));
const headers = { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` };
const response = await fetch(new URL(`/wp-json/wp/v2/pages/${id}?context=edit`, site),
  { headers, signal: AbortSignal.timeout(60000) });
if (!response.ok) throw new Error(`Staging read HTTP ${response.status}`);
const current = await response.json();
const text = (html) => {
  const visit = (node) => node.name === 'br' ? ' ' : node.type === 'text' ? node.data :
    (node.children ?? []).map(visit).join('');
  return visit(parseDocument(html, { decodeEntities: true })).replace(/\s+/g, ' ').trim();
};
const normalize = (value) => value.replace(/[‘’′]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-');
const links = (html) => {
  const found = [];
  const visit = (node) => {
    if (node.name === 'a') found.push(node.attribs?.href ?? '');
    for (const child of node.children ?? []) visit(child);
  };
  visit(parseDocument(html));
  return found;
};
const original = backup.before.content;
const checks = {
  identity: current.id === id && current.slug === backup.before.slug &&
    current.status === backup.before.status,
  rawEqual: current.content?.raw === backup.converted,
  rawText: text(current.content?.raw ?? '') === text(original),
  renderedText: normalize(text(current.content?.rendered ?? '')) === normalize(text(original)),
  rawLinks: JSON.stringify(links(current.content?.raw ?? '')) === JSON.stringify(links(original)),
  renderedLinks: JSON.stringify(links(current.content?.rendered ?? '')) === JSON.stringify(links(original)),
  seo: JSON.stringify(current.yoast_head_json && {
    title: current.yoast_head_json.title, description: current.yoast_head_json.description,
    canonical: current.yoast_head_json.canonical, robots: current.yoast_head_json.robots,
  }) === JSON.stringify(backup.before.seo),
};
console.log(JSON.stringify({ id, environment: 'staging', verified: Object.values(checks).every(Boolean), checks,
  originalTextLength: text(original).length, renderedTextLength: text(current.content?.rendered ?? '').length }));
if (Object.values(checks).some((value) => !value)) process.exitCode = 1;
