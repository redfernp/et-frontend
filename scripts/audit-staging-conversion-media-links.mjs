// Offline audit of saved preconversion bodies versus the Gutenberg bodies we wrote.
// This detects lost anchor destinations or image sources without touching WordPress.
import { readdir, readFile } from 'node:fs/promises';
import { parseDocument } from 'htmlparser2';

const directory = new URL('../data/raw/', import.meta.url);
const files = (await readdir(directory)).filter((name) => /^wp-preconversion-\d+-\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort();
const retiredPortraits = [
  'saturday-horse-racing-tips-and-previews-from-expert-tipster-seymour-biz-on-everytip.png',
  'John-Newsome-Football-Betting-Tips-everytip.png',
];
const inventory = (html) => {
  const entries = { links: [], images: [] };
  const visit = (node) => {
    if (node.type === 'tag' && node.name === 'a' && node.attribs?.href) entries.links.push(node.attribs.href);
    if (node.type === 'tag' && node.name === 'img' && node.attribs?.src) entries.images.push(node.attribs.src);
    for (const child of node.children ?? []) visit(child);
  };
  for (const node of parseDocument(html ?? '', { decodeEntities: true }).children) visit(node);
  return entries;
};
const difference = (before, after) => {
  const counts = new Map();
  for (const item of after) counts.set(item, (counts.get(item) ?? 0) + 1);
  return before.filter((item) => {
    const available = counts.get(item) ?? 0;
    if (available > 0) { counts.set(item, available - 1); return false; }
    return true;
  });
};
const rows = [];
for (const file of files) {
  const record = JSON.parse(await readFile(new URL(file, directory), 'utf8'));
  const original = inventory(record.before?.content);
  const converted = inventory(record.converted);
  const missingLinks = difference(original.links, converted.links);
  const missingImages = difference(original.images, converted.images)
    .filter((source) => !retiredPortraits.some((portrait) => source.includes(portrait)));
  if (missingLinks.length || missingImages.length) rows.push({
    id: record.before?.id, file, missingLinks, missingImages,
  });
}
console.log(JSON.stringify({ audited: files.length, withDifferences: rows.length, rows }, null, 2));
