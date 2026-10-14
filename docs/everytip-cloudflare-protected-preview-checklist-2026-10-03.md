# EveryTip Cloudflare protected-preview gate — 3 October 2026

**Later decision, 15:40 Europe/Rome:** JP explicitly declined Cloudflare Access for the review preview. A public, noindex workers.dev preview was deployed on the confirmed `jpredfern1979@gmail.com` account, with disabled commercial CTAs, excluded local-only routes and no live DNS change. The Access requirement below is the earlier recommendation, not the state of the deployed preview. See `everytip-launch-progress-2026-10-03.md` for the actual smoke results. Public noindex is not a privacy control.

This checklist is for a **preview deployment only**. It does not authorize a production deployment, live-domain route, DNS change, offer activation or publication of the noindex migration previews.

## Current local routing contract

- `wrangler.jsonc` sets `assets.html_handling` to `none`. Exact `*.html` files are served as files; extensionless public pages are built as `*/index.html` and the Worker internally fetches that asset without redirecting the browser.
- The Worker returns 404 for a missing route, a wrong file-like route or a trailing-slash public variant, and 405 for methods other than GET/HEAD. `npm run test:routes` covers those cases.
- Cloudflare serves matching assets **before** the Worker by default. Its `html_handling: none` documentation explicitly shows `/folder/index.html` as a direct 200. The repo now sets targeted `assets.run_worker_first` patterns for `/index.html` and `/*/index.html`; those aliases reach the existing Worker file-like-path rejection and return 404. Normal assets remain asset-first. This is a local fix, not a production verification.
- Local Wrangler 4.146.0 smoke test on 3 October: `/` 200, `/index.html` 404, `/free-betting-tips` 200, `/free-betting-tips/` 404, `/free-betting-tips/index.html` 404, nested `/racecourses/kempton-racing-tips` HEAD 200 and its `/index.html` alias HEAD 404, `/best-paypal-betting-sites.html` 200. None redirected. Repeat on the protected remote preview before production.

## Before any remote preview command

1. Confirm the Cloudflare target account, Worker name, and that the operation is a **Preview** (`wrangler preview`), not `wrangler deploy`. Do not attach the live EveryTip domain. At 15:00 Europe/Rome on 3 October, local `wrangler whoami` showed only the **Ridestore SEO Account** login; do not upload EveryTip to it unless the owner confirms that this is also the intended EveryTip account. Pin the confirmed account ID in the preview configuration before upload.
2. Put Cloudflare Access in place **before the first preview is exposed**. Worker Previews are public by default; a `workers.dev` `X-Robots-Tag: noindex` is not authentication. An account-level policy protecting `all_preview_workers`, or a verified Worker-level preview policy, avoids a public gap for a newly created preview. Restrict to JP/Eric and test unauthenticated denial.
3. Confirm the preview uses no production D1/KV/R2 bindings or secrets. The current `wrangler.jsonc` has only the static `ASSETS` binding, but verify effective config and account-side settings before upload.
4. Freeze a local build and run `npm run test:routes`, `node scripts/audit-launch-readiness.mjs --preview-strict`, and the exact-URL coverage audit. Preview-safety passing means only that pages remain noindex/no-active-offer; it is **not** launch readiness.
5. Confirm the staging WordPress REST and WPGraphQL origins are responding before claiming a **CMS-connected** preview. An offline snapshot build may be shared for layout review, but it is not a fresh WordPress integration check; the staging `/wp-json/` health request timed out during the 3 October afternoon pass.

## Protected-preview HTTP smoke test

After Access is verified and the Preview URL is known, test in both an authenticated and an unauthenticated session. Record status, `Location`, `X-Robots-Tag`, HTML robots, canonical and effective URL for each case:

| Request | Expected during preview |
| --- | --- |
| `/best-paypal-betting-sites.html` | 200 at exactly that URL; no redirect to a slashless or `.html`-less variant |
| `/best-paypal-betting-sites` | 404 unless an individually approved redirect exists |
| `/free-betting-tips` | 200 at exactly that URL; no redirect |
| `/free-betting-tips/` | 404, not a duplicate 200 |
| `/free-betting-tips/index.html` and nested `/racecourses/kempton-racing-tips/index.html` | 404 under the targeted Worker-first alias rule; a 200 is a duplicate-URL regression |
| Unknown path and unknown `.html` path | 404, never a 200 SPA fallback |
| HEAD on existing/missing paths | Same status class as GET, no unexpected `Location` |
| Unauthenticated request to any preview path | Cloudflare Access blocks before serving HTML or static assets |

Finally crawl all expected preview paths, inspect the legal/footer pages and assets, verify no active affiliate destinations, and rerun the strict launch audit separately. The strict audit is expected to fail while preview banners/noindex remain; do not remove them merely to make it green.

The targeted Worker-first aliases invoke the billable Worker only on those matching requests; ordinary static assets stay asset-first. Cloudflare states that Worker-first patterns count toward Workers limits on the free plan, so do not expand this to `run_worker_first: true` without a traffic/cost review.

Cloudflare documentation: [static-asset routing and targeted Worker-first glob patterns](https://developers.cloudflare.com/workers/static-assets/binding/), [HTML handling including `none`](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/), [static-asset billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), [Worker Preview access and public-by-default behavior](https://developers.cloudflare.com/workers/previews/), [Access policy options for Workers](https://developers.cloudflare.com/workers/configuration/cloudflare-access/).
