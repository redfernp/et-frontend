// Read-only metadata audit. Never print the Google Sheet URL, credentials or
// selections. Run with: node --env-file=.env.local scripts/audit-priority-tip-sources.mjs
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const expectedHost = 'wordpress-159231-2098144.cloudwaysapps.com';
const base = new URL(process.env.EVERYTIP_WP_BASE_URL ?? '');
if (base.protocol !== 'https:' || base.hostname !== expectedHost || base.username || base.password) {
  throw new Error('This audit is restricted to the known EveryTip staging WordPress host');
}
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!username || !password) throw new Error('Missing staging application credentials');
const auth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

async function getSettings(id) {
  const response = await fetch(new URL(`/wp-json/ninjatables/v2/settings/${id}`, base), {
    headers: { Authorization: auth }, signal: AbortSignal.timeout(35000),
  });
  if (!response.ok) throw new Error(`Staging Ninja settings ${id} returned ${response.status}`);
  return response.json();
}

export function parseCsv(source) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (char !== '\r') cell += char;
  }
  if (quoted) throw new Error('Unclosed CSV quote');
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

async function getPublishedCsv(remoteURL) {
  const url = new URL(remoteURL);
  if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com' ||
      !url.pathname.startsWith('/spreadsheets/') || url.username || url.password) {
    throw new Error('Table 72501 source is not an approved published Google Sheets URL');
  }
  // Ninja stores Google's published HTML view. Request the CSV representation
  // of the same published sheet and gid; never log the private-looking URL.
  if (url.pathname.endsWith('/pubhtml')) {
    url.pathname = url.pathname.replace(/\/pubhtml$/, '/pub');
    url.searchParams.set('output', 'csv');
  }
  if (url.pathname.endsWith('/pub') && url.searchParams.get('output') !== 'csv') {
    throw new Error('Google Sheets published source is not a CSV representation');
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Google Sheets CSV returned ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  if (/html/i.test(contentType)) throw new Error('Google Sheets returned HTML rather than CSV');
  const body = await response.text();
  if (body.length > 2_000_000) throw new Error('Google Sheets CSV exceeds audit size limit');
  if (/^\s*<!doctype html|^\s*<html/i.test(body)) throw new Error('Google Sheets returned an HTML document rather than CSV');
  return { rows: parseCsv(body), lastModified: response.headers.get('last-modified') };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const value = await getSettings(72501);
  const fixtures = await getSettings(86633);
  const columns = value.columns?.map(({ name, key, breakpoints }) => ({ name, key, breakpoints }));
  if (value.table?.dataSourceType !== 'google-csv' || !Array.isArray(columns) || columns.length !== 7) {
    throw new Error('Unexpected value-tips table source or column contract');
  }
  const csv = await getPublishedCsv(value.table.remoteURL);
  const [header, ...data] = csv.rows;
  if (!header || header.length !== 7 || !header.some((name) => /^course$/i.test(name.trim()))) {
    throw new Error('Published CSV header does not match the seven-column value-tips contract');
  }
  const widthCounts = Object.fromEntries([...new Set(data.map((row) => row.length))].sort().map((width) => [width, data.filter((row) => row.length === width).length]));
  const blankCounts = Object.fromEntries(header.map((name, index) => [name, data.filter((row) => !(row[index] ?? '').trim()).length]));
  const courseIndex = header.findIndex((name) => /^course$/i.test(name.trim()));
  const kemptonCount = courseIndex < 0 ? null : data.filter((row) => /^kempton(?:\s*\(aw\))?$/i.test((row[courseIndex] ?? '').trim())).length;
  console.log(JSON.stringify({ capturedAt: new Date().toISOString(),
    valueTips: { id: 72501, sourceType: value.table.dataSourceType, columns, csvHeader: header,
      rowCount: data.length, widthCounts, blankCounts, kemptonCount,
      hasDateColumn: header.some((name) => /date|day|published/i.test(name)),
      googleLastModified: csv.lastModified },
    kemptonSecondary: { id: 86633, sourceType: fixtures.table?.dataSourceType,
      columns: fixtures.columns?.map(({ name, key }) => ({ name, key })) },
  }, null, 2));
}
