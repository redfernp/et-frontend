// Local-only comparison of a saved authenticated raw-shortcode audit and the
// public rendered snapshot. It never connects to WordPress or writes files.
import { readFile } from 'node:fs/promises';
import { parseDocument } from 'htmlparser2';

const auditPath = new URL('../artifacts/staging-ninja-shortcodes/audit-2026-10-13T19-51-32.541Z.json', import.meta.url);
const snapshotPath = new URL('../data/raw/staging-wordpress-public-2026-10-02T17-36-37-050Z.json', import.meta.url);
const audit = JSON.parse(await readFile(auditPath, 'utf8'));
const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
const byType = {
  posts: new Map(snapshot.posts.map((item) => [item.databaseId, item])),
  pages: new Map(snapshot.pages.map((item) => [item.databaseId, item])),
};

function descendants(node, predicate, found = []) {
  if (predicate(node)) found.push(node);
  for (const child of node.children ?? []) descendants(child, predicate, found);
  return found;
}

function plainText(node) {
  if (node.type === 'text') return node.data;
  return (node.children ?? []).map(plainText).join('');
}

const rows = audit.rows.map((record) => {
  const source = byType[record.type]?.get(record.id);
  if (!source || source.uri !== record.uri) throw new Error(`Snapshot identity mismatch: ${record.type} ${record.id}`);
  const tree = parseDocument(source.content ?? '', { decodeEntities: true });
  const tables = descendants(tree, (node) => node.name === 'table' && node.attribs?.['data-footable_id'])
    .map((table) => ({
      id: table.attribs['data-footable_id'],
      label: table.attribs['aria-label'] ?? '',
      headers: descendants(table, (node) => node.name === 'thead')
        .flatMap((head) => descendants(head, (node) => node.name === 'th'))
        .map((cell) => plainText(cell).replace(/\s+/g, ' ').trim()),
      renderedRows: descendants(table, (node) => node.name === 'tbody')
        .flatMap((body) => descendants(body, (node) => node.name === 'tr')).length,
    }));
  const rawIds = record.shortcodes.map((item) => item.tableId);
  const renderedIds = tables.map((table) => table.id);
  return {
    type: record.type, id: record.id, uri: record.uri,
    raw: record.shortcodes,
    rendered: tables,
    sameTableOrder: JSON.stringify(rawIds) === JSON.stringify(renderedIds),
  };
});

console.log(JSON.stringify({
  rawAudit: audit.capturedAt,
  snapshot: snapshot.generatedAt,
  records: rows.length,
  rawPlacements: rows.reduce((sum, row) => sum + row.raw.length, 0),
  renderedTables: rows.reduce((sum, row) => sum + row.rendered.length, 0),
  matchingOrder: rows.filter((row) => row.sameTableOrder).length,
  mismatches: rows.filter((row) => !row.sameTableOrder),
  posts: rows.filter((row) => row.type === 'posts'),
}, null, 2));
if (!rows.length || rows.some((row) => !row.sameTableOrder)) process.exitCode = 1;
