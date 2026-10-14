import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function stagingPaypalRoundupFixture() {
  try {
    const fixture = JSON.parse(await readFile(resolve(process.cwd(), 'data/raw/staging-paypal-roundup-gutenberg.json'), 'utf8'));
    if (fixture.postId !== 90868 || fixture.status !== 'draft' ||
        (fixture.content.match(/data-everytip-offer-slot="\d+"/g) ?? []).length !== 4 ||
        !Array.isArray(fixture.rankedEntries)) {
      throw new Error('Invalid staging PayPal roundup fixture');
    }
    return fixture;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
