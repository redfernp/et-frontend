# Legal/footer continuity audit — 13 October 2026

Read-only comparison of current live and staging WordPress REST pages and the exact local Astro build. No legal wording, WordPress page, footer claim, live site or deployment was changed. The local build remains a noindex preview.

| Exact path | WordPress page | Source/body parity | In-body links | Live SEO intent → local preview |
| --- | ---: | --- | --- | --- |
| `/safer-gambling` | 70281 | Live, staging and built Astro body text identical (3,127 visible characters; three H3 sections). The staging modified date is newer because this page was converted to Gutenberg without changing visible copy. | 4/4 exact text+destinations | Live `index,follow`, self-canonical → preview `noindex,nofollow`, no canonical. Restore live intent only at release. |
| `/terms-conditions` | 61 | Live, staging and built Astro body text identical (19,268 characters; one H3). | 1/1 | Live `noindex,nofollow`, no canonical → same preview intent. Preserve noindex at release. |
| `/privacy-policy` | 6376 | Live and built Astro body text identical (18,622 characters; 25 headings). Staging's visible body is 24 characters longer solely because it spells out `wordpress-159231-2098144.cloudwaysapps.com` where live says `www.everytip.co.uk`; Astro's preview host normalization restores the live wording. | 10/10 exact text+destinations | Live `noindex,nofollow`, no canonical → same preview intent. Preserve noindex at release. |

The exact built pages retain every source heading and every in-body anchor. SEO titles and meta descriptions match live. No staging hostname remains in the visible built policy copy. `scripts/audit-legal-parity.mjs --built` is the reproducible source/build comparison; its staging requests are authenticated read-only. Hashes: safer `007e14e8…197f0`, terms `67783735…4b3b`, privacy `11681b4f…14f0` (SHA-256 of normalized visible body text).

## Footer and small-screen presentation

The live footer widget has Contact, About, Terms, Privacy, Sitemap, Safer Gambling, a “Gamble Responsibly Quiz” link, categories and 18+/GambleAware artwork. The Astro footer contains the six core internal destinations, 18+, GambleAware and safer-gambling copy; it additionally has a player-protection/affiliate-disclosure paragraph. Its internal destination paths are present in the local route allowlist. This is **functional legal-navigation continuity**, not pixel/text-identical legacy-footer parity. The legacy quiz label points to `https://about.gambleaware.org/`, which is not demonstrably a quiz; it was not blindly copied.

Static small-screen checks found no tables, images, fixed-width inline elements or nonwrapping widths in the three policy bodies. The policy shell constrains long text/URLs with `overflow-wrap:anywhere`, has responsive hero padding below 650 px, and the footer switches to a single column below 700 px. The parent task then visually checked **all three exact routes at 375×667** in the local browser: document `scrollWidth=360` against viewport 375, main width 328, readable stacked content, intact footer links and `noindex,nofollow`. The header navigation scrolls inside itself without widening the document. The temporary viewport was reset and the QA tab closed.

## Owner/legal decisions before launch

- The privacy notice and terms were last modified in **2018**. Privacy still names Aweber, OptinMonster, Jetpack and old browser/cookie procedures; confirm the actual SendFox/ConvertBox/Cloudflare/tracking setup and have the owner or counsel update the WordPress source. Do not change only Astro's copy.
- Recheck all external safer-gambling/support destinations (including the quiz label/target) and current legal wording. This audit verifies parity, not legal accuracy or current destination validity.
- Preserve the differing SEO intent: safer gambling may return to `index,follow` only at approved launch; terms and privacy must stay `noindex,nofollow` unless the owner explicitly changes strategy.
