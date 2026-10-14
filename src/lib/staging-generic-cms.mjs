import { assessContent } from './migration-preview.mjs';
import { comparePublishedInventory } from './published-content-drift.mjs';
import { discoverPublishedContent } from './published-content-discovery.mjs';
import { readStagingArticle } from './staging-article-cms.mjs';

function verifyFreshIdentity(fresh, expected) {
  if (fresh?.databaseId !== expected.databaseId || fresh.uri !== expected.uri ||
      fresh.slug !== expected.slug || fresh.status !== 'publish') {
    throw new Error(`Fresh CMS article identity changed: ${expected.uri}`);
  }
}

/** Freshen changed generic article bodies only after a complete CMS inventory. */
export async function freshGenericRecordMap(snapshot, plan, {
  inventoryRead = discoverPublishedContent,
  articleRead = readStagingArticle,
  reservedNewEntries = new Map(),
} = {}) {
  if (process.env.MIGRATION_STAGING_GENERIC_READ !== '1') {
    return { records: new Map(), newEntries: [], modifiedCount: 0, sourceMode: 'dated-snapshot-preview' };
  }
  const inventory = await inventoryRead();
  const drift = comparePublishedInventory(snapshot, inventory);
  if (drift.missing.length || drift.changedPath.length) {
    throw new Error(`Generic CMS route registry changed: +${drift.added.length}, -${drift.missing.length}, moved ${drift.changedPath.length}`);
  }
  if (drift.modified.length + drift.added.length > 25) throw new Error(`Generic CMS refresh exceeds 25 changed/new records: ${drift.modified.length + drift.added.length}`);
  const included = new Map(plan.included.map(({ record, kind }) => [record.databaseId, { record, kind }]));
  const knownPaths = new Set([...plan.included.map(({ row, record }) => row?.path ?? record.uri), ...(plan.excluded ?? []).map(({ path }) => path)]);
  const records = new Map();
  for (const change of drift.modified) {
    const entry = included.get(change.id);
    if (!entry) continue; // A dedicated template owns this route.
    if (entry.kind !== 'post') throw new Error(`Fresh generic Page reader is not yet enabled: ${change.path}`);
    const expected = {
      databaseId: entry.record.databaseId, uri: entry.record.uri, slug: entry.record.slug,
    };
    const fresh = await articleRead(expected);
    verifyFreshIdentity(fresh, expected);
    if (fresh.modified !== change.modified) throw new Error(`CMS changed during generic refresh: ${change.path}`);
    const unsafe = assessContent(fresh);
    if (unsafe.length) throw new Error(`Fresh generic content requires editorial conversion at ${change.path}: ${unsafe.join(', ')}`);
    records.set(change.id, fresh);
  }
  const publishedPosts = new Map(inventory.posts.map((node) => [node.databaseId, node]));
  const newEntries = [];
  for (const addition of drift.added) {
    const node = publishedPosts.get(addition.id);
    if (!node) throw new Error(`New CMS Page needs a dedicated reader: ${addition.path}`);
    const reserved = reservedNewEntries.get(node.uri);
    if (reserved) {
      if (node.databaseId !== reserved.databaseId || node.slug !== reserved.slug) {
        throw new Error(`Reserved exact article identity changed: ${node.uri}`);
      }
      continue; // One dedicated exact route already owns this newly published article.
    }
    if (!node.uri.endsWith('.html') || node.uri.startsWith('/pilot/') || node.uri.startsWith('/migration-preview/') || knownPaths.has(node.uri)) {
      throw new Error(`New CMS article path is unsupported or conflicts with an existing route: ${node.uri}`);
    }
    const expected = { databaseId: node.databaseId, uri: node.uri, slug: node.slug };
    const fresh = await articleRead(expected);
    verifyFreshIdentity(fresh, expected);
    if (fresh.modified !== node.modified) throw new Error(`CMS changed during generic refresh: ${node.uri}`);
    const unsafe = assessContent(fresh);
    if (unsafe.length) throw new Error(`New CMS article requires editorial conversion at ${node.uri}: ${unsafe.join(', ')}`);
    records.set(node.databaseId, fresh);
    knownPaths.add(node.uri);
    newEntries.push({ record: fresh, kind: 'post', row: {
      path: node.uri, indexability: 'Non-Indexable', canonical: '',
      suggested_template: 'new-published-cms-preview', unverified_crawl_path: true,
    } });
  }
  return { records, newEntries, modifiedCount: drift.modified.length, sourceMode: 'fresh-staging-wpgraphql-preview' };
}
