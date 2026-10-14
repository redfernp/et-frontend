// Read-only capture of one named live public REST article for a local noindex preview.
import { writeFile } from 'node:fs/promises';

const endpoint = 'https://www.everytip.co.uk/wp-json/wp/v2/posts/90999?context=view';
const expected = 'saturdays-horse-racing-preview-tips-10th-october-2026-seymour-biz';
const response = await fetch(endpoint, { method: 'GET', signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`Live public REST HTTP ${response.status}`);
const post = await response.json();
const link = new URL(post.link);
if (post.id !== 90999 || post.slug !== expected || post.status !== 'publish' ||
    link.origin !== 'https://www.everytip.co.uk' || link.pathname !== `/${expected}.html` ||
    post.author !== 7 || !/^2026-10-08T/.test(post.date ?? '') ||
    !post.content?.rendered || !post.title?.rendered) {
  throw new Error('Live Seymour 10 October identity changed; no snapshot saved');
}
const capture = {
  source: endpoint, capturedAt: new Date().toISOString(),
  post: { id: post.id, slug: post.slug, link: post.link, status: post.status,
    date: post.date, modified: post.modified, author: post.author,
    title: post.title.rendered, content: post.content.rendered,
    seo: post.yoast_head_json ? { title: post.yoast_head_json.title,
      description: post.yoast_head_json.description,
      robots: post.yoast_head_json.robots } : null },
};
const destination = new URL('../data/raw/live-seymour-oct10-2026-10-13.json', import.meta.url);
await writeFile(destination, JSON.stringify(capture, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ source: 'live-public-rest-read-only', id: post.id, slug: post.slug,
  date: post.date, modified: post.modified, capturedAt: capture.capturedAt,
  contentCharacters: capture.post.content.length, localSnapshot: destination.pathname }));
