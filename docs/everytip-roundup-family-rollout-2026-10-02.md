# Roundup family rollout — 2 October 2026

The approved PayPal migration preview now uses a shared `RoundupGuideShell`. It still renders the same staging Gutenberg capture, ranked ACF entries, featured PayPal cards and expandable payment table; this refactor did not change its content source.

Four more local, noindex roundup previews use that shell and captured WordPress editorial copy:

| Legacy URL | Local preview | Core-block dry-run | Staging draft |
| --- | --- | ---: | --- |
| `/low-or-no-minimum-deposit-betting-sites.html` | `/pilot/low-or-no-minimum-deposit-betting-sites/` | 67 | 90880, private draft |
| `/online-bookmakers-that-accept-neteller.html` | `/pilot/online-bookmakers-that-accept-neteller/` | 130 | 90882, private draft |
| `/best-betting-sites-for-basketball.html` | `/pilot/best-betting-sites-for-basketball/` | 92 | 90884, private draft |
| `/online-bookmakers-that-accept-skrill.html` | `/pilot/online-bookmakers-that-accept-skrill/` | 143 | 90883, private draft |

The low-deposit staging draft is a separate post. Its 67 converted blocks preserve the source text under whitespace normalization, and REST readback confirmed draft status, slug, content and categories. The published staging source 33470 and the live site were not changed.

JP approved the low-deposit frontend pattern on 2 October 2026. Additional bookmakers can be added later through ordered ACF ranked entries; their absence from the initial preview is not a design regression. Approval covers the local template pattern, not publication of unverified offers or claims.

The low-deposit local frontend now goes beyond the raw content check: it renders a branded Betfred card using the shared ranked-entry design. Staging draft 90880 has one ACF ranked entry linked to central offer 90846. REST readback verified the update did not change the draft body; authenticated WPGraphQL returned the entry and Gutenberg content, captured locally for the Astro preview. The bookmaker logo/colour remains a pilot identity mapping until the offer→bookmaker relationship is wired through GraphQL. The old Betfred promotion and deposit figures are withheld from this frontend preview (18 legacy elements); the original WordPress source and staging draft retain them for editorial review. The remainder of the guide is still shown in its original order. A regression test checks the legacy promotion is absent from the frontend body while the main guide sections remain.

The Neteller and Skrill local previews now show two branded partner-reference cards each (Betfred and NetBet) in the approved layout. These are **pilot mappings**, not ACF entries or confirmed Neteller/Skrill support. Their legacy promotional sections are withheld from the frontend preview (20 and 35 elements respectively), while the remaining long-form copy stays in place. In particular, the legacy 10Bet promotion explicitly excludes Neteller/Skrill qualifying deposits, so no 10Bet offer card was inferred for these payment-method guides. The original WordPress sources are unchanged.

JP approved both Neteller and Skrill local designs on 3 October 2026. At approval time their cards were pilot mappings; the later CMS pass below replaced the ranking text and offer references with ACF/WPGraphQL data. Payment/offer claims remain pending verification.

JP subsequently approved the roundup family design without further per-page design review on 3 October 2026. This authorizes applying the visual template across the migration queue, not publishing unverified claims or offers.

The basketball local preview now uses the same structured-card pattern. Its source has four old bookmaker sections; only Betway is mapped to a current EveryTip partner record in this pilot. The 18 legacy shortlist elements (including old CTA links) are withheld from the frontend preview, while the basketball evaluation criteria and betting-analysis sections remain. The later CMS pass below added its staging ACF entry; this is still not a verified basketball-offer claim.

Next CMS integration pass: separate staging Gutenberg drafts were created for Neteller **90882** (130 blocks), Skrill **90883** (143 blocks), and basketball **90884** (92 blocks). Each retained exact normalized editorial text and categories, with REST readback confirming draft status and unchanged published sources. ACF ranked entries were added: Neteller and Skrill each reference Betfred offer 90846 and NetBet offer 90851; basketball references Betway offer 90850. Authenticated REST and WPGraphQL returned matching order, verdicts and offer IDs. The local Astro previews now use dated WPGraphQL captures of those private drafts for the body and ranked entries. Bookmaker logo/colour remains a local identity mapping; links and unverified terms are withheld.

These four non-PayPal previews are **content/layout migration checks**, not finished commercial pages. Their legacy bookmaker rankings, deposit/payment claims and offers have not been reverified. Preview links are disabled; no affiliate destinations or terms are published. Next, replace repeated bookmaker modules with ranked ACF offer/bookmaker references, review each guide's claims, and test the resulting staging draft through WPGraphQL in Astro. The BOG and cash-out examples contain builder/active modules, so they require page-specific extraction rather than the safe core-block converter. Preserve each original `.html`/extensionless URL at launch.

Checks: `npm run check`, `npm run test:content` (33 passing), `npm run build` (50 pages), and local HTTP 200/noindex/shared-shell checks on the five integrated roundup previews. Low-deposit, Neteller, Skrill and basketball show dated WPGraphQL captures and ACF offer references. Old promotional text and CTAs are absent from the local frontend previews.
