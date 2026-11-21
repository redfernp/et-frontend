// Shared by partner-preview.mjs and partner-live.mjs: the private partner file, the preview banner
// and the review pack page partners are sent (/partner-preview on their preview site).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
export const partnersDir = process.env.EVERYTIP_PARTNERS_DIR || resolve(root, '..', 'partners');
export const partnerFile = slug => resolve(partnersDir, `${slug}.json`);
export function readPartner(slug) {
  try { return JSON.parse(readFileSync(partnerFile(slug), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') throw new Error(`No partner file ${partnerFile(slug)}; copy _template.json`); throw error; }
}

const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const money = (amount, currency) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'GBP', maximumFractionDigits: 0 }).format(amount);

export function bannerHtml(partner) {
  return `<div style="background:#102a40;color:#fff;font:600 14px/1.4 system-ui,-apple-system,'Segoe UI',Arial,sans-serif;padding:10px 16px;text-align:center;position:relative;z-index:9999">`
    + `Partner preview for ${esc(partner.bookmaker)} &middot; not live yet &middot; `
    + `<a href="/partner-preview" style="color:#ffd200;text-decoration:underline">View your review pack</a></div>`;
}

function offerCard(offer) {
  return `<div class="offer"><div class="offer-logo" style="background:${esc(offer.brandColor)}"><img src="${esc(offer.logo)}" alt="${esc(offer.bookmaker)}"></div>`
    + `<div class="offer-copy"><p class="offer-name">${esc(offer.bookmaker)}</p><h3>${esc(offer.headline)}</h3><p class="offer-terms">${esc(offer.terms)}</p></div>`
    + `<a class="offer-cta" href="${esc(offer.link)}" rel="nofollow">${esc(offer.buttonText)}</a></div>`;
}

export function renderPack(partner, offers) {
  const d = partner.deal ?? {};
  const name = esc(partner.bookmaker);
  const placements = (partner.placements ?? []).map(p => `<li><div><strong>${esc(p.label)}</strong><span>${esc(p.note)}</span></div><a href="${esc(p.path)}">Open</a></li>`).join('');
  const drafts = (partner.drafts ?? []).map(p => `<li><div><strong>${esc(p.label ?? 'Article')}</strong><span>Draft, publishes when you go live</span></div><a href="${esc(p.path)}">Open</a></li>`).join('');
  const later = (partner.comingAfterPayment ?? []).map(item => `<li>${esc(item)}</li>`).join('');
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${name} on EveryTip</title><link rel="icon" href="/favicon.ico">
<style>
:root{--navy:#183f60;--deep:#102a40;--blue:#1c598f;--line:#dce6ed;--soft:#f3f7fa;--ink:#1d2b38;--muted:#5a6b7a;--gold:#ffd200}
*{box-sizing:border-box}body{margin:0;background:var(--soft);color:var(--ink);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Arial,sans-serif}
a{color:var(--blue)}header{background:var(--deep);color:#fff;padding:28px 16px 64px}
.wrap{max-width:860px;margin:0 auto}.brand{display:flex;align-items:center;gap:12px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#b9cddd}
.brand img{height:34px;width:auto}h1{font-size:clamp(28px,5vw,40px);line-height:1.15;margin:22px 0 10px}header p{color:#d5e2ec;max-width:620px;margin:0}
main{margin-top:-40px;padding:0 16px 48px}section{background:#fff;border:1px solid var(--line);border-radius:12px;padding:24px;margin-bottom:18px}
h2{font-size:20px;margin:0 0 14px;color:var(--navy)}.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:0;padding:0;list-style:none;counter-reset:s}
.steps li{background:var(--soft);border-radius:10px;padding:14px;counter-increment:s}.steps li:before{content:counter(s);display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--navy);color:#fff;font-weight:700;margin-bottom:8px}
.steps strong{display:block}.steps span{color:var(--muted);font-size:14px}
.offer{display:grid;grid-template-columns:150px 1fr auto;gap:16px;align-items:center;border:1px solid var(--line);border-radius:10px;overflow:hidden;padding-right:16px}
.offer-logo{align-self:stretch;display:grid;place-items:center;padding:14px}.offer-logo img{max-width:120px;max-height:44px}
.offer-name{margin:12px 0 0;font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}.offer h3{margin:2px 0 4px;font-size:19px}.offer-terms{margin:0 0 12px;font-size:12px;color:var(--muted)}
.offer-cta{background:#1a8f4c;color:#fff;font-weight:700;text-decoration:none;padding:11px 18px;border-radius:8px;white-space:nowrap}
.list{list-style:none;margin:0;padding:0}.list li{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:12px 0;border-top:1px solid var(--line)}.list li:first-child{border-top:0}
.list span{display:block;color:var(--muted);font-size:14px}.list a{font-weight:700;white-space:nowrap}
.ticks{margin:0;padding-left:20px}.ticks li{margin:4px 0}
.terms{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.terms div{background:var(--soft);border-radius:10px;padding:14px}.terms dt{font-size:13px;color:var(--muted)}.terms dd{margin:2px 0 0;font-weight:700}
.pay{border:2px solid var(--navy)}.pay .amount{font-size:32px;font-weight:800;color:var(--navy);margin:0}.pay p{margin:6px 0}
footer{text-align:center;color:var(--muted);font-size:14px;padding:8px 16px 32px}
@media (max-width:640px){.steps,.terms{grid-template-columns:1fr}.offer{grid-template-columns:1fr;padding:0 0 16px}.offer-copy,.offer-cta{margin:0 16px}.offer-cta{text-align:center}}
</style></head><body>
<header><div class="wrap"><div class="brand"><img src="/everytip-logo.png" alt="EveryTip">Partner preview</div>
<h1>${name} on EveryTip</h1><p>This is a private preview of exactly how ${name} will appear across EveryTip. Click any placement to see it on the full site. Nothing here is public yet.</p></div></header>
<main class="wrap">
<section><h2>How it works</h2><ol class="steps">
<li><strong>Review this preview</strong><span>Check the offer, terms and placements. Tell us if anything needs changing.</span></li>
<li><strong>Payment</strong><span>${esc(money(d.fee, d.currency))} by bank transfer, reference ${esc(partner.paymentReference)}.</span></li>
<li><strong>Live on both sites</strong><span>EveryTip and OddsTips within 5 working days of payment.</span></li></ol></section>
<section><h2>Your offer</h2>${offers.map(offerCard).join('')}</section>
<section><h2>See it in place</h2><ul class="list">${placements}${drafts}</ul></section>
${later ? `<section><h2>Added once you're live</h2><ul class="ticks">${later}</ul></section>` : ''}
<section><h2>The deal</h2><dl class="terms">
<div><dt>Entry fee</dt><dd>${esc(money(d.fee, d.currency))}${d.feeLabel ? ` <span style="font-weight:400;color:var(--muted)">(${esc(d.feeLabel)})</span>` : ''}</dd></div>
<div><dt>Credited back</dt><dd>${d.creditedAgainstCommission ? `In full against your first ${esc(money(d.fee, d.currency))} of commission` : 'No'}</dd></div>
<div><dt>Commission</dt><dd>${esc(d.revenueShare || 'Revenue share')}</dd></div>
<div><dt>Monthly fees and minimum term</dt><dd>None</dd></div></dl></section>
<section class="pay"><h2>Payment</h2><p class="amount">${esc(money(d.fee, d.currency))}</p>
<p>Reference: <strong>${esc(partner.paymentReference)}</strong></p>
<p>Bank details are in the payment request JP emailed you. Once you've paid, reply with the transfer confirmation and we'll switch ${name} on. We'll send the invoice as soon as the payment arrives.</p></section>
</main>
<footer>JP, Chief Editor, EveryTip.co.uk &middot; <a href="mailto:info@everytip.co.uk">info@everytip.co.uk</a><br>18+ &middot; Please gamble responsibly &middot; BeGambleAware.org</footer>
</body></html>`;
}

// WordPress REST credentials for draft posts: ~/.everytip/.wp-articles.env, then ../.wp-articles.env.
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
export function wordpressCredentials() {
  const file = [resolve(homedir(), '.everytip', '.wp-articles.env'), resolve(root, '..', '.wp-articles.env')].find(existsSync);
  if (!file) throw new Error('Draft posts need .wp-articles.env (WP_BASE_URL, WP_USERNAME, WP_APP_PASSWORD)');
  const vars = Object.fromEntries(readFileSync(file, 'utf8').split(/\r?\n/).filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
  return { base: vars.WP_BASE_URL.replace(/\/$/, ''), username: vars.WP_USERNAME, password: vars.WP_APP_PASSWORD };
}

// Cloudflare API token for partner preview workers (custom domains need zone access, which the
// local wrangler OAuth login lacks): ../.cloudflare.env with CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.
export function cloudflareAuth() {
  const file = resolve(root, '..', '.cloudflare.env');
  if (!existsSync(file)) throw new Error(`Partner previews need ${file} (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID)`);
  const vars = Object.fromEntries(readFileSync(file, 'utf8').split(/\r?\n/).filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
  return { CLOUDFLARE_API_TOKEN: vars.CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID: vars.CLOUDFLARE_ACCOUNT_ID };
}
