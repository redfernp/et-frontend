# Priority exact-route SEO parity — 13 October 2026

Read-only audit at 23:17–23:18 Europe/Rome, after the normalized 1,260-page local build. `node scripts/audit-priority-seo-parity.mjs --summary` compared 15 named launch-slice exact assets in `dist/` with **current live public WordPress REST Yoast SEO** for the matching IDs. It made no WordPress write or deployment. This does not replace a rendered production crawl or a fresh cutover audit.

## Result

- All **15/15** named live WordPress records were readable and published; their live permalink paths matched the specified exact routes. All **15/15** local assets exist at those paths. None contains the staging WordPress hostname.
- All **15/15** built assets carry the preview marker and `noindex`; **0** preview assets accidentally indexable. This is safe for local review, **not** a launch pass.
- **11/15** preserve the live Yoast title and description byte-for-byte. The four differing routes are below. None should be blindly overwritten with live metadata just to make a parity counter pass.
- **13/15** have deliberate canonical/robots differences because the preview emits `noindex,nofollow` with no canonical while live uses `index,follow` and an exact self-canonical. The two exceptions, `/terms-conditions` and `/privacy-policy`, are already **live `noindex,nofollow` with no canonical** and the local preview matches that SEO intent. Do not force these legal routes indexable at cutover.

| Differing route | Live Yoast intent | Why the preview differs / release decision |
| --- | --- | --- |
| `/bet365-review` | Title promotes “Up to £30 in Free Bets”; description says Seymour was given £30. | The preview omits the offer amount pending central ACF offer approval. The article-body review notes a conflicting £20 vs £30 bankroll claim. Resolve the factual discrepancy and offer terms before using the live title/description or enabling a commercial CTA. |
| `/free-horse-racing-tips` | Title says “Updated Today”; description calls the tips daily. | No trusted dated racing upload is attached to the local exact page. Its title/description intentionally avoid a false freshness claim. Restore live-like freshness wording only once the dated source actually updates and fails closed on stale/missing input. |
| `/saturday-horse-racing-tips` | Source copy promotes Seymour’s current Saturday tips. | Local route is a dated archive preview that warns past selections are not current. Verify the current weekly feed and intended archive SEO; exact title punctuation also differs. |
| `/english-premier-league-predictions-for-saturday` | Source copy promotes current John predictions. | Local route is a dated archive preview. Verify the current weekly feed and intended archive SEO before reconciling title/description. |

The other 11 priority routes have no title/description migration regression by this check, including home, free tips, free bets, both roundups, Dark Horse, Kempton, safer gambling, terms, privacy and the tipster comparison. That is **metadata only**: stale editorial content, unverified offers, missing current tip feeds, noindex previews and the separate missing-route backlog still block public launch. A final release build must explicitly preserve live canonical/robots intent per exact path, not globally strip noindex, and must recheck current live Yoast fields immediately before cutover.
