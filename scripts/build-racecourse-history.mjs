// Past racecourse tips for the "Previous tips" accordion on each racecourse page, from the
// tissue tracker (one top-rated horse per race, with the result once settled).
// Only public fields are kept: no tissue price, value rating or race check, so nothing here
// shows how the picks are chosen.
// Usage: node scripts/build-racecourse-history.mjs [path/to/top-rated-tracker.csv]
import { readFile, writeFile } from 'node:fs/promises';

const source = process.argv[2] ?? '../tissue/top-rated-tracker.csv';
const text = (await readFile(source, 'utf8')).replace(/^﻿/, '');

// RFC 4180 rows: race names can contain quoted commas.
function parse(csv) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (quoted) {
      if (c === '"' && csv[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && csv[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const [header, ...lines] = parse(text);
const col = Object.fromEntries(header.map((name, index) => [name.trim(), index]));
const courses = {};
for (const line of lines) {
  const get = (name) => (line[col[name]] ?? '').trim();
  const course = get('Course ID');
  if (!course || !get('Date')) continue;
  const meetings = courses[course] ??= {};
  (meetings[get('Date')] ??= []).push({
    time: get('Time'), race: get('Race'), horse: get('Horse'), jockey: get('Jockey'), trainer: get('Trainer'),
    sp: get('Forecast SP'), bsp: get('BSP'), finish: get('Finish'), won: get('Won') === 'Y',
  });
}

// Newest meeting first; races in card order.
const out = {};
for (const [course, meetings] of Object.entries(courses)) {
  out[course] = Object.entries(meetings).sort(([a], [b]) => b.localeCompare(a))
    .map(([date, races]) => ({ date, races: races.sort((a, b) => a.time.localeCompare(b.time)) }));
}
const latest = lines.map((line) => line[col.Date]).filter(Boolean).sort().at(-1);
await writeFile('src/data/racecourse-history.json', `${JSON.stringify({ source: 'tissue/top-rated-tracker.csv', latest, courses: out })}\n`);
console.log(JSON.stringify({ rows: lines.length, courses: Object.keys(out).length, latest }));
