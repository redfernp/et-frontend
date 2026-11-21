// Build and share a partner preview: the whole site with one unpaid partner switched on, a banner
// on every page, and a review pack at /partner-preview, deployed as
// its own small worker at <slug>-preview.everytip.co.uk (noindex, robots.txt blocks all crawling).
// Nothing here touches the live site.
//
//   npm run partner:preview <slug>               build, then deploy
//   npm run partner:preview <slug> -- --no-build  re-deploy the last build (e.g. after editing the pack)
//
// Reads the private partner file ../partners/<slug>.json (deal terms stay out of this public repo)
// and, only when the partner has draft posts, the WordPress application password (.wp-articles.env).
// Deploys with the Cloudflare API token in ../.cloudflare.env.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { partnerFile, readPartner, renderPack, bannerHtml, wordpressCredentials, cloudflareAuth } from './partner-pack.mjs';

const root = resolve(import.meta.dirname, '..');
const slug = (process.argv[2] ?? '').toLowerCase();
if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('Usage: npm run partner:preview <slug>');
const partner = readPartner(slug);
if (partner.status !== 'preview') throw new Error(`${slug} is ${partner.status}, not preview`);
const offers = JSON.parse(readFileSync(join(root, 'src/data/offers.json'), 'utf8')).offers.filter(o => o.preview === slug);
if (!offers.length) throw new Error(`No offer in src/data/offers.json has "preview": "${slug}"`);

const run = (command, args, env = {}) => {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, ...env } });
  if (result.status !== 0) throw new Error(`${command} ${args[0]} failed`);
};

if (!process.argv.includes('--no-build')) {
  const env = { PARTNER_PREVIEW: slug, WPGRAPHQL_ENDPOINT: 'https://www.everytip.co.uk/graphql' };
  if (partner.drafts?.length) {
    const wp = wordpressCredentials();
    Object.assign(env, { PARTNER_DRAFTS: JSON.stringify(partner.drafts), PARTNER_WP_BASE_URL: wp.base, PARTNER_WP_USERNAME: wp.username, PARTNER_WP_APP_PASSWORD: wp.password });
  }
  run('npm', ['run', 'build'], env);
}
run('node', ['scripts/prepare-cloudflare-preview.mjs']);

// Banner on every page, and the review pack.
const dist = join(root, 'preview-dist');
const banner = bannerHtml(partner);
let pages = 0;
const walk = dir => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name.endsWith('.html')) {
      const html = readFileSync(path, 'utf8');
      const out = html.replace(/<body([^>]*)>/i, match => `${match}${banner}`);
      if (out !== html) { writeFileSync(path, out); pages++; }
    }
  }
};
walk(dist);
mkdirSync(join(dist, 'partner-preview'), { recursive: true });
writeFileSync(join(dist, 'partner-preview', 'index.html'), renderPack(partner, offers));
console.log(`\nBanner added to ${pages} pages; review pack at /partner-preview`);

// Deploy as its own small worker on <slug>-preview.everytip.co.uk (a Workers custom domain: Cloudflare
// creates the DNS record and certificate). partner-live.mjs deletes the worker at go-live.
const host = `${slug}-preview.everytip.co.uk`;
const workerName = `everytip-partner-${slug}`;
const base = JSON.parse(readFileSync(join(root, 'wrangler.preview.jsonc'), 'utf8'));
mkdirSync(join(root, 'outputs'), { recursive: true });
const config = join(root, 'outputs', `wrangler.partner-${slug}.json`);
writeFileSync(config, JSON.stringify({ name: workerName, account_id: base.account_id, main: '../src/worker/index.mjs',
  compatibility_date: base.compatibility_date, workers_dev: false, preview_urls: false,
  routes: [{ pattern: host, custom_domain: true }],
  assets: { ...base.assets, directory: '../preview-dist' } }, null, 2));
run('npx', ['wrangler', 'deploy', '--config', `outputs/wrangler.partner-${slug}.json`], cloudflareAuth());
const url = `https://${host}`;
const today = new Date().toISOString().slice(0, 10);
// Re-read the partner file first: it may have been edited while the build ran.
const latest = readPartner(slug);
latest.previewUrl = url;
latest.packUrl = `${url}/partner-preview`;
latest.history = [...(latest.history ?? []), { date: today, event: 'Preview deployed' }];
writeFileSync(partnerFile(slug), JSON.stringify(latest, null, 2) + '\n');
console.log(`\nPreview: ${url}\nSend the partner: ${latest.packUrl}`);
