// Local-only: never contacts WordPress or Cloudflare. Run from the Astro repo:
// node scripts/import-daily-tips.mjs --manifest path.json --csv path.csv
// Optional: --expected-date YYYY-MM-DD (defaults to today's Europe/London date)
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateDailyTipImport, writeDailyTipImport, londonDate } from '../src/lib/daily-tip-import.mjs';

const args = process.argv.slice(2);
if (args.length % 2) throw new Error('Expected --manifest, --csv and optional --expected-date value pairs');
const options = {};
for (let i = 0; i < args.length; i += 2) {
  const key = args[i];
  if (!['--manifest', '--csv', '--expected-date'].includes(key) || options[key]) throw new Error(`Unknown or duplicate option: ${key}`);
  options[key] = args[i + 1];
}
if (!options['--manifest'] || !options['--csv']) throw new Error('Both --manifest and --csv are required');
const expectedDate = options['--expected-date'] ?? londonDate();
if (!/^\d{4}-\d{2}-\d{2}$/.test(expectedDate)) throw new Error('Expected date must be YYYY-MM-DD');
const manifestPath = resolve(options['--manifest']);
const csvPath = resolve(options['--csv']);
if ((await stat(manifestPath)).size > 8192 || (await stat(csvPath)).size > 2_000_000) {
  throw new Error('Daily-tip input file exceeds size limit');
}
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const snapshot = validateDailyTipImport(manifest, await readFile(csvPath), { expectedDate });
const destination = await writeDailyTipImport(snapshot, resolve('artifacts/daily-tip-imports'));
console.log(JSON.stringify({ status: 'validated-local-only', destination, uploadId: snapshot.uploadId,
  feedDate: snapshot.feedDate, rowCount: snapshot.rowCount }));
