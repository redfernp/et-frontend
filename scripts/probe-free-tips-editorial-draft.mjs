// Read-only, local diagnostic. Prints structural metadata, never draft body or credentials.
import { parseDocument, DomUtils } from 'htmlparser2';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { extractFreeTipsEditorial } from '../src/lib/free-tips-editorial.mjs';

const snapshot = await latestContentSnapshot();
const source = [...snapshot.posts, ...snapshot.pages].find((item) => item.uri === '/free-betting-tips');
const response = await fetch('https://wordpress-159231-2098144.cloudwaysapps.com/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json',
    Authorization: `Basic ${Buffer.from(`${process.env.EVERYTIP_WP_USERNAME}:${process.env.EVERYTIP_WP_APPLICATION_PASSWORD}`).toString('base64')}` },
  body: JSON.stringify({ query: '{page(id:"91010",idType:DATABASE_ID){databaseId slug status modified content}}' }),
});
if (!response.ok) throw new Error(`WPGraphQL HTTP ${response.status}`);
const payload = await response.json();
if (payload.errors?.length) throw new Error('WPGraphQL response error');
const page = payload.data?.page;
if (!page) throw new Error('Draft not returned');
const roots = (html) => parseDocument(html, { decodeEntities: true }).children.filter((node) => node.type === 'tag');
const sourceNodes = roots(extractFreeTipsEditorial(source).html);
const draftNodes = roots(page.content);
const tags = (node) => [node.name, ...(node.children ?? []).flatMap((child) => child.type === 'tag' ? tags(child) : [])];
const withAttributes = (node) => (Object.keys(node.attribs ?? {}).length ? 1 : 0) +
  (node.children ?? []).reduce((count, child) => count + (child.type === 'tag' ? withAttributes(child) : 0), 0);
console.log(JSON.stringify({ status: response.status, draftId: page.databaseId, draftStatus: page.status,
  sourceCount: sourceNodes.length, draftCount: draftNodes.length,
  sourceRootTags: sourceNodes.map((node) => node.name), draftRootTags: draftNodes.map((node) => node.name),
  nestedTags: [...new Set(draftNodes.flatMap(tags))], attributeNodes: draftNodes.reduce((count, node) => count + withAttributes(node), 0),
  attributeNames: [...new Set(draftNodes.flatMap((node) => Object.keys(node.attribs ?? {})))],
  headingClasses: [...new Set(draftNodes.filter((node) => node.name === 'h2' || node.name === 'h3').map((node) => node.attribs?.class ?? ''))],
  paragraphClasses: [...new Set(draftNodes.filter((node) => node.name === 'p').map((node) => node.attribs?.class ?? ''))],
  visibleLength: draftNodes.map((node) => DomUtils.textContent(node)).join(' ').length }, null, 2));
