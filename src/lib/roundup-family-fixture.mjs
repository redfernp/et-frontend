import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const expected = {
  neteller: { postId: 90882, offers: [90846, 90851], marker: 'History of Neteller' },
  skrill: { postId: 90883, offers: [90846, 90851], marker: 'What is Skrill and How Does it Work' },
  basketball: { postId: 90884, offers: [90850], marker: 'How We Evaluate Sites' },
};

export async function stagingRoundupFamilyFixture(key) {
  const spec = expected[key];
  if (!spec) throw new Error(`Unknown roundup fixture: ${key}`);
  try {
    const fixture = JSON.parse(await readFile(resolve(process.cwd(), `data/raw/staging-${key}-roundup-gutenberg.json`), 'utf8'));
    if (fixture.postId !== spec.postId || fixture.status !== 'draft' ||
        !fixture.content?.includes(spec.marker) ||
        fixture.rankedEntries?.length !== spec.offers.length ||
        !spec.offers.every((id, index) => fixture.rankedEntries[index].offer?.nodes?.[0]?.databaseId === id)) {
      throw new Error(`Invalid staging ${key} roundup fixture`);
    }
    return fixture;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
