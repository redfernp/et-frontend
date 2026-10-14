import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDocument } from 'htmlparser2';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { extractBuilderRoundup } from '../src/lib/builder-roundup-preview.mjs';
import { classicHtmlToBlocks } from '../src/lib/classic-to-gutenberg.mjs';

const paths = [
  ['/best-bookie-for-lucky-15-bets-uk-ireland', 75678, 58, 45],
  ['/what-is-best-way-to-bet-on-greyhounds', 75043, 80, 16],
  ['/high-stakes-betting-sites-for-high-rollers-vips', 75853, 70, 16],
];
const text = (html) => {
  const walk = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(walk).join('');
  return parseDocument(html.replace(/<\/(?:p|h[2-4]|li|blockquote|ul|ol)>/gi, '$& '), { decodeEntities: true })
    .children.map(walk).join('').replace(/\s+/g, ' ').trim();
};

test('three builder roundups convert selected editorial to safe core blocks with text parity', async () => {
  const snapshot = await latestContentSnapshot();
  assert.ok(snapshot);
  for (const [uri, id, blockCount, withheld] of paths) {
    const source = snapshot.pages.find((page) => page.uri === uri && page.databaseId === id);
    assert.ok(source, uri);
    const editorial = extractBuilderRoundup(source);
    const selected = `${editorial.intro}\n${editorial.body}`;
    const blocks = classicHtmlToBlocks(selected);
    assert.equal((blocks.match(/<!-- wp:/g) ?? []).length, blockCount, uri);
    assert.equal(editorial.withheldNodes, withheld, uri);
    assert.equal(text(blocks), text(selected), uri);
    assert.doesNotMatch(blocks, /<\s*(?:script|iframe|form)\b|\bfl-builder\b|\/go\/|sign-up-offer/i, uri);
  }
});
