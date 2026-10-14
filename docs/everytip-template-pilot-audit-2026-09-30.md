# EveryTip template pilot audit — staging

Date: 30 September 2026. Source: logged-in, read-only inspection of `wordpress-159231-2098144.cloudwaysapps.com` frontend, post/page editors, and Ninja Tables editor. No content, settings, tables, or offers were saved or changed.

This refines the crawl-wide [template map](everytip-template-map-2026-09-30.csv); it does not claim that every URL in a family has been individually inspected.

## Verified pilot matrix

| Legacy path | WP object | Editor/source evidence | Current layout |
| --- | --- | --- | --- |
| `/low-or-no-minimum-deposit-betting-sites.html` | Post 33470 | Thrive Architect is active; Thrive content boxes, columns, buttons/rating, image and video | Full-width; `No Sidebars` set |
| `/best-paypal-betting-sites.html` | Post 58743 | Beaver Builder active; rich text, headings, photos, buttons, icons, TOC; some embedded Thrive content boxes; Ninja Table 59016 for PayPal timing/fee data | Full-width; `No Sidebars` set |
| `/best-odds-guaranteed-bookies.html` | Post 56442 | Beaver Builder active; rich text, headings, photos, buttons, icons, video, TOC | Full-width; `No Sidebars` set |
| `/best-cash-out-betting-sites-uk-ire` | Page 75559 | Beaver Builder active; rich text, photos, buttons, icons | Full-width rendered; sidebar setting `Default` |
| `/value-bet-tips-dark-horses.html` | Post 72421 | WordPress editor contains `[ninja_tables id="72501"]`; frontend table is `Tissue Price Value Tips` | Right sidebar rendered; sidebar setting `Default` |
| `/racecourses/kempton-racing-tips` | Page 45270 | WordPress editor contains `[ninja_tables id='72501' filter='KEMPTON']` and `[ninja_tables id="86633"]`; rendered content also embeds Beaver layouts, including course-navigation accordions | Full-width rendered; sidebar setting `Default` |

An edit button for a builder is not proof of ownership. The active-builder message in the editor and rendered entry content were checked. For example, the Dark Horse page has Beaver modules in its **sidebar**, but its primary tip table is a WordPress shortcode. The Kempton page has Ninja shortcodes and embedded Beaver layouts, despite not reporting Beaver as its active page editor.

## Section inventory for the four roundups

| Guide | Visible page-specific sections/modules | Template implication |
| --- | --- | --- |
| Low/no minimum deposit | Hero image, intro, short bookmaker offer card, minimum deposit/bet/withdrawal fact grid, long-form payment and low-stakes guide, video, TOC/related links. Betfred’s compact terms appear in the top card and again in the detailed entry. | Use one central offer reference for both placements. Keep a page-specific fact grid and optional media block; do not force a multi-operator ranking when this guide currently highlights one. |
| PayPal | Intro, TOC, trusted quick picks, full ordered bookmaker list, detailed PayPal deposit/withdrawal sections, Ninja Table 59016 for fees/times/limits, guidance and conclusion. | Need a ranked list plus a structured guide-specific comparison table, not just generic rich text. Existing Thrive content boxes embedded within Beaver content require visual QA. |
| Best odds guaranteed | TOC, editor's quick picks, full bookmaker list, explanatory BOG/BOG+ sections, multiple betting strategy subtopics, video, conclusion. | Same ranked-entry core as PayPal, with flexible editorial sections and an optional video; BOG eligibility/facts should not be inferred from a welcome offer. |
| Cash out | Intro/important details, overall sites section, TOC, editor's quick picks, individual bookmaker cash-out sections, more-site list, explanatory guide and conclusion. | Needs a feature-focused ranked entry and separate informational sections; preserve the full-width layout. |

The layout must support **full-width money guides** and **right-sidebar tips/editorial pages** as explicit variants. The user’s request to preserve sidebars should not result in adding a sidebar to guides that are presently full-width. Capture mobile/tablet screenshots of each before implementation and compare every section after Astro rendering.

## Tips table findings

