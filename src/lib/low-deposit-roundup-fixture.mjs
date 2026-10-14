import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function stagingLowDepositRoundupFixture() {
  try {
    const fixture = JSON.parse(await readFile(resolve(process.cwd(), 'data/raw/staging-low-deposit-roundup-gutenberg.json'), 'utf8'));
    if (fixture.postId !== 90880 || fixture.status !== 'draft' ||
        !fixture.content?.includes('Betting Bonuses') ||
        fixture.rankedEntries?.length !== 1 ||
        fixture.rankedEntries[0].offer?.nodes?.[0]?.databaseId !== 90846) {
      throw new Error('Invalid staging low-deposit roundup fixture');
    }
    return fixture;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
