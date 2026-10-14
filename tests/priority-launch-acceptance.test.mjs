import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePriorityLaunchAcceptance } from '../src/lib/priority-launch-acceptance.mjs';
import { readFile } from 'node:fs/promises';
import { parseDatedLiveOnlyInventory } from '../src/lib/dated-priority-acceptance-inputs.mjs';

const routeIds = [
  ['/', 16], ['/free-betting-tips', 76939], ['/bookie-free-bets-bonus-offers', 56315],
  ['/bet365-review', 87553], ['/best-paypal-betting-sites.html', 58743],
  ['/low-or-no-minimum-deposit-betting-sites.html', 33470],
  ['/value-bet-tips-dark-horses.html', 72421], ['/racecourses/kempton-racing-tips', 45270],
  ['/free-horse-racing-tips', 41881], ['/safer-gambling', 70281],
  ['/terms-conditions', 61], ['/privacy-policy', 6376], ['/saturday-horse-racing-tips', 23888],
  ['/english-premier-league-predictions-for-saturday', 24016],
  ['/professional-winning-tipsters-comparison-table', 12835],
];
const fixture = () => {
  const seo = { records: routeIds.map(([path, id]) => {
    const legal = ['/terms-conditions', '/privacy-policy'].includes(path);
    const live = { robots: legal ? 'noindex,nofollow' : 'index,follow',
      canonical: legal ? '' : `https://www.everytip.co.uk${path}` };
    const built = { previewMarker: true, robots: 'noindex,nofollow', canonical: '', stagingHostLeak: false };
    return { id, path, live, built, liveLinkPathMatches: true,
      parity: { title: true, description: true, robots: legal, canonical: legal } };
  }) };
  const records = Array.from({ length: 31 }, (_, index) => ({ id: 1000 + index,
    path: `/dated-post-${index}.html`, family: index < 13 ? 'ordinary-tip-hybrid' : 'offer-news' }));
  const newSinceCopy = records.map(({ id, path }) => ({ id, path, exactLocalAsset: false }));
  const delta = { posts: { absentFromStagingSnapshot: 31, newWithoutExactLocalAsset: 31, newSinceCopy },
    pages: { absentFromStagingSnapshot: 0, newWithoutExactLocalAsset: 0, newSinceCopy: [] } };
  const risk = { records, ordinary: { count: 13 }, offerNews: { count: 18 } };
  return { seo, delta, risk };
};

test('safe preview gate can pass while public launch remains held for noindex and 31 missing routes', () => {
  const result = evaluatePriorityLaunchAcceptance({ ...fixture(), mode: 'preview' });
  assert.equal(result.previewGatePass, true);
  assert.equal(result.priorityPublicGatePass, false);
  assert.equal(result.launchReady, false);
  assert.equal(result.liveOnlyMissingAssets, 31);
  assert.ok(result.publicBlockers.some((blocker) => /31 live-only/.test(blocker)));
  const spaced = fixture(); spaced.seo.records[0].built.robots = 'noindex, nofollow';
  assert.equal(evaluatePriorityLaunchAcceptance({ ...spaced, mode: 'preview' }).previewGatePass, true);
});

test('preview/public robots and canonical mismatches fail their respective mode', () => {
  const indexable = fixture();
  indexable.seo.records[0].built.robots = 'index,follow';
  assert.equal(evaluatePriorityLaunchAcceptance({ ...indexable, mode: 'preview' }).previewGatePass, false);
  const publicPreview = fixture();
  assert.equal(evaluatePriorityLaunchAcceptance({ ...publicPreview, mode: 'public' }).priorityPublicGatePass, false);
  const publicAssets = fixture();
  for (const row of publicAssets.seo.records) {
    row.built.previewMarker = false;
    row.built.robots = row.live.robots;
    row.built.canonical = row.live.canonical;
    row.parity.robots = true;
    row.parity.canonical = true;
  }
  for (const row of publicAssets.delta.posts.newSinceCopy) row.exactLocalAsset = true;
  publicAssets.delta.posts.newWithoutExactLocalAsset = 0;
  const result = evaluatePriorityLaunchAcceptance({ ...publicAssets, mode: 'public' });
  assert.equal(result.priorityPublicGatePass, true);
  assert.equal(result.launchReady, false); // Other release gates and owner approval remain.
});

test('unexpected SEO drift and malformed live-only route inventory fail closed', () => {
  const drift = fixture();
  drift.seo.records[1].parity.description = false;
  assert.equal(evaluatePriorityLaunchAcceptance({ ...drift, mode: 'preview' }).previewGatePass, false);
  const wrongPath = fixture();
  wrongPath.risk.records[0].path = '/changed.html';
  assert.equal(evaluatePriorityLaunchAcceptance({ ...wrongPath, mode: 'preview' }).previewGatePass, false);
  const incomplete = fixture(); incomplete.risk.records.pop();
  assert.throws(() => evaluatePriorityLaunchAcceptance({ ...incomplete, mode: 'preview' }), /Incomplete/);
});

test('preview gate fails if a missing exact route falls outside the dated source-risk inventory', () => {
  const changed = fixture();
  // A newly missing route must not be waved through just because another
  // previously missing, classified route now has an asset.
  changed.delta.posts.newSinceCopy[0].exactLocalAsset = true;
  changed.delta.posts.newSinceCopy.push({ id: 2031, path: '/new-unclassified.html', exactLocalAsset: false });
  changed.delta.posts.absentFromStagingSnapshot = 32;
  const result = evaluatePriorityLaunchAcceptance({ ...changed, mode: 'preview' });
  assert.equal(result.previewGatePass, false);
  assert.equal(result.knownRiskClassifiedMissing, 30);
  assert.ok(result.defects.some((defect) => /missing routes not in the 31-post risk inventory/.test(defect)));
});

test('preview gate checks risk record uniqueness and actual family totals', () => {
  const duplicatePath = fixture();
  duplicatePath.risk.records[1].path = duplicatePath.risk.records[0].path;
  assert.equal(evaluatePriorityLaunchAcceptance({ ...duplicatePath, mode: 'preview' }).previewGatePass, false);
  const wrongFamilyTotals = fixture();
  wrongFamilyTotals.risk.records[0].family = 'offer-news';
  assert.equal(evaluatePriorityLaunchAcceptance({ ...wrongFamilyTotals, mode: 'preview' }).previewGatePass, false);
});

test('dated live-only source inventory parses exactly 36 unique legacy .html routes', async () => {
  const markdown = await readFile(new URL('../docs/everytip-live-only-posts-audit-2026-10-13.md', import.meta.url), 'utf8');
  const result = parseDatedLiveOnlyInventory(markdown);
  assert.equal(result.all.length, 36);
  assert.equal(result.ordinary.length, 14);
  assert.equal(result.offerNews.length, 18);
  assert.throws(() => parseDatedLiveOnlyInventory(markdown.replace('/extra-place-races-today-tips-13-october.html', '/go/offer')), /36 unique exact/);
});
