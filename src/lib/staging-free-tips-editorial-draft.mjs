// Opt-in, local-preview-only WPGraphQL bridge for the unpublished editorial draft.
// Never use this to switch the published WordPress page or activate offer slots.
import { parseDocument, DomUtils } from 'htmlparser2';
import sanitizeHtml from 'sanitize-html';
import { extractFreeTipsEditorial } from './free-tips-editorial.mjs';

const origin = 'https://wordpress-159231-2098144.cloudwaysapps.com';
const identity = Object.freeze({ id: 91010, slug: 'staging-free-tips-evergreen-gutenberg-2026-10-13' });
const query = `query EveryTipUnpublishedFreeTipsEditorial {
  page(id: "91010", idType: DATABASE_ID) {
    databaseId slug status content modified
  }
}`;
const roots = (html) => parseDocument(html ?? '', { decodeEntities: true }).children.filter((node) => node.type === 'tag');
const visible = (node) => DomUtils.textContent(node).replace(/\s+/g, ' ').trim();
const allowedTags = new Set(['p', 'h2', 'h3', 'h4', 'strong', 'em', 'b', 'i', 'br']);
export const freeTipsDraftReadEnabled = () => process.env.MIGRATION_STAGING_FREE_TIPS_DRAFT_READ === '1';
function onlyEditorialTags(nodes) {
  return nodes.every((node) => {
    if (node.type !== 'tag') return true;
    const attributes = node.attribs ?? {};
    const entries = Object.entries(attributes);
    const expectedClass = node.name === 'p' ? 'wp-block-paragraph' :
      /^h[234]$/.test(node.name) ? 'wp-block-heading' : null;
    return allowedTags.has(node.name) &&
      (entries.length === 0 || (entries.length === 1 && entries[0][0] === 'class' &&
        entries[0][1] === expectedClass)) && onlyEditorialTags(node.children ?? []);
  });
}

export function validateFreeTipsEditorialDraft(payload, snapshotRecord) {
  if (snapshotRecord?.databaseId !== 76939 || snapshotRecord.uri !== '/free-betting-tips') {
    throw new Error('Expected the exact published free-tips snapshot identity');
  }
  if (payload?.errors?.length) throw new Error('Unpublished free-tips WPGraphQL error');
  const page = payload?.data?.page;
  if (page?.databaseId !== identity.id || page.slug !== identity.slug ||
      page.status !== 'draft' || !page.modified || typeof page.content !== 'string') {
    throw new Error('Unpublished free-tips draft identity/status mismatch');
  }
  if (/<\s*(?:a|img|script|iframe|form|button|style)\b|\bhref\s*=|\/go\/|#ad|bet\s*£\s*\d|£\s*\d+\s*in\s*free\s*bets|\[(?:et_offer_news|fl_builder_insert_layout)\b/i.test(page.content)) {
    throw new Error('Unpublished free-tips draft contains links, embeds or commercial copy');
  }
  const source = extractFreeTipsEditorial(snapshotRecord);
  const expected = roots(source.html).map((node) => node.name);
  const topLevel = parseDocument(page.content, { decodeEntities: true }).children;
  if (topLevel.some((node) => node.type !== 'tag' && (node.type !== 'text' || visible(node)))) {
    throw new Error('Unpublished free-tips draft has unexpected top-level content');
  }
  const nodes = roots(page.content);
  const actual = nodes.map((node) => node.name);
  if (expected.length !== 34 || JSON.stringify(actual) !== JSON.stringify(expected) ||
      !onlyEditorialTags(nodes) || nodes.some((node) => !visible(node)) ||
      nodes.map(visible).join(' ').length < 2500) {
    throw new Error('Unpublished free-tips draft block structure changed');
  }
  const html = sanitizeHtml(page.content, { allowedTags: ['p', 'h2', 'h3', 'h4', 'strong', 'em', 'b', 'i', 'br'],
    allowedAttributes: {} }).trim();
  if (roots(html).length !== expected.length) throw new Error('Unpublished free-tips draft sanitization changed sections');
  return { html, headingCount: nodes.filter((node) => /^h[234]$/.test(node.name)).length,
    sourceNodeCount: nodes.length, sourceMode: 'unpublished-staging-gutenberg-draft-preview',
    draftId: identity.id, modified: page.modified };
}

export async function readStagingFreeTipsEditorialDraft(snapshotRecord, { fetchImpl = fetch } = {}) {
  if (process.env.MIGRATION_EXACT_PREVIEW !== '1' || !freeTipsDraftReadEnabled()) {
    throw new Error('Unpublished free-tips draft bridge requires both explicit local preview flags');
  }
  const base = new URL(process.env.EVERYTIP_WP_BASE_URL ?? '');
  if (base.origin !== origin) throw new Error('Unpublished free-tips draft bridge is staging-only');
  const username = process.env.EVERYTIP_WP_USERNAME;
  const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
  if (!username || !password) throw new Error('Missing staging read credentials');
  const response = await fetchImpl(`${origin}/graphql`, { method: 'POST',
    headers: { 'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` },
    body: JSON.stringify({ query }), signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Unpublished free-tips WPGraphQL HTTP ${response.status}`);
  return validateFreeTipsEditorialDraft(await response.json(), snapshotRecord);
}
