// Local-only verification after an opt-in staging WPGraphQL build.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const pages = [
  ['best-paypal-betting-sites.html', 'This is a fresh read of a private staging draft'],
  ['low-or-no-minimum-deposit-betting-sites.html', 'fresh WPGraphQL read'],
  ['online-bookmakers-that-accept-neteller.html', 'fresh WPGraphQL read'],
  ['online-bookmakers-that-accept-skrill.html', 'fresh WPGraphQL read'],
  ['best-betting-sites-for-basketball.html', 'fresh WPGraphQL read'],
  ['epl-game-week-5-2026-27-season-premier-league-tips-john-newsome.html', 'Fresh staging WPGraphQL read'],
];
for (const [path, marker] of pages) {
  const html = await readFile(resolve('dist', path), 'utf8');
  if (!html.includes(marker)) throw new Error(`${path}: fresh staging source marker missing`);
  if (!/<meta\s+name="robots"\s+content="noindex,\s*nofollow"/i.test(html)) throw new Error(`${path}: noindex missing`);
  if (/href=['"](?:https?:\/\/www\.everytip\.co\.uk)?\/go\//i.test(html)) throw new Error(`${path}: active offer link`);
  console.log(`${path}: fresh staging source, noindex, no /go/ link`);
}
