# Seymour Biz and John Newsome column archives

Sources inspected 30 September 2026: [Seymour’s Saturday racing archive](https://www.everytip.co.uk/saturday-horse-racing-tips) and [John’s Premier League archive](https://www.everytip.co.uk/english-premier-league-predictions-for-saturday). Local pilots use the same `ColumnArchive.astro` component at corresponding `/pilot/` routes. No live or staging WordPress content was changed.

## Shared source pattern

Both pages are WordPress Pages containing Thrive Architect header/intro content and a chronological post listing. They show a blue title, orange columnist subtitle, short introduction, article excerpts and a right-hand recommended-offer sidebar. The WP page author is JP, but the columns themselves are Seymour’s and John’s; the new design should identify the columnist clearly without conflating these roles.

The Seymour page appears to print a very long post list on one URL. John’s list is already paginated (page 1 of 22 when inspected) and includes non-Premier-League tournament specials. Neither archive should require Eric to paste a new article link manually.

## Production content contract

- Keep each existing public archive slug, H1 and editorial introduction. Store archive title, intro, columnist relationship, portrait and optional supporting copy in WordPress fields.
- Derive the cards from published posts via WPGraphQL, newest first. Use an explicit `column_series` or equivalent taxonomy/relationship; do not rely only on name fragments in titles or the WordPress user author field. The feed must allow John’s tournament specials and Seymour’s festival previews where editorially appropriate.
- Each card reads canonical title, publish date, excerpt, permalink, columnist and optional series/event label from the post. The pilot currently uses a small verified link snapshot, not a live GraphQL feed.
- Use stable HTML pagination for both archives at launch, with a documented redirect mapping for John’s existing paginated URLs. Do not leave Seymour’s entire historical archive on one enormous page. The archive index and every numbered archive page should emit `noindex,follow` as requested; individual article indexing is a separate decision. Use self-referencing canonicals for distinct archive pages rather than canonicalising them all to page one.
- Preserve individual post URLs and relevant internal links. Avoid duplicate archive entries when a post has multiple categories or series labels.
- The sidebar resolves offers from the central ACF Offer records; brand colour is presentation only, and compact terms must travel with every live commercial placement.

## Pilot choices

The pilot keeps the live blue/orange identity and the branded seven-offer sidebar. Colour author portraits replace the old tiny monochrome header portraits. The newest post is featured on page one; prior posts use compact cards. Both archive index pages and all numbered pages emit `noindex,follow`, and no affiliate URL is active. Numbered/older/newer links work in the local pilot. The fixture uses three entries per page to make pagination reviewable; the production page size should be chosen for the complete WPGraphQL feed (for example, twelve per page).
