# Priority launch-family audit — local only, 13 October 2026

Scope: exact homepage `/`, free tips `/free-betting-tips`, free bets `/bookie-free-bets-bonus-offers`, seven-offer ladder/sidebar, legal/footer, columnist archives and WordPress menu/data flow. This is a code-and-snapshot audit, **not a launch approval**. No WordPress, Cloudflare, DNS or commercial CTA state was changed.

## Already usable for preview

- Exact homepage, free-tips and free-bets routes exist and use the approved blue/orange designs. They wrap their respective `/pilot/` components with a dated WordPress snapshot record, and emit `noindex` preview metadata. Home/free-tips/free-bets editorial extractors withhold legacy commercial links and require expected content boundaries.
- The same seven branded visual cards are reused by the homepage ladder, free-bets ladder and offer sidebar. ACF draft headlines and compact terms can be read through staging WPGraphQL only with the explicit `MIGRATION_STAGING_OFFER_READ=1` flag; otherwise a dated local capture is used. All seven draft records are validated, and all commercial buttons are inert text in the current previews.
- Legal pages `/safer-gambling`, `/terms-conditions` and `/privacy-policy` read exact WordPress Page content through WPGraphQL (or the explicitly opted-in offline snapshot). The footer contains 18+, player-protection and advertising-disclosure copy and links to verified legal paths.
- The primary WordPress menu is queried and filtered against verified public paths on public-preview layouts. Author archive URL assets use a dated archive snapshot; the local pilot columnist archive design paginates example cards.

## Launch blockers in priority order

1. **Homepage and free-tips content feeds are fixtures.** The homepage's feature articles, bookmaker reviews, guides, latest tips and newsletter form placement are not live WPGraphQL/ConvertBox feeds. Free tips includes hard-coded directory and columnist `/pilot/` links, dated news examples, and a withheld daily selection/offer feed. The exact routes must not be marked public/indexable as-is.
2. **Free-bets cards are not approved live offers.** The shared ladder is keyed to seven local display fixtures, optionally overlaying ACF *draft* headline and compact terms. There is no production read of approved active offer status, eligibility/geo/date checks, official terms destination or affiliate CTA destination. Keep buttons disabled until a separate approved offer contract and review gate exists.
3. **Author/column archives are not yet the planned CMS feed.** The designed `ColumnArchive` pilot has a small hand-authored list and `/pilot/` pagination; exact author routes use a dated snapshot and deliberately disabled article links. The owner-requested noindex archive pagination, current published-post query and editable WordPress intro/bio still need an exact-path implementation and verification.
4. **Legal copy needs a current policy review.** The privacy preview itself flags older email/opt-in providers; check against actual SendFox, ConvertBox, Cloudflare and tracking implementation before launch. Safer gambling and terms pages retain WordPress wording but support links, dates and implications should be confirmed. Current exact pages deliberately say review required and emit noindex.
5. **Footer and navigation need route-level release wiring.** `SiteFooter` suppresses unverified destinations for `publicPage`; pilot pages instead link to `/pilot/` legal paths. Exact home/free-tips/free-bets still use pilot layouts and therefore show pilot navigation/footer behavior. The homepage and free-tips body also contain hard-coded `www.everytip.co.uk` links. At cutover those should use verified local exact paths, not point users back to old WordPress or preview routes.
6. **Sidebar rendering on future public pages:** `BaseLayout` previously suppressed the requested sidebar whenever `publicPage=true`. This local bug is fixed: explicit `sidebar` now controls both grid and aside. Public pages still omit the pilot-only topic cards; `FeaturedOffersSidebar` remains a disabled visual preview. This makes it possible for future released article/archive routes to request the seven-offer sidebar without breaking its inactive-CTA safeguard.

## Implemented locally and checked

- `src/layouts/BaseLayout.astro`: explicit sidebar is no longer gated by `!publicPage`.
- `tests/base-layout-sidebar.test.mjs`: two static contract tests for public-sidebar rendering and preview-only offer content, both passing.
- `npm run check`: 258 Astro files, zero errors/warnings/hints.
- `npm run test:content`: 110/110 passing.

These tests establish the layout contract, **not** commercial/SEO readiness. Keep exact priority routes noindex until the specific feed, link, offer, legal and archive gates above have independently passed.
