// Read-only public REST check for the three 13 October posts. No credentials,
// content copy, affiliate destination or image URL is printed.
import { createHash } from 'node:crypto';
import { parseDocument } from 'htmlparser2';

const ids = [91111, 91113, 91115];
const origin = 'https://www.everytip.co.uk';

function walk(node, visit) {
  visit(node);
  for (const child of node.children ?? []) walk(child, visit);
}
function textOf(node) {
  if (node.type === 'text') return node.data;
  return (node.children ?? []).map(textOf).join('');
}
function summarize(post) {
  const html = post.content?.rendered ?? '';
  const document = parseDocument(html, { decodeEntities: true });
  const counts = {};
  const headings = [];
  const linkHosts = {};
  const linkPaths = {};
  const linkRels = {};
  const imageHosts = {};
  const tables = [];
  const wrappers = new Set();
  walk(document, (node) => {
    if (node.type !== 'tag') return;
    counts[node.name] = (counts[node.name] ?? 0) + 1;
    if (/^h[1-4]$/.test(node.name)) headings.push({ level: node.name, text: textOf(node).replace(/\s+/g, ' ').trim().slice(0, 120) });
    if (node.name === 'a') {
      try {
        const target = new URL(node.attribs.href, origin);
        linkHosts[target.hostname] = (linkHosts[target.hostname] ?? 0) + 1;
        if (target.hostname === 'www.everytip.co.uk') linkPaths[target.pathname] = (linkPaths[target.pathname] ?? 0) + 1;
      } catch { linkHosts.invalid = (linkHosts.invalid ?? 0) + 1; }
      const rel = node.attribs.rel ?? '(none)'; linkRels[rel] = (linkRels[rel] ?? 0) + 1;
    }
    if (node.name === 'table') {
      const cells = [];
      walk(node, (child) => { if (child.name === 'th') cells.push(textOf(child).replace(/\s+/g, ' ').trim().slice(0, 70)); });
      let rows = 0;
      let bodyRows = 0;
      const bodyWidths = [];
      walk(node, (child) => {
        if (child.name !== 'tr') return;
        rows++;
        const width = (child.children ?? []).filter((cell) => cell.name === 'td').length;
        if (width) { bodyRows++; bodyWidths.push(width); }
      });
      tables.push({ rows, bodyRows, bodyWidths, headers: cells });
    }
    if (node.name === 'img') {
      try { const host = new URL(node.attribs.src, origin).hostname; imageHosts[host] = (imageHosts[host] ?? 0) + 1; } catch { imageHosts.invalid = (imageHosts.invalid ?? 0) + 1; }
    }
    const className = node.attribs.class ?? '';
    if (/fl-builder|fl-row|fl-col|thrv_|tve_|wp-block-|ninja_table/i.test(className)) {
      wrappers.add(className.split(/\s+/).filter((part) => /^(?:fl-|thrv_|tve_|wp-block-|ninja_)/i.test(part)).slice(0, 4).join(' '));
    }
  });
  const fullText = textOf(document).replace(/\s+/g, ' ').trim();
  return {
    id: post.id, slug: post.slug, path: new URL(post.link).pathname,
    title: post.title?.rendered, status: post.status, date: post.date, modified: post.modified,
    author: post.author, featuredMedia: post.featured_media,
    htmlLength: html.length, textLength: fullText.length,
    htmlSha256: createHash('sha256').update(html).digest('hex'),
    counts: Object.fromEntries(Object.entries(counts).filter(([tag]) => ['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'table', 'img', 'a', 'script', 'iframe', 'style'].includes(tag))),
    headings, linkHosts, linkPaths, linkRels, imageHosts, tables, wrapperSignals: [...wrappers],
    shortcodeSignals: [...new Set([...html.matchAll(/\[(ninja_tables?|adinserter|su_[^\s\]]+|et_[^\s\]]+)/gi)].map((match) => match[1].toLowerCase()))],
    yoast: { title: post.yoast_head_json?.title, descriptionLength: post.yoast_head_json?.description?.length ?? 0,
      socialImageCount: post.yoast_head_json?.og_image?.length ?? 0,
      robots: post.yoast_head_json?.robots, canonicalPath: post.yoast_head_json?.canonical ? new URL(post.yoast_head_json.canonical).pathname : null },
  };
}

const result = [];
for (const id of ids) {
  const url = `${origin}/wp-json/wp/v2/posts/${id}?_fields=id,slug,link,date,modified,status,title,content,featured_media,author,yoast_head_json`;
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Live public REST post ${id} returned ${response.status}`);
  result.push(summarize(await response.json()));
}
console.log(JSON.stringify({ capturedAt: new Date().toISOString(), source: 'live public REST, read-only', posts: result }, null, 2));
