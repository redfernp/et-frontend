# EveryTip Staging Audit

Date: 2026-09-20

Staging source: `https://wordpress-159231-2098144.cloudwaysapps.com`

This was a read-only audit. No WordPress content, plugins, settings, menus, widgets, or server configuration were changed.

## Executive Summary

The staging copy is suitable as the migration source once its PHP version and remaining plugin updates are addressed. It contains the legacy GeneratePress, Beaver Builder, Thrive Architect, widget, and Ad Inserter structures needed to reproduce the current design.

The headless CMS stack is not installed yet. ACF Pro, WPGraphQL, WPGraphQL for ACF, and Yoast's WPGraphQL integration are absent, and `/graphql` currently returns `404`.

The most important prerequisite is PHP. Staging is running PHP 7.4.33, which is end-of-life and must be compatibility-tested before the new CMS plugins are installed. Live and staging currently share the same Cloudways server, and the owner does not have a dependable rollback path for a PHP change on that server. Therefore, do not change PHP on the current live/staging server. Duplicate the server into an isolated test environment and test PHP 8.3 there first, with PHP 8.2 as the compatibility fallback if a required legacy plugin blocks 8.3.

Cloudways documents application-level PHP selection for eligible Debian 11+ servers, but the migration must not rely on that feature until its availability and rollback behaviour have been verified in this account. Isolation on a duplicated server remains the approved safety boundary.

## Platform Inventory

| Area | Staging finding |
| --- | --- |
| WordPress | 7.1.1, reported as current |
| PHP | 7.4.33, 64-bit, FPM/FastCGI |
| Web server | Apache 2.4.68 on Debian/Linux |
| PHP memory limit | 1024 MB |
| PHP time limit | 300 seconds |
| PHP input variables | 2,500 |
| Upload/post limit | 256 MB |
| Active theme | GeneratePress Child 0.1 |
| Parent theme | GeneratePress 3.6.1 |
| GeneratePress plugin | GP Premium 2.5.6 |
| Active plugins | 32 |
| Inactive plugins | 1, JWT Authentication for WP REST APIs |

The active child theme and parent theme have automatic updates disabled. That is acceptable for the child theme, but both must remain under source control or be backed up before any theme update.

## Outstanding Updates

WordPress core and the themes are current. Two plugin updates remain:

| Plugin | Installed | Available | Audit note |
| --- | ---: | ---: | --- |
| Thrive Architect | 10.6.1 | 11.0.0.1 | WordPress reports the update as not tested with WordPress 7.1.1; update on staging and regression-test representative Thrive pages. |
| Yoast SEO | 28.1 | 28.5 | WordPress reports compatibility with WordPress 7.1.1. |

Ultimate Addons for Beaver Builder Pro 1.37.7 is active but reports that its copy is not activated for update notifications. Confirm the licence/update path before treating the plugin inventory as fully current.

## Headless CMS Readiness

- ACF Pro is not installed.
- WPGraphQL is not installed.
- WPGraphQL for ACF is not installed.
- No Yoast-to-WPGraphQL extension is installed.
- `/graphql` returns `404`.
- WordPress REST is available and already exposes rendered post/page content plus Yoast REST metadata.
- A representative free-bets page currently returns bookmaker offers, affiliate CTAs, and full terms as hard-coded rendered HTML. This validates the need to move offer facts and terms into central ACF records.

Install the GraphQL/ACF stack only after the PHP upgrade and legacy-plugin regression test. Do not use the inactive JWT REST plugin as a substitute for the planned WPGraphQL contract.

## Content Footprint

| Object | Count observed on staging |
| --- | ---: |
| Published posts exposed by REST | 980 |
| Published pages exposed by REST | 206 |
| Total pages in wp-admin | 247 |
| Draft pages | 39 |
| Private pages | 2 |
| REST categories | 8 |
| REST tags | 8 |
| Beaver Builder templates | 89 |
| GeneratePress Elements | 1 |

The current categories are `Seymour Biz`, `John Newsome`, `News`, `Racing Tips`, `Betting Guides`, `Sports Tips`, `Betfair Profits`, and `Bookmaker Reviews`.

## Legacy Builder And Template Findings

- The homepage is rendered through Thrive Architect and contains the new top-offers ladder in the main content.
- The normal right sidebar begins with Beaver Builder saved layout `55381`, titled `Sidebar Offers Template`.
- Beaver Builder and Beaver Themer are active, with Ultimate Addons for Beaver Builder Pro also active.
- Thrive Architect and Thrive Lightboxes are active.
- Many money pages and review pages expose both builder editing actions in wp-admin. Builder usage must therefore be identified from stored metadata/rendered structure, not from the presence of an edit button alone.
- The public REST response can provide rendered legacy content during transition, but builder data should not become the permanent offer-data model.

The migration should preserve the current visual structure while replacing builder-owned design with Astro templates and moving editor-controlled facts into ACF fields.

