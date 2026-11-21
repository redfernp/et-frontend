import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { rankOffers } from '../scripts/rerank-offers.mjs';
import { renderPack, bannerHtml } from '../scripts/partner-pack.mjs';

const lineup = env => JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e',
  "const m=await import('./src/lib/launch-offers.mjs');console.log(JSON.stringify(m.launchOfferLineup().map(o=>o.id)))"],
  { env: { ...process.env, PARTNER_PREVIEW: env ?? '' }, encoding: 'utf8' }));

test('normal builds leave preview offers out; the partner preview shows them', () => {
  const file = JSON.parse(execFileSync(process.execPath, ['-e', "process.stdout.write(require('fs').readFileSync('src/data/offers.json','utf8'))"], { encoding: 'utf8' }));
  const preview = file.offers.filter(o => o.preview && o.active !== false && o.lineup !== false);
  if (!preview.length) return;
  const normal = lineup('');
  for (const o of preview) assert.ok(!normal.includes(o.partner), `${o.partner} must not be in a normal build`);
  const shown = lineup(preview[0].preview);
  assert.ok(shown.includes(preview[0].partner));
});

test('the weekly re-rank never moves or lists a preview offer', () => {
  const offers = [
    { id: 1, partner: 'a', link: '/go/a', position: 1 },
    { id: 2, partner: 'b', link: '/go/b', position: 2 },
    { id: 3, partner: 'new', link: '/go/new', position: 3, preview: 'new' },
  ];
  const result = rankOffers(offers, { new: 999, b: 10 }, '2026-11-21');
  assert.equal(result.offers.find(o => o.id === 3).position, 3);
  assert.ok(!result.rows.some(r => r.slug === 'new'));
});

test('the review pack and banner escape partner text', () => {
  const partner = { bookmaker: 'Evil <b>', paymentReference: 'X-1', deal: { fee: 250, currency: 'GBP', revenueShare: '30%' }, placements: [] };
  const html = renderPack(partner, [{ bookmaker: 'Evil <b>', headline: 'h', terms: 't', link: '/go/x', logo: '/l.svg', brandColor: '#fff', buttonText: 'Go' }]);
  assert.ok(!html.includes('<b>') && html.includes('Evil &lt;b&gt;') && html.includes('£250'));
  assert.ok(!bannerHtml(partner).includes('<b>'));
});
