// Read-only live source lock for the curated 11 October noindex preview.
import { verifyOct11ExtraPlaceSource, oct11ExtraPlaceSource } from '../src/lib/oct11-extra-place-preview.mjs';

const response = await fetch(`https://www.everytip.co.uk/wp-json/wp/v2/posts/${oct11ExtraPlaceSource.id}?context=view`, {
  signal: AbortSignal.timeout(30000),
});
if (!response.ok) throw new Error(`Live article fetch failed: HTTP ${response.status}`);
console.log(JSON.stringify(verifyOct11ExtraPlaceSource(await response.json()), null, 2));
