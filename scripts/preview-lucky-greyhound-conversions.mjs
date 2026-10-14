// Read-only Gutenberg conversion assessment for two exact-path roundup guides.
import { parseDocument } from 'htmlparser2';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { classicHtmlToBlocks } from '../src/lib/classic-to-gutenberg.mjs';
import { extractBuilderRoundup } from '../src/lib/builder-roundup-preview.mjs';

const targets = new Map([
  ['/best-bookie-for-lucky-15-bets-uk-ireland', 75678],
  ['/what-is-best-way-to-bet-on-greyhounds', 75043],
]);
const text = (html) => {
  const walk = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(walk).join('');
  const separated = html.replace(/<\/(?:p|h[2-4]|li|blockquote|ul|ol)>/gi, '$& ');
  return parseDocument(separated, { decodeEntities: true }).children.map(walk).join('').replace(/\s+/g, ' ').trim();
};
const snapshot = await latestContentSnapshot();
if (!snapshot) throw new Error('No local WordPress snapshot');
for (const [path, id] of targets) {
  const source = [...snapshot.posts, ...snapshot.pages].find((post) => post.uri === path && post.databaseId === id);
  if (!source) throw new Error(`Missing exact source ${path}`);
  // Builder content cannot be converted wholesale. Assess the deliberately
  // selected editorial extraction, leaving legacy rankings and offers behind.
  const editorial = extractBuilderRoundup(source);
  const selected = `${editorial.intro}\n${editorial.body}`;
  const converted = classicHtmlToBlocks(selected);
  const report = {
    path, id, modified: source.modified,
    blocks: (converted.match(/<!-- wp:/g) ?? []).length,
    images: (converted.match(/<!-- wp:image/g) ?? []).length,
    textParity: text(converted) === text(selected),
    withheldNodes: editorial.withheldNodes,
    activeMarkup: /<\s*(?:script|iframe|form)\b|\bfl-builder\b/i.test(converted),
    convertedLength: converted.length,
  };
  if (!report.textParity) {
    const before = text(selected);
    const after = text(converted);
    const at = [...before].findIndex((char, index) => char !== after[index]);
    report.textDiff = { beforeLength: before.length, afterLength: after.length, at,
      before: before.slice(Math.max(0, at - 45), at + 70),
      after: after.slice(Math.max(0, at - 45), at + 70) };
  }
  console.log(JSON.stringify(report));
  if (!report.textParity || report.activeMarkup || report.blocks < 10) process.exitCode = 1;
}
