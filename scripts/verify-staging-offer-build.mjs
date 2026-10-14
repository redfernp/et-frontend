// Confirm a local opt-in offer build used fresh staging ACF data in shared placements.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

for (const path of ['index.html', 'bookie-free-bets-bonus-offers/index.html', 'value-bet-tips-dark-horses.html']) {
  const html = await readFile(resolve('dist', path), 'utf8');
  if (!html.includes('ACF draft copy read from staging WPGraphQL')) throw new Error(`${path}: fresh offer source marker missing`);
  if (!/<meta\s+name="robots"\s+content="noindex,\s*nofollow"/i.test(html)) throw new Error(`${path}: noindex missing`);
  if (/href=['"](?:https?:\/\/www\.everytip\.co\.uk)?\/go\//i.test(html)) throw new Error(`${path}: active offer destination`);
  console.log(`${path}: fresh ACF draft display, noindex, inert CTA`);
}
