// Read-only, bounded HEAD check for published CMS paths absent from the crawl
// that cannot yet be rendered safely. No redirect is followed or content read.
import { readFile } from 'node:fs/promises';
import { latestContentSnapshot, assessContent } from '../src/lib/migration-preview.mjs';
import { parseCrawlCsv } from '../src/lib/exact-route-preview.mjs';

const snapshot = await latestContentSnapshot();
if (!snapshot) throw new Error('No local WordPress snapshot');
const crawl = parseCrawlCsv(await readFile(new URL('../docs/everytip-template-map-2026-09-30.csv', import.meta.url), 'utf8'));
const crawled = new Set(crawl.map(({ path }) => path));
const includeSafe = process.argv.includes('--all');
const records = [...snapshot.posts, ...snapshot.pages]
  .filter((record) => record.uri && !crawled.has(record.uri) && (includeSafe || assessContent(record).length));
const results = [];
let cursor = 0;
async function worker() {
  while (cursor < records.length) {
    const record = records[cursor++];
    const url = new URL(record.uri, 'https://www.everytip.co.uk');
    if (url.origin !== 'https://www.everytip.co.uk') throw new Error(`Unsafe live probe URL: ${record.uri}`);
    try {
      const response = await fetch(url, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(12000) });
      results.push({ path: record.uri, status: response.status,
        location: response.headers.get('location') ?? undefined, issues: assessContent(record) });
    } catch (error) {
      results.push({ path: record.uri, error: error.message, issues: assessContent(record) });
    }
  }
}
await Promise.all([worker(), worker()]);
results.sort((a, b) => a.path.localeCompare(b.path));
console.log(JSON.stringify({ checked: results.length, statusCounts: Object.fromEntries(
  [...new Set(results.map((row) => row.status ?? 'error'))].map((status) => [status, results.filter((row) => (row.status ?? 'error') === status).length])),
  non200OrErrors: results.filter((row) => row.status !== 200),
  ...(process.argv.includes('--details') ? { results } : {}),
  scope: 'Read-only live HEAD results at probe time, no redirect follow and no publication decision.' }, null, 2));
