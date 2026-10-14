import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function stagingOfferSlotFixture() {
  try {
    const fixture = JSON.parse(await readFile(resolve(process.cwd(), 'data/raw/staging-offer-slot-roundtrip.json'), 'utf8'));
    if (fixture.status !== 'draft' || !fixture.content?.includes(`data-everytip-offer-slot="${fixture.offerId}"`)) {
      throw new Error('Invalid unpublished staging offer-slot fixture');
    }
    return fixture;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
