// Read-only screening of the latest published staging snapshot for strict core-block conversion.
import { readdir, readFile } from 'node:fs/promises';
import { classicHtmlToBlocks } from '../src/lib/classic-to-gutenberg.mjs';
import { parseDocument } from 'htmlparser2';
const snapshots = (await readdir(new URL('../data/raw/', import.meta.url)))
  .filter((name) => /^staging-wordpress-public-.*\.json$/.test(name)).sort();
const latest = snapshots.at(-1);
if (!latest) throw new Error('No WordPress snapshot found');
const snapshot = JSON.parse(await readFile(new URL(`../data/raw/${latest}`, import.meta.url), 'utf8'));
const outcomes = new Map();
const convertible = [];
const imagePatterns = new Map();
const topLevelPatterns = new Map();
const imageFailureSamples = [];
for (const post of snapshot.posts) {
  try {
    const blocks = classicHtmlToBlocks(post.content, { imageMode: 'wordpress-upload' });
    convertible.push({ id: post.databaseId, uri: post.uri, date: post.date?.slice(0, 10),
      blocks: (blocks.match(/<!-- wp:/g) ?? []).length,
      images: (blocks.match(/<!-- wp:image/g) ?? []).length,
      links: (blocks.match(/<a\b[^>]*href=/g) ?? []).length });
  } catch (error) {
    const reason = String(error.message).replace(/: .*/, ': *');
    outcomes.set(reason, (outcomes.get(reason) ?? 0) + 1);
    if (reason === 'Image requires an editorial image-block decision') {
      if (imageFailureSamples.length < 6) {
        const index = post.content.indexOf('<img');
        const tree = parseDocument(post.content ?? '');
        const containing = tree.children.find((node) => node.type === 'tag' && node.children?.some((child) => child.name === 'img' || child.children?.some((grandchild) => grandchild.name === 'img')));
        imageFailureSamples.push({ uri: post.uri, snippet: post.content.slice(Math.max(0,index-80),index+210),
          parentTag: containing?.name, childKinds: containing?.children?.map((child) => child.name ?? child.type).slice(0, 12) });
      }
      const tree = parseDocument(post.content ?? '');
      for (const node of tree.children.filter((item) => item.type === 'tag')) {
        topLevelPatterns.set(node.name, (topLevelPatterns.get(node.name) ?? 0) + 1);
        const image = node.children?.find((child) => child.name === 'img');
        if (image) imagePatterns.set(`${node.name}>img`, (imagePatterns.get(`${node.name}>img`) ?? 0) + 1);
      }
    }
  }
}
console.log(JSON.stringify({ snapshot: latest, posts: snapshot.posts.length, convertible: convertible.length,
  examples: convertible.slice(0, 20), rejectedByReason: Object.fromEntries([...outcomes].sort((a,b) => b[1]-a[1])),
  recentCandidates: [...convertible].sort((a,b) => String(b.date).localeCompare(String(a.date))).slice(0, 12),
  topLevelTagsInImageFailures: Object.fromEntries([...topLevelPatterns].sort((a,b) => b[1]-a[1]).slice(0, 15)),
  directImagePatterns: Object.fromEntries(imagePatterns), imageFailureSamples }, null, 2));
