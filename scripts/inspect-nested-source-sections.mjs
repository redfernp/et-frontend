// Read-only section inventory for source-locked builder extraction decisions.
import { parseDocument } from 'htmlparser2';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';

const snapshot = await latestContentSnapshot();
if (!snapshot) throw new Error('No local WordPress snapshot');
const records = new Map([...snapshot.posts, ...snapshot.pages].map((record) => [record.uri, record]));
const plainText = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(plainText).join('');
for (const path of process.argv.slice(2)) {
  const record = records.get(path);
  if (!record) throw new Error(`Missing snapshot path ${path}`);
  const sections = [];
  function visit(node) {
    if (['p', 'h2', 'h3', 'li'].includes(node.name)) {
      const value = plainText(node).replace(/\s+/g, ' ').trim();
      if (value) sections.push({ index: sections.length, kind: node.name, text: value.slice(0, 180) });
    }
    for (const child of node.children ?? []) visit(child);
  }
  visit(parseDocument(record.content ?? ''));
  console.log(JSON.stringify({ path, id: record.databaseId, sections }, null, 2));
}
