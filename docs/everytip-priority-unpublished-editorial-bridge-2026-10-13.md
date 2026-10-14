# Priority page drafts: local-only editorial bridge (13 October 2026)

This is a preview integration receipt, **not a launch approval**. Published WordPress pages, live DNS, offer destinations, and commercial CTAs were not changed.

## Current wiring and gaps

| Exact route | Published source / unpublished staging draft | Safe use now | Remaining gap |
| --- | --- | --- | --- |
| `/bet365-review` | Published page 87553 / draft 91012 | Exact Astro preview retains dated review sections and withholds CTAs. Draft contains four core blocks of historical method/verdict only. | Draft is partial; it cannot replace the full review. Published body has a £20 bankroll example while Yoast meta says £30. Resolve editorially before release. |
| `/` | Published page 16 / draft 91013 | Existing homepage template may read the published staging page as an opt-in preview. Draft contains only two safe intro blocks. | Menus, offer ladder, latest-post modules and the rest of the introduction are outside that draft. Do not substitute it for the complete homepage. |
| `/free-betting-tips` | Published page 76939 / draft 91010 | The 34 long-form editorial sections can be read from the unpublished Gutenberg draft in a local, explicit opt-in build. | This does not replace feeds, commercial modules, SEO/Yoast, page identity or the published source. |

## Free-tips bridge

`src/lib/staging-free-tips-editorial-draft.mjs` uses authenticated, read-only staging WPGraphQL to fetch fixed draft ID 91010. It requires **both** `MIGRATION_EXACT_PREVIEW=1` and `MIGRATION_STAGING_FREE_TIPS_DRAFT_READ=1`, the exact staging origin, and local application credentials. The exact route passes only the validated editorial HTML to its existing hub template. With the flag absent, the dated published-page snapshot path remains unchanged.

Validation is deliberately strict: draft status/slug/ID, published snapshot ID/URI, 34 matching root section tags, nonempty/long-form text, and core paragraph/heading markup only. WordPress-generated `wp-block-paragraph` and `wp-block-heading` classes are accepted then stripped. Links, embeds, arbitrary attributes, commercial text and offer shortcodes fail closed. Fetch or GraphQL errors fail the opt-in build; no silent fallback presents stale copy as fresh.

Fresh readback at 23:53 Europe/Rome on 13 October: staging WPGraphQL returned draft 91010 (`draft`), 34 root sections matching the published-source tag sequence, 16 headings, 3,727 visible characters and no links; sanitized preview HTML length 4,096. The published page was not edited.

Focused tests: `node --test tests/staging-free-tips-editorial-draft.test.mjs` passed 2/2. `npm run check` passed with 0 errors/warnings. No concurrent build was run in this lane; the parent agent is handling integrated compilation.

Preview mode stays `noindex,nofollow`, and no commercial CTA is activated by this bridge. Before any launch, verify current copy, SEO, feeds, offers and exact-path output separately.
