// Read-only live source lock for the curated 12 October noindex preview.
import { verifyOct12ExtraPlaceSource, oct12ExtraPlaceSource } from '../src/lib/oct12-extra-place-preview.mjs';

const response = await fetch(`https://www.everytip.co.uk/wp-json/wp/v2/posts/${oct12ExtraPlaceSource.id}?context=view`, {
  signal: AbortSignal.timeout(30000),
});
if (!response.ok) throw new Error(`Live article fetch failed: HTTP ${response.status}`);
console.log(JSON.stringify(verifyOct12ExtraPlaceSource(await response.json()), null, 2));
