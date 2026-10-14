import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extractFeaturedPayPalCards } from '../src/lib/paypal-featured-cards.mjs';

test('featured PayPal sections become three structured, non-promotional cards', async () => {
  const fixture = JSON.parse(await readFile(new URL('../data/raw/staging-paypal-roundup-gutenberg.json', import.meta.url), 'utf8'));
  const pieces = extractFeaturedPayPalCards(fixture.content);
  const cards = pieces.filter((piece) => piece.type === 'featured-card');
  assert.deepEqual(cards.map((card) => card.name), ['Bet365', 'Betfred', '10Bet']);
  assert.ok(cards.every((card) => card.facts.length === 4 && card.logo.includes('<img')));
  assert.ok(cards.every((card) => card.editorial.every((paragraph) => !/Sign Up|#Ad|welcome bonus|free bets/i.test(paragraph))));
  assert.ok(pieces[0].html.includes('data-everytip-offer-slot'));
  assert.ok(pieces.at(-1).html.includes('Rest of UK and Irish PayPal'));
});
