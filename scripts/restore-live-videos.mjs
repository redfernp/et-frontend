// Put YouTube videos that live pages show (from Thrive/Beaver) back into the staging page
// content, at the same place: after the paragraph or heading that precedes them on live.
// Usage: node --env-file=.env.local scripts/restore-live-videos.mjs [--apply] <id:kind:uri> ...
import { mkdir, writeFile } from 'node:fs/promises';
import { parseDocument, DomUtils } from 'htmlparser2';

const apply = process.argv.includes('--apply');
const targets = process.argv.slice(2).filter((arg) => !arg.startsWith('--')).map((arg) => { const [id, kind, uri] = arg.split(':'); return { id: Number(id), kind, uri }; });
const base = process.env.EVERYTIP_WP_BASE_URL;
if (!/cloudwaysapps\.com$/.test(new URL(base).hostname)) throw new Error('Refusing to write anywhere but staging');
const auth = `Basic ${Buffer.from(`${process.env.EVERYTIP_WP_USERNAME}:${process.env.EVERYTIP_WP_APPLICATION_PASSWORD}`).toString('base64')}`;
const idOf = (s = '') => (s.match(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([\w-]{11})/) ?? [])[1];
const clean = (value) => value.replace(/\s+/g, ' ').trim();
const embedBlock = (id) => `<!-- wp:embed {"url":"https://www.youtube.com/watch?v=${id}","type":"video","providerNameSlug":"youtube","responsive":true,"className":"wp-embed-aspect-16-9 wp-has-aspect-ratio"} -->
<figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper">
https://www.youtube.com/watch?v=${id}
</div></figure>
<!-- /wp:embed -->`;

// The nearest preceding paragraph/heading text before an element, in document order.
function precedingText(root, target) {
  const order = [];
  DomUtils.findAll((node) => /^(p|h[1-6]|li)$/.test(node.name) || node === target, [root]).forEach((node) => order.push(node));
  for (let index = order.indexOf(target) - 1; index >= 0; index--) {
    const value = clean(DomUtils.textContent(order[index]));
    if (value.split(' ').length >= 4) return value;
  }
  return null;
}

await mkdir('outputs/staging-writes/videos', { recursive: true });
for (const { id, kind, uri } of targets) {
  const html = await (await fetch(`https://www.everytip.co.uk${uri}`, { headers: { 'user-agent': 'Mozilla/5.0' } })).text();
  const doc = parseDocument(html, { decodeEntities: true });
  const main = DomUtils.findOne((n) => n.attribs && (n.attribs.id === 'tve_editor' || /\bentry-content\b/.test(n.attribs.class ?? '')), doc.children, true);
  const videos = DomUtils.findAll((n) => n.attribs && idOf(n.attribs.src || n.attribs['data-src'] || n.attribs['data-url']), [main]);
  const type = kind === 'posts' ? 'posts' : 'pages';
  const current = await (await fetch(`${base}/wp-json/wp/v2/${type}/${id}?context=edit&_fields=id,slug,content,modified`, { headers: { Authorization: auth } })).json();
  let raw = current.content.raw;
  const isBlocks = raw.includes('<!-- wp:');
  const done = new Set();
  const notes = [];
  for (const node of videos) {
    const video = idOf(node.attribs.src || node.attribs['data-src'] || node.attribs['data-url']);
    if (done.has(video) || raw.includes(video)) continue;
    done.add(video);
    const before = precedingText(main, node);
    // Try a few snippets of the preceding text, with curly and straight apostrophes and entity forms.
    const variants = (snippet) => [snippet, snippet.replace(/[’‘]/g, "'"), snippet.replace(/'/g, '’'), snippet.replace(/’/g, '&#8217;'), snippet.replace(/&/g, '&amp;')];
    const snippets = before ? [before.slice(0, 40), before.slice(0, 22), before.slice(-30), before.slice(-18)].flatMap(variants) : [];
    let anchor = -1;
    for (const snippet of snippets) { if (snippet.trim().length < 12) continue; anchor = raw.indexOf(snippet); if (anchor >= 0) break; }
    let at;
    if (anchor >= 0) {
      // After the whole top-level block (blocks are separated by a blank line), or after the
      // closing tag of the classic-editor element that holds the preceding text.
      if (isBlocks) { const next = raw.indexOf('\n\n<!-- wp:', anchor); at = next < 0 ? raw.length : next; }
      else { const tagEnd = /<\/(p|h[1-6]|ul|ol)>/g; tagEnd.lastIndex = anchor; const hit = tagEnd.exec(raw); at = hit ? hit.index + hit[0].length : raw.length; }
      notes.push(`${video} after "${before.slice(0, 50)}"`);
    } else { at = raw.length; notes.push(`${video} at end (preceding text not found)`); }
    const insert = isBlocks ? `\n\n${embedBlock(video)}\n\n` : `\n\nhttps://www.youtube.com/watch?v=${video}\n\n`;
    raw = raw.slice(0, at) + insert + raw.slice(at);
  }
  console.log(`${apply ? 'WRITE' : 'DRY  '} ${uri}: ${notes.join(' | ') || 'nothing to add'}`);
  if (!apply || !done.size) continue;
  await writeFile(`outputs/staging-writes/videos/${id}-before.json`, JSON.stringify(current));
  const response = await fetch(`${base}/wp-json/wp/v2/${type}/${id}`, { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ content: raw }) });
  const after = await (await fetch(`${base}/wp-json/wp/v2/${type}/${id}?context=edit&_fields=content`, { headers: { Authorization: auth } })).json();
  console.log(`      write ${response.status}, videos now in content: ${[...done].every((v) => after.content.raw.includes(v))}`);
}
