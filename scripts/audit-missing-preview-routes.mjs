import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseCrawlCsv, planExactRoutePreview } from '../src/lib/exact-route-preview.mjs';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';

const root = resolve(import.meta.dirname, '..');
const snapshot = await latestContentSnapshot();
if (!snapshot) throw new Error('No WordPress snapshot');
const crawl = parseCrawlCsv(await readFile(join(root, 'docs/everytip-template-map-2026-09-30.csv'), 'utf8'));
const plan = planExactRoutePreview(snapshot, crawl);
const excluded = new Map(plan.excluded.map((entry) => [entry.path, entry]));
const record = new Map([...snapshot.posts, ...snapshot.pages].map((entry) => [entry.uri, entry]));
const missing = crawl.filter((entry) => entry.status_code === '200' && !existsSync(entry.path === '/' ? join(root, 'dist/index.html') : entry.path.endsWith('.html') ? join(root, 'dist', entry.path.slice(1)) : join(root, 'dist', entry.path.slice(1), 'index.html')));
console.log(JSON.stringify(missing.map((row) => ({ path: row.path, template: row.suggested_template, reason: excluded.get(row.path)?.reason ?? 'not-generated-or-not-normalized', sourceId: record.get(row.path)?.databaseId ?? null, sourceLength: record.get(row.path)?.content?.length ?? null })), null, 2));
