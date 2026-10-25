// Cloaked affiliate links for the Tipstrr tipsters on the paid tipsters page:
// /go/tipstrr-<slug> -> https://tipstrr.com/tipster/<slug>/join?ref-a=everytip
// Tipster stats in data/tipstrr-tipsters.json are a dated snapshot of their public Tipstrr
// profiles, collected in a normal browser session (Tipstrr blocks scripted requests).
// Usage: node scripts/tipstrr-links.mjs
import { readFile, writeFile } from 'node:fs/promises';

const data = JSON.parse(await readFile('data/tipstrr-tipsters.json', 'utf8'));
const file = JSON.parse(await readFile('data/affiliate-redirects.json', 'utf8'));
let added = 0;
for (const tipster of data.sections.flatMap((section) => section.tipsters)) {
  const path = `/go/tipstrr-${tipster.slug}`;
  if (!file.redirects[path]) added++;
  file.redirects[path] = { status: 302, location: `https://tipstrr.com/tipster/${tipster.slug}/join?ref-a=everytip` };
}
file.redirects = Object.fromEntries(Object.keys(file.redirects).sort().map((key) => [key, file.redirects[key]]));
await writeFile('data/affiliate-redirects.json', JSON.stringify(file, null, 2) + '\n');
console.log(`${added} new Tipstrr links, ${Object.keys(file.redirects).length} /go/ links in total`);
