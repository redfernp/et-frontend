// Read-only presence/freshness inventory. Never emits offer copy or destinations.
import { auditSevenOffers } from '../src/lib/offer-field-audit.mjs';

const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? '');
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com' ||
    !username || !password) throw new Error('Read-only offer audit requires staging REST credentials');
const ids = [90846, 90848, 90849, 90850, 90851, 90852, 90889];
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const offers = [];
for (const id of ids) {
  const response = await fetch(new URL(`/wp-json/everytip/v1/offer/${id}`, site), {
    headers: { Authorization: authorization }, signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Offer ${id} REST HTTP ${response.status}`);
  const offer = await response.json();
  if (offer.id !== id) throw new Error(`Unexpected offer identity at ${id}`);
  offers.push(offer);
}
console.log(JSON.stringify(auditSevenOffers(offers), null, 2));
