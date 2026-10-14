// Read-only legal-page conversion gate. No WordPress writes.
import { parseDocument, DomUtils } from 'htmlparser2';
import { classicHtmlToBlocks } from '../src/lib/classic-to-gutenberg.mjs';

const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? '');
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Named staging host only');
}
const user = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!user || !password) throw new Error('Missing staging REST credentials');
const auth = `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
const fetchJson = async (url, headers = {}) => {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
};
const text = (html) => DomUtils.textContent(parseDocument(html, { decodeEntities: true }))
  .replace(/\s+/g, ' ').trim();
const links = (html) => {
  const found = [];
  const visit = (node) => {
    if (node.name === 'a') found.push(node.attribs?.href ?? '');
    for (const child of node.children ?? []) visit(child);
  };
  visit(parseDocument(html));
  return found;
};

for (const id of [61, 6376]) {
  const [staging, live] = await Promise.all([
    fetchJson(new URL(`/wp-json/wp/v2/pages/${id}?context=edit`, site), { Authorization: auth }),
    fetchJson(`https://www.everytip.co.uk/wp-json/wp/v2/pages/${id}`),
  ]);
  let converter;
  try {
    const content = classicHtmlToBlocks(staging.content.raw, { imageMode: 'wordpress-upload' });
    converter = { safe: true, blockCount: (content.match(/<!-- wp:/g) ?? []).length,
      textPreserved: text(content) === text(staging.content.raw),
      linksPreserved: JSON.stringify(links(content)) === JSON.stringify(links(staging.content.raw)) };
  } catch (error) {
    converter = { safe: false, reason: error.message };
  }
  const stagingText = text(staging.content.rendered);
  const liveText = text(live.content.rendered);
  const firstTextDifference = [...stagingText].findIndex((character, index) => character !== liveText[index]);
  const stagingLinks = links(staging.content.rendered);
  const liveLinks = links(live.content.rendered);
  const firstLinkDifference = stagingLinks.findIndex((href, index) => href !== liveLinks[index]);
  console.log(JSON.stringify({ id, slug: staging.slug, status: staging.status,
    modified: staging.modified, liveModified: live.modified,
    rawChars: staging.content.raw.length,
    existingBlocks: (staging.content.raw.match(/<!-- wp:/g) ?? []).length,
    linkCount: links(staging.content.raw).length,
    imageCount: (staging.content.raw.match(/<img\b/gi) ?? []).length,
    stagingLiveRenderedTextEqual: stagingText === liveText,
    stagingLiveRenderedLinksEqual: JSON.stringify(stagingLinks) === JSON.stringify(liveLinks),
    textDiff: firstTextDifference < 0 ? null : {
      offset: firstTextDifference,
      stagingSnippet: stagingText.slice(Math.max(0, firstTextDifference - 45), firstTextDifference + 100),
      liveSnippet: liveText.slice(Math.max(0, firstTextDifference - 45), firstTextDifference + 100),
      stagingLength: stagingText.length, liveLength: liveText.length,
    },
    linksDiff: firstLinkDifference < 0 ? null : { index: firstLinkDifference,
      staging: stagingLinks[firstLinkDifference], live: liveLinks[firstLinkDifference] },
    topLevelTags: parseDocument(staging.content.raw).children.filter((node) => node.type === 'tag').slice(0, 10).map((node) => node.name),
    seo: { title: staging.yoast_head_json?.title, description: staging.yoast_head_json?.description,
      robots: staging.yoast_head_json?.robots }, converter }, null, 2));
}
