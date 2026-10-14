import { hasBuilderMarkup } from './builder-cleanup.mjs';

// Fixed section 0 scope. Tipster/service reviews are not bookmaker reviews.
const hubs = new Set(['/', '/free-betting-tips', '/bookie-free-bets-bonus-offers']);
const bookmakers = /(?:bet365|betfred|betfair|betway|netbet|quinnbet|spreadex|betwright|10bet|888sport|william-hill|paddy-power|star-sports|mansionbet|mr-play|unibet|coral|ladbrokes|sky-bet|boylesports|betvictor|betuk|betmgm|talksport-bet|virgin-bet|sporting-index)/i;
export function builderTier(record) {
  const path = record.uri;
  if (hubs.has(path)) return 'A';
  if (/sign-up-offer|signup-offer|welcome-offer|bonus-code/.test(path)) return 'A';
  if (/review/.test(path) && bookmakers.test(path)) return 'A';
  return hasBuilderMarkup(record.content) ? 'B' : null;
}