- Ninja Table 72501 is called `Tissue Price Value Tips` and is configured as a **Google Sheets Table**. The displayed columns are Time, Course, Horse Name, Forecast SP, Jockey, Trainer, and Tissue Value Price.
- The same table powers both Dark Horse and Kempton. The Kempton shortcode applies `filter='KEMPTON'`; on the inspection date its rendered rows were Kempton (AW) only. Preserve an alias from `KEMPTON`/`Kempton (AW)` to one canonical course identity.
- Kempton also uses Ninja Table 86633 for fixtures. That is a separate dataset and should not be conflated with historical selections.
- Current Ninja Table 72501 reads the daily Google Sheet; it is not a durable, queryable history of published predictions and results. The previous-tips accordion needs an import archive with immutable publication date/time, selection, forecast/tissue price snapshot, later outcome, and correction history.
- Keep the current Google Sheet/Ninja Table path operational while a replacement import is built and verified. The proposed canonical archive is a WordPress custom table exposed to Astro through WPGraphQL, with authenticated REST import from the existing daily processing tool. Cloudflare D1 is unnecessary for the first version.

## ACF Pro field blueprint (proposed, not yet created)

WordPress title, slug, main editorial copy, Yoast fields, author, dates, and revision history remain native. ACF adds controlled structure:

1. `EveryTip Page Presentation` on posts/pages: template family (`roundup`, `review`, `tips hub`, `racecourse`, etc.), width/sidebar preset, hero image, optional intro, related-content references. Set a migration default per family; allow an editor override only where the live page actually differs.
2. `Roundup Guide` on selected posts/pages: roundup subtype (`payment`, `feature`, `sport`, `free bets`), ordered ranked entries, each with bookmaker relationship, optional offer relationship override, guide-specific verdict, features, pros/cons, and optional factual rows (e.g. minimum deposit, PayPal fee/time, cash-out capability, BOG restrictions). Store numbers/currency/source-check date as data, not styled HTML. Offer headline, destination, and both approved terms formats resolve from the central offer record.
3. `Guide Sections` as a limited, reorderable flexible-content set: rich-text section, comparison facts/table, methodology callout, image/video, FAQ, related links, newsletter module, and offer placement. Keep the TOC derived from section headings/IDs. Eric edits text and ordering; Astro owns visual components.
4. `Bookmaker` and `Offer` records: operator identity/logo/review relationship, offer type/eligibility/jurisdiction, welcome versus existing-customer status, exact full terms, separately approved compact terms, affiliate destination, dates, verification state, and reuse relationships. These are central records shared by roundups, sidebars, home ladder, free-bets pages, and articles.
5. `Racecourse Guide`: canonical course ID/aliases, fixtures source or structured fixture relationship, evergreen course copy, location/travel facts, current-tips component, and archive display limit. Do not store each daily tip in an ACF repeater.

Recommended editing controls: field-level validation, required relationships where a card is shown, safe missing-offer fallbacks, roles for Eric versus offer/compliance approvers, and a staging Astro preview. Do not migrate every builder module one-to-one; migrate its content and intent to the smallest reusable component set, with page-specific variants only when the pilot proves they are necessary.

## Build order and acceptance checks

1. Capture desktop/mobile visual baselines for these six pilots (including menus, full-width guides, right sidebar, tables, CTA/terms, and footers).
2. Create the ACF field groups and a handful of **test records on staging**, including two welcome offers, one existing-customer offer, and one roundup each for Thrive-origin and Beaver-origin content. Keep live content untouched.
3. Prove GraphQL reads return all ACF relationships, editorial sections, SEO fields, and approved terms. Prove REST import/upsert for tips separately.
4. Build shared Astro shell and sidebar, then one `RoundupGuide` proof page and one `TipsHub`/`RacecourseGuide` proof pair. Compare rendered copy, order, links, terms, tables, mobile behavior, and indexability against staging.
5. Bulk conversion only after the pilots pass. Maintain a URL-by-URL exception log for the remaining 20 roundup pages and 44 racecourse pages.

No WordPress schema or frontend code was changed during this audit. The next change step is the small staging ACF/test-record pilot, not a bulk migration.
