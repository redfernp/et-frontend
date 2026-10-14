// Read-only, built-asset guard for exact home and free-tips preview head metadata.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { validatePriorityHeadPreview } from '../src/lib/priority-head-preview-guard.mjs';

const snapshot = await latestContentSnapshot();
if (!snapshot) throw new Error('Missing dated WordPress source snapshot');
const specs = [
  { uri: '/', id: 16, asset: 'dist/index.html' },
  { uri: '/free-betting-tips', id: 76939, asset: 'dist/free-betting-tips/index.html' },
];
const results = [];
for (const spec of specs) {
  const source = [...snapshot.posts, ...snapshot.pages].find((item) => item.uri === spec.uri);
  const html = await readFile(resolve(process.cwd(), spec.asset), 'utf8');
  results.push(validatePriorityHeadPreview(html, source, spec));
}
console.log(JSON.stringify({ auditedAt: new Date().toISOString(), source: 'dated WordPress snapshot',
  assets: results }, null, 2));
