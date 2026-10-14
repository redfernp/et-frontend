# Priority responsive QA — 14 October 2026

Local-only browser inspection, no WordPress write or deployment. Viewports: Chrome responsive device mode at **375 CSS px** and maximized desktop window (~1536 px). Home was read from the running local Astro dev server on port 4321; free tips, Bet365 review and the John Newsome example were read from the existing static `dist` via a temporary localhost server on port 4322. These remain labelled, noindex preview routes with commercial links disabled. This is a visual spot check, not full pixel parity or a public-launch approval.

| Route | 375px observation | Desktop observation |
| --- | --- | --- |
| `/` | Brand, headline, CTA and first offer card fit the single column; the stale-source banner wraps rather than clipping. | Hero and offer ladder remain centred with the agreed blue/orange hierarchy. |
| `/free-betting-tips` | Intro and Seymour/John profile cards stack. The exact-page header uses an intentionally horizontally scrollable menu; no article-body clipping was visible. | Two profile cards sit side by side; dated columnist feed follows. Current selections and offers stay withheld. |
| `/bet365-review` | Title, tested-by Seymour profile and source notice fit within the column. | Review body and right-side withheld-offer panel occupy separate columns; the panel does not activate a CTA. |
| `/epl-game-week-11-2022-23-season-premier-league-tips-john-newsome.html` | H1 wraps naturally, John colour portrait/byline and article introduction fit the column. | Main article and seven-offer branded sidebar are present. Sidebar placements remain visual previews with links disabled. |

No concrete CSS regression was reproduced, so no layout file was changed. The static exact article is not served by the current 4321 development process without its exact-route opt-in; it was inspected from the generated build instead. Browser notifications covered part of the right side in screenshots, so this pass does not certify every sidebar card or full-page scroll state.

The temporary Python static server redirected extensionless directories to trailing-slash URLs; that is a server artifact, **not** evidence of Cloudflare Worker routing parity. The route test suite below checks the Worker's exact extensionless behaviour separately.

The strict body-retention audit's **0.3%** result for `/english-premier-league-betting-tips.html` is not ordinary prose loss. WordPress post 87292 has a 54,881-character rendered body consisting of exactly four heading paragraphs and four large Ninja Tables wrapper divs; there is no standalone explanatory prose to recover. The local exact preview keeps the four headings and explicitly withholds old table rows because no trusted dated feed is available. Restoring the October 2026 rows would falsely present old selections as current. The low-retention result should remain classified as intentional feed withholding, not trigger an unsafe body-copy fix.

Validation after the spot check: `npm run check` passed with **0 errors/warnings/hints**; `npm run test:priority-slice` **36/36**, `npm run test:routes` **10/10**, and `npm run test:content` **121/121** passed.
