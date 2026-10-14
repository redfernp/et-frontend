// Read-only audit of central draft copy. This route excludes affiliate URLs.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const base = process.env.EVERYTIP_WP_BASE_URL;
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!base || !username || !password) throw new Error('Missing staging REST credentials');
const site = new URL(base);
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Offer-copy audit is restricted to EveryTip staging');
}
const knownIds = [90846, 90848, 90849, 90850, 90851, 90852, 90889];
const requestedIds = process.argv.slice(2).filter((arg) => arg !== '--capture').map(Number);
if (requestedIds.some((id) => !knownIds.includes(id))) throw new Error('Unknown staging offer ID');
const ids = requestedIds.length ? requestedIds : knownIds;
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const offers = [];
for (const id of ids) {
  const response = await fetch(new URL(`/wp-json/everytip/v1/offer/${id}`, site), {
    headers: { Authorization: authorization }, signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Offer ${id} REST HTTP ${response.status}`);
  const offer = await response.json();
  if (offer.id !== id || offer.status !== 'draft') throw new Error(`Unexpected offer identity/status at ${id}`);
  offers.push({ id, title: offer.title, status: offer.status,
    headline: offer.fields?.public_headline || '',
    compactTerms: offer.fields?.compact_terms || '',
    fullTermsPresent: Boolean(offer.fields?.full_terms?.trim()),
    officialTermsUrlPresent: Boolean(offer.fields?.et_offer_full_terms_url?.trim()),
    editorialStatus: offer.fields?.et_offer_status || '',
    lastChecked: offer.fields?.et_offer_last_checked || '',
  });
}
console.log(JSON.stringify({ environment: 'staging', source: 'authenticated allowlisted REST', offers }, null, 2));
if (process.argv.includes('--capture')) {
  if (ids.length !== knownIds.length || offers.some((offer) => !offer.headline || !offer.compactTerms)) {
    throw new Error('A complete seven-offer copy set is required for a capture');
  }
  const directory = resolve(process.cwd(), 'data/raw');
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, 'staging-seven-offer-copy.json'), JSON.stringify({
    capturedAt: new Date().toISOString(), source: 'staging authenticated REST; display preview only', offers,
  }, null, 2));
  console.log('Captured seven draft headlines and approved short terms to ignored local data/raw fixture.');
}
