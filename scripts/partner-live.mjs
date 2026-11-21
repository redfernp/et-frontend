// Switch a partner live once they have sent proof of payment.
//
//   npm run partner:live <slug> -- --paid YYYY-MM-DD           change the files and commit, no push
//   npm run partner:live <slug> -- --paid YYYY-MM-DD --push    ... and push to main, which deploys live
//
// - offers.json: removes "preview" from the partner's offers and holds them at #3 for a week (newUntil)
// - after the push: publishes the partner's WordPress drafts at their preview paths (the WordPress save
//   also triggers a rebuild)
// - the private partner file: status live, paid and live dates, history
// Then raise the invoice in Fatture in Cloud (the script prints the details).
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { partnerFile, readPartner, wordpressCredentials, cloudflareAuth } from './partner-pack.mjs';

const root = resolve(import.meta.dirname, '..');
const slug = (process.argv[2] ?? '').toLowerCase();
const paid = process.argv[process.argv.indexOf('--paid') + 1];
const push = process.argv.includes('--push');
if (!/^[a-z0-9-]+$/.test(slug) || !process.argv.includes('--paid') || !/^\d{4}-\d{2}-\d{2}$/.test(paid ?? '')) {
  throw new Error('Usage: npm run partner:live <slug> -- --paid YYYY-MM-DD [--push]');
}
const partner = readPartner(slug);
if (partner.status !== 'preview') throw new Error(`${slug} is already ${partner.status}`);
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
if (git('status', '--porcelain', 'src/data/offers.json')) throw new Error('src/data/offers.json has uncommitted changes; commit or discard them first');

const today = new Date().toISOString().slice(0, 10);
const week = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
const offersPath = join(root, 'src/data/offers.json');
const data = JSON.parse(readFileSync(offersPath, 'utf8'));
const mine = data.offers.filter(o => o.preview === slug);
if (!mine.length) throw new Error(`No offer has "preview": "${slug}"`);
data.offers = data.offers.map(o => {
  if (o.preview !== slug) return o;
  const { preview, ...live } = o;
  return { ...live, position: 3, newUntil: week };
});
writeFileSync(offersPath, JSON.stringify(data, null, 2) + '\n');
git('add', 'src/data/offers.json');
git('commit', '-m', `Partner live: ${partner.bookmaker} (paid ${paid}), held at #3 until ${week}`);
console.log(`Committed: ${mine.map(o => o.bookmaker + ' ' + o.headline).join(', ')} switched on, held at #3 until ${week}`);

if (push) {
  git('push', 'origin', 'HEAD:main');
  console.log('Pushed to main: the build and deploy starts now (about 2 to 3 minutes).');
  if (partner.drafts?.length) {
    const wp = wordpressCredentials();
    const auth = 'Basic ' + Buffer.from(`${wp.username}:${wp.password.replace(/\s/g, '')}`).toString('base64');
    for (const draft of partner.drafts) {
      const response = await fetch(`${wp.base}/wp-json/wp/v2/${draft.type ?? 'posts'}/${draft.id}`, {
        method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json', 'User-Agent': 'everytip-partner-live/1.0' },
        body: JSON.stringify({ status: 'publish', slug: draft.path.slice(1), date: new Date().toISOString().slice(0, 19) }),
      });
      if (!response.ok) throw new Error(`Publishing draft ${draft.id}: HTTP ${response.status} ${await response.text()}`);
      const post = await response.json();
      console.log(`Published ${draft.label ?? 'draft'} ${draft.id}: ${post.link}`);
    }
  }
  // The preview has done its job: remove its worker (and with it <slug>-preview.everytip.co.uk).
  const removed = spawnSync('npx', ['wrangler', 'delete', '--name', `everytip-partner-${slug}`, '--force'],
    { cwd: root, stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, ...cloudflareAuth() } });
  console.log(removed.status === 0 ? `Preview ${slug}-preview.everytip.co.uk removed.` : `Could not remove the preview worker everytip-partner-${slug}; delete it in Cloudflare.`);
} else {
  console.log('Not pushed. Run `git push` to deploy, then re-run with --push next time, or publish the drafts in WordPress by hand.');
}

partner.status = push ? 'live' : 'paid';
partner.paidOn = paid;
if (push) partner.liveOn = today;
partner.history = [...(partner.history ?? []), { date: paid, event: 'Payment received' }, ...(push ? [{ date: today, event: 'Live on EveryTip' }] : [])];
partner.invoiceRaised = false;
writeFileSync(partnerFile(slug), JSON.stringify(partner, null, 2) + '\n');

const d = partner.deal ?? {};
console.log(`\nNow raise the invoice in Fatture in Cloud:\n  ${partner.bookmaker}, ${d.feeLabel ?? 'partner package'}, ${d.currency ?? 'GBP'} ${d.fee}, paid ${paid}, reference ${partner.paymentReference}\n`
  + `Then set "invoiceRaised": true in ${partnerFile(slug)}.\nReminder: OddsTips placement and the newsletter are still manual steps.`);
