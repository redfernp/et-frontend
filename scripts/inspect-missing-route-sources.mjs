// Read-only snapshot inventory for choosing the next safe exact-path template.
import { parseDocument } from 'htmlparser2';
import { createHash } from 'node:crypto';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';

const snapshot = await latestContentSnapshot();
if (!snapshot) throw new Error('No local WordPress snapshot');
const records = new Map([...snapshot.posts, ...snapshot.pages].map((record) => [record.uri, record]));
const text = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(text).join('');
const deep = process.argv.includes('--deep');
for (const path of process.argv.slice(2).filter((arg) => arg !== '--deep')) {
  const record = records.get(path);
  if (!record) {
    console.log(JSON.stringify({ path, found: false }));
    continue;
  }
  const nodes = parseDocument(record.content || '', { decodeEntities: true }).children;
  const headings = nodes.filter((node) => /^h[1-4]$/.test(node.name || '')).map((node) => text(node).trim());
  const allHeadings = [];
  if (deep) {
    const visit = (node) => { if (/^h[1-4]$/.test(node.name || '')) allHeadings.push(text(node).trim()); for (const child of node.children ?? []) visit(child); };
    nodes.forEach(visit);
  }
  console.log(JSON.stringify({ path, found: true, id: record.databaseId, modified: record.modified, slug: record.slug,
    title: record.title, length: record.content?.length, ...(deep ? { digest: createHash('sha256').update(record.content ?? '').digest('hex') } : {}),
    headings: headings.slice(0, 30), ...(deep ? { nestedHeadings: allHeadings.slice(0, 40), previewText: nodes.map(text).join(' ').replace(/\s+/g, ' ').trim().slice(0, 650) } : {}),
    topLevelTags: nodes.filter((node) => node.type === 'tag').map((node) => node.name).slice(0, 30) }));
}