## Sidebar And Footer Structure

The active right sidebar currently contains:

1. A block containing `[fl_builder_insert_layout id=55381]` for the offers module.
2. A legacy text/HTML widget linking to betting guides.
3. A legacy text/HTML widget linking to popular racing tips.
4. A legacy text/HTML widget linking to popular sports tips.
5. An empty block used as spacing.

The header widget area contains Ad Inserter Pro Block 4, currently a hard-coded Bet365 image creative. Footer widget areas 1-3 contain legacy HTML link lists and safer-gambling copy. The remaining registered sidebars/widget areas are empty.

Astro should reproduce these as controlled components:

- `SidebarOfferCarousel` or compact offer ladder, sourced from ACF offer placements.
- `SidebarLinkGroup` for betting guides, racing tips, and sports tips.
- Structured footer navigation and safer-gambling content.
- No editor-owned layout HTML for spacing or presentation.

## Navigation

Six menus exist in WordPress. `ET v3.0 Main Navigation` is assigned to the GeneratePress Primary Menu location. Its top-level groups include Free Bets, Newsletter, Reviews, Free Tipsters, Paid Tipsters, Awards, Best Live Sport Streams, and New Offers, with a large set of nested review, tips, guide, and promotion links.

The menu hierarchy and URLs should be exported into the migration inventory. Astro may render the menu, but WordPress should remain the editor-controlled source unless a later decision deliberately freezes navigation in code.

## Ad Inserter And Country Targeting

Ad Inserter Pro has 16 configured slots. Much of the content is legacy image/HTML creative with offer copy and affiliate destinations hard-coded into individual blocks.

Country rules are present for:

| Block | Country value | Current creative purpose |
| ---: | --- | --- |
| 5 | NG | Betway Nigeria |
| 7 | NG | Betway Nigeria |
| 8 | KE | Betway Kenya |
| 9 | GB | Boylesports UK |
| 10 | IE | Boylesports Ireland |
| 11 | IN | Betway India |
| 14 | ZA | Betway South Africa |

Several other blocks contain old ComeOn, Bet365, Betway, comparison-table, and fallback creatives. Block 4 supplies the current header creative. The current implementation duplicates affiliate URLs, artwork, offer text, and regional logic across plugin blocks.

Migration policy:

1. Keep Ad Inserter Pro active on the legacy frontend during the build.
2. Create central `bookmaker`, `offer`, and `offerPlacement` records in ACF Pro.
3. Give offers explicit included/excluded countries rather than embedding geography in an HTML block.
4. Render automatic and manual offer slots from the same records.
5. Use Cloudflare's country signal at request time for regional selection, with a safe default when location is missing or uncertain.
6. Replace each live Ad Inserter placement only after its Astro equivalent passes content, tracking, terms, and country QA.

## Performance And Operational Risks

- PHP 7.4.33 is the first remediation item.
- Object Cache Pro and Redis Object Cache are both active. Object Cache Pro reports a valid connected drop-in, so confirm whether Redis Object Cache is redundant before deactivating anything.
- Wordfence and Sucuri are both active. Review their overlapping jobs and measured cost, but do not remove either without a security decision.
- WP File Manager is active. Review whether it is genuinely required and restrict/remove it if it is not part of the operating workflow.
- Query Monitor is active on staging, which is useful for diagnosis but should not be part of the production frontend path.
- The homepage observation showed roughly 3.2 seconds and 180 MB in Query Monitor. One admin observation reported roughly 31.9 seconds and 174 MB. These are point-in-time readings, not a benchmark, but they justify a performance pass before automated builds begin.

## Recommended Execution Order

1. Take/confirm a fresh Cloudways backup, then duplicate the existing server into an isolated test server. Do not change PHP on the server shared by live and staging.
2. Confirm that the duplicate cannot send live email, trigger production automations, receive production traffic, or mutate production tracking/data.
3. Change only the isolated duplicate from PHP 7.4 to PHP 8.3; use PHP 8.2 only if a required legacy plugin blocks 8.3.
4. Clear caches and regression-test the homepage, representative daily posts, key money pages, builder editing, menus, widgets, redirects, affiliate links, and ConvertBox.
5. Update Yoast SEO on the isolated duplicate and repeat the SEO/meta checks.
6. Update Thrive Architect on the isolated duplicate and test representative Thrive pages before and after the update.
7. Resolve the Ultimate Addons update/licence status.
8. Review duplicate caching and security plugins using Query Monitor/Site Health evidence; make no removals without a backup and an explicit decision.
9. Install ACF Pro, WPGraphQL, WPGraphQL for ACF, and the selected Yoast WPGraphQL integration on the isolated duplicate.
10. Create and approve the bookmaker, offer, placement, roundup-guide, and inline-offer field groups.
11. Populate a small test dataset and prove REST/GraphQL output before bulk migration or Astro implementation.
