# EveryTip overnight template design progress

Started 1 October 2026, Europe/Rome. Work is local in `et-astro`; no WordPress writes or deployment. All preview routes are `noindex,nofollow` and commercial buttons are disabled unless explicitly identified otherwise. Do not copy the live site's expired or unverifiable offer terms into templates.

## New designs in this pass

| Family | Preview route | Notes |
| --- | --- | --- |
| New-customer free-bets roundup | `/pilot/bookie-free-bets-bonus-offers/` | Reuses the seven-colour homepage ladder; central ACF terms anatomy and editorial explainer. |
| Existing-customer offers index | `/pilot/latest-betting-offers/` | Today/racing/football sections, status and checked-date fields, news-story relationship. Cards contain labelled fixtures, not live offers. |
| Standard article: offer news | `/pilot/article-offer-news/` | Editable story, central inline offer, disclosure, newsletter slot, related links and sidebar. |
| Standard article: daily tips | `/pilot/article-daily-tips/` | Structured imported-selection area, provenance/correction notes, optional central offer block. |
| Single bookmaker feature/offer explainer | `/pilot/bet365-best-odds-guaranteed/` | Editable SEO explanation, checked conditions, optional linked offer record; distinguishes feature from promotion. |
| General football tips hub | `/pilot/english-premier-league-betting-tips/` | Structured market groups, desktop tables/mobile cards, authored-column links and an earlier-tips accordion; no results yet. |
| Editorial archives | `/pilot/blog/`, `/pilot/betting-guides/`, `/pilot/author/jnewsome/` | Shared card component with working second pages, author identity variant and separate recorded live indexability policies. |
| Newsletter landing and sign-up confirmation | `/pilot/daily-newsletter/`, `/pilot/free-betting-tips-previews-analysis-by-email/`, `/pilot/newsletter-thank-you/` | ConvertBox placement preview only; no working form, tracking or email capture. Old AWeber-era frequency and consent promises are flagged for review before Sendfox migration. |
| Racecourse directory | `/pilot/racecourses/` | Searchable UK/Ireland, turf/all-weather groups from 45 mapped guide URLs, linked to the Kempton course pilot. Other guide links still point at live routes pending conversion. |
| Evergreen editorial guide | `/pilot/how-to-win-football-accumulators.html/` | Long-form guide with quick answer, in-page navigation, editable sections, a hypothetical example slot and FAQ. It does not repeat profitability claims from the live article. |
| Exchange review | `/pilot/betfair-exchange-review.html/` | Separate from bookmaker scoring: back/lay explanation, liquidity, liability, commission and dated test evidence. Old score and promotion are withheld pending re-test. |
| Utility pages | `/pilot/about-us/`, `/pilot/we-love-to-hear-from-you/` | Reusable utility layout with section navigation. About-page performance claims and contact form/response promises are not inherited without review. |
| Review and tipster directories | `/pilot/bookmaker-reviews/`, `/pilot/winning-football-tipsters/` | One reusable directory shell with product-type or sport grouping. Cards point only to existing local pilots; no current rank, offer or profit claim is implied. |
| Legal/support content shells | `/pilot/privacy-policy/`, `/pilot/terms-conditions/`, `/pilot/safer-gambling/` | One approval-gated shell with contents navigation. It holds no purportedly valid policy or help copy; the safer-gambling page has no commercial sidebar. |
| Human-readable sitemap | `/pilot/html-sitemap/` | Grouped routes for human navigation, to be generated from a published-route registry rather than the dated-prediction archive. |
| Paid-tipster service review | `/pilot/tipster-service-review/` | Third review variant, separate from sportsbook and exchange; availability, historical-record method, obtainable odds, fees and dated evidence come before any CTA. No provider is endorsed. |

`HomeOfferLadder.astro` now accepts a heading, description and expanded-seven mode without changing its homepage defaults. `ArticlePilot.astro` covers the two article variants. `npm run check` and `npm run build` passed after these additions (the check continues to show two pre-existing Buffer hints in an unrelated workbook script).

## Remaining page-family design queue

The reusable page-family design pass is complete. The remaining work is implementation and content approval, not another bespoke page-family design:

1. Build the production ACF Pro/WPGraphQL types, placement relationships, REST upload/import endpoints and safe body-block renderer. Add the EveryTip MCP editorial bridge so Codex and Claude can drive routine WordPress drafts, edits, media, offer updates and tips imports from chat without using wp-admin day to day; see the dedicated workflow in `everytip-wordpress-astro-migration-spec.md`.
2. Map all 1,091 crawl rows to exact output paths, redirects or explicit exclusions. Preserve canonical and robots decisions URL by URL; the local `.html/` pilot paths are *not* proof of production `.html` permalink parity.
3. Reconcile WordPress racecourse names/aliases and source tips IDs. Keep the first release free of results as requested.
4. Migrate and fact-check builder content, media, internal links, author attribution, ratings, offer text and service status. Do not directly render Beaver/Thrive shortcodes in Astro.
5. Have the owner and an appropriate reviewer approve privacy, terms, consent, safer-gambling resources, commercial claims and email frequency before launch. The old privacy notice still names AWeber and OptinMonster and states a 2018 update date.
6. Connect the existing ConvertBox placement and eventual Sendfox/tracking flow only after consent wording, minimisation and limits are signed off. None of these pilots collects or sends personal data.
7. Run production-like crawl, responsive, accessibility, link, canonical, robots, structured-data and offer-terms checks before any DNS or live-site switch.

These are design pilots only. The later implementation step is still the ACF Pro schema and WPGraphQL contract, then actual content conversion with URL-by-URL SEO checks. Prefer a small set of reusable components over one bespoke layout per URL.

At approximately 01:04 Europe/Rome, the new sport hub and editorial archives passed `npm run check` and `npm run build`. A 375px browser check showed no horizontal overflow for the football hub or blog page 2; the football table correctly switches to cards. The two unrelated Buffer hints remain.

At approximately 02:00 Europe/Rome, the newsletter and racecourse designs passed `npm run check` and `npm run build` (29 routes). At 375px, neither inspected page had horizontal overflow. The racecourse filter reduced 45 cards to the single Kempton card when searched. The final course inventory needs reconciliation with WordPress because the live index names tracks outside the September crawl.

At approximately 03:09 Europe/Rome, the evergreen guide, exchange review, About and Contact pilots passed `npm run check` and `npm run build` (33 routes). The 375px browser checks showed no horizontal overflow in the evergreen guide, exchange review, About or Contact pages. The current source pages were consulted for structure, but changing offer details, profit promises and contact-form claims were not copied as live facts.

At approximately 04:07 Europe/Rome, the review and tipster directory pilots passed `npm run check` and `npm run build` (35 routes). Both fit a 375px phone viewport without horizontal overflow. Other mapped category hubs (`/news`, `/betfair-profits`) and tag archives can reuse the editorial archive pattern with their current indexability policies; `/sports-tips` can reuse the free-tips directory. No extra bespoke layout is needed for those routes. The paid-tipster comparison remains a separate editorial shortlist, not the entire directory.

At approximately 05:11 Europe/Rome, policy/support shells, the HTML sitemap and the neutral tipster-service review passed `npm run check` and `npm run build` (40 routes). Privacy, terms, safer-gambling, sitemap and service-review pilots were inspected at 375px with no horizontal overflow. The check has zero errors and zero warnings; only the two pre-existing Buffer hints remain in the unrelated workbook script. The privacy/terms/support shells are deliberately unusable as real policies until approved content is supplied.
