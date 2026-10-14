// Local-only conversion preview from the ignored staging WPGraphQL snapshot.
// Run with: node scripts/preview-classic-conversion.mjs 77061
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'htmlparser2';
import { classicHtmlToBlocks } from '../src/lib/classic-to-gutenberg.mjs';

const id = Number(process.argv[2]);
if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Provide a numeric WordPress post ID');
const directory = fileURLToPath(new URL('../data/raw/', import.meta.url));
const filename = (await readdir(directory)).filter((name) => /^staging-wordpress-public-.*\.json$/.test(name)).sort().at(-1);
if (!filename) throw new Error('No ignored WordPress snapshot; run npm run snapshot:wp');
const snapshot = JSON.parse(await readFile(new URL(`../data/raw/${filename}`, import.meta.url), 'utf8'));
const post = snapshot.posts.find((node) => node.databaseId === id);
if (!post) throw new Error('Post not found in snapshot');
const source = process.argv.includes('--raw')
  ? await readFile(new URL(`../data/raw/wp-rest-post-${id}.raw.html`, import.meta.url), 'utf8')
  : post.content;
const removeLegacyPortrait = /seymour-biz|john-newsome/i.test(post.uri ?? '');
const blocks = classicHtmlToBlocks(source, { removeLegacyPortrait, imageMode: 'wordpress-upload' });
const text = (html) => {
  const walk = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(walk).join('');
  return parseDocument(html).children.map(walk).join('').replace(/\s+/g, ' ').trim();
};
const sourceText = text(source);
const convertedText = text(blocks);
const report = {
  id,
  uri: post.uri,
  blocks: (blocks.match(/<!-- wp:/g) ?? []).length,
  sourceTextLength: sourceText.length,
  convertedTextLength: convertedText.length,
  textParity: sourceText === convertedText,
};
await writeFile(new URL(`../data/raw/wp-gutenberg-preview-${id}.html`, import.meta.url), blocks);
console.log(JSON.stringify(report, null, 2));
if (!report.textParity) process.exitCode = 1;
