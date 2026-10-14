// Read-only capture of one named live public REST article for a local noindex preview.
import { writeFile } from 'node:fs/promises';

const endpoint = 'https://www.everytip.co.uk/wp-json/wp/v2/posts/91110?context=view';
const response = await fetch(endpoint, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`Live public REST HTTP ${response.status}`);
const post = await response.json();
const expected = 'epl-game-week-7-2026-27-season-premier-league-tips-john-newsome';
if (post.id !== 91110 || post.slug !== expected || post.status !== 'publish' ||
    new URL(post.link).origin !== 'https://www.everytip.co.uk' ||
    new URL(post.link).pathname !== `/${expected}.html` ||
    !post.content?.rendered || !post.title?.rendered) throw new Error('Live John Week 7 identity changed; no snapshot saved');
const capture = {
  source: endpoint, capturedAt: new Date().toISOString(),
  post: { id: post.id, slug: post.slug, link: post.link, status: post.status,
    date: post.date, modified: post.modified, author: post.author,
    title: post.title.rendered, content: post.content.rendered,
    seo: post.yoast_head_json ? { title: post.yoast_head_json.title,
      description: post.yoast_head_json.description,
      robots: post.yoast_head_json.robots } : null },
};
const destination = new URL('../data/raw/live-john-week7-2026-10-13.json', import.meta.url);
await writeFile(destination, JSON.stringify(capture, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ source: 'live-public-rest-read-only', id: post.id, slug: post.slug,
  date: post.date, modified: post.modified, capturedAt: capture.capturedAt,
  contentCharacters: capture.post.content.length, localSnapshot: destination.pathname }));
