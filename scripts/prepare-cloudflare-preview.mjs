// Copy only public, inert noindex pages into a separate Cloudflare preview bundle.
// This does not publish anything or alter the Astro build in dist/.
import { cp, lstat, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'dist');
const target = resolve(root, 'preview-dist');
if (relative(root, target) !== 'preview-dist' || target === source) throw new Error('Unsafe preview target');
if (!(await lstat(source)).isDirectory()) throw new Error('Build dist/ before preparing a preview');

const omitted = new Set(['pilot', 'migration-preview']);
const excluded = (path) => {
  const part = relative(source, path).split(sep)[0];
  return omitted.has(part);
};
let htmlCount = 0;
let fileCount = 0;
async function inspect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (excluded(path)) continue;
    if (entry.isSymbolicLink()) throw new Error(`Symlink in build: ${relative(source, path)}`);
    if (entry.isDirectory()) { await inspect(path); continue; }
    if (!entry.isFile()) throw new Error(`Unsupported build entry: ${relative(source, path)}`);
    fileCount++;
    if (!path.endsWith('.html')) continue;
    htmlCount++;
    const html = await readFile(path, 'utf8');
    // Paginated historical archives intentionally use noindex,follow; both
    // follow and nofollow are safe for the public review hostname.
    if (!/<meta\s+name="robots"\s+content="noindex(?:,\s*(?:nofollow|follow))?"\s*\/?\s*>/i.test(html)) {
      throw new Error(`Public preview would expose an indexable page: ${relative(source, path)}`);
    }
    if (/wordpress-159231-2098144\.cloudwaysapps\.com|href=["'](?:https?:\/\/www\.everytip\.co\.uk)?\/go\//i.test(html)) {
      throw new Error(`Public preview contains a staging host or active /go/ link: ${relative(source, path)}`);
    }
  }
}
await inspect(source);
if (htmlCount < 1000) throw new Error(`Unexpectedly small preview: ${htmlCount} HTML pages`);
try {
  const existing = await lstat(target);
  if (!existing.isDirectory() || existing.isSymbolicLink()) throw new Error('preview-dist is not an ordinary directory');
  await rm(target, { recursive: true });
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await mkdir(target);
await cp(source, target, { recursive: true, filter: (path) => !excluded(path) });
const pilotLinks = new Map([
  ['/pilot/about-us/', '/about-us'],
  ['/pilot/best-paypal-betting-sites/', '/best-paypal-betting-sites.html'],
  ['/pilot/bet365-review/', '/bet365-review'],
  ['/pilot/english-premier-league-predictions-for-saturday/', '/english-premier-league-predictions-for-saturday'],
  ['/pilot/free-betting-tips/', '/free-betting-tips'],
  ['/pilot/home/', '/'],
  ['/pilot/html-sitemap/', '/html-sitemap'],
  ['/pilot/latest-betting-offers/', '/latest-betting-offers'],
  ['/pilot/privacy-policy/', '/privacy-policy'],
  ['/pilot/professional-winning-tipsters-comparison-table/', '/professional-winning-tipsters-comparison-table'],
  ['/pilot/racecourses/kempton-racing-tips/', '/racecourses/kempton-racing-tips'],
  ['/pilot/roundup/', '/best-paypal-betting-sites.html'],
  ['/pilot/safer-gambling/', '/safer-gambling'],
  ['/pilot/saturday-horse-racing-tips/', 'https://www.everytip.co.uk/saturday-horse-racing-tips'],
  ['/pilot/terms-conditions/', '/terms-conditions'],
  ['/pilot/value-bet-tips-dark-horses/', '/value-bet-tips-dark-horses.html'],
  ['/pilot/we-love-to-hear-from-you/', '/we-love-to-hear-from-you'],
]);
let rewrittenLinks = 0;
async function rewritePreviewLinks(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) { await rewritePreviewLinks(path); continue; }
    if (!path.endsWith('.html')) continue;
    const html = await readFile(path, 'utf8');
    const rewritten = html.replace(/href=(['"])(\/pilot\/[^'"#?]*\/?)(\1)/g, (_match, quote, pilotPath) => {
      const mapped = pilotLinks.get(pilotPath);
      if (!mapped) throw new Error(`Unmapped pilot link ${pilotPath} in ${relative(target, path)}`);
      rewrittenLinks++;
      return `href=${quote}${mapped}${quote}`;
    });
    if (/href=['"]\/pilot\//i.test(rewritten)) throw new Error(`Pilot link in ${relative(target, path)}`);
    if (rewritten !== html) await writeFile(path, rewritten);
  }
}
await rewritePreviewLinks(target);
console.log(JSON.stringify({ source: 'dist', target: 'preview-dist', omitted: [...omitted], htmlCount, fileCount,
  rewrittenLinks, purpose: 'public noindex preview; no upload performed' }));
