# Free horse racing tips CMS conversion triage — 13 October 2026

Scope: staging published WordPress page 41881 (`/free-horse-racing-tips`) versus the live public copy. Read-only; no published page or draft was changed.

## Verdict

Do **not** auto-seed a Gutenberg replacement from this page yet. The original is a 68,326-character classic/Thrive body with pagination shortcodes, a dated October 2025 tips directory, bookmaker promotions, and zero Gutenberg blocks. Staging and live identify the same published page and last-modified time (20 October 2025), so the issue is not a missing import. It is the meaning of the copy: the introduction says tips are updated daily and covers a current tipster roster, while the source directory is a year old.

The existing local exact-route preview safely extracts four editorial groups, four FAQs and responsible-gambling text, strips their links, and keeps the route noindex. That is useful as a *dated preview*, not a source-locked CMS replacement. The purported evergreen sections still assert “Our daily horse racing tips,” “Our daily racing tips,” “We publish daily tips,” current editorial independence and source cross-checking. The FAQ includes a Lucky 15 example with only three horses and mixes UK/US bet types. Moving these into a fresh Gutenberg draft without editorial review would give stale or potentially incorrect claims a new life.

## Bounded path forward

1. Eric or the owner confirms the current tips-feed cadence, named contributors, research/corrections process and bet-type examples; correct any factual errors in WordPress copy.
2. Provide a trusted dated daily tips feed and decide how the old directory is archived. Keep the Thrive pagination and Ninja/offer sections outside Gutenberg conversion until their replacements are verified.
3. Then create a separate unpublished Gutenberg page with only approved evergreen intro/guide/FAQ blocks. Pin source ID 41881 and its modified timestamp, save the complete original raw/SEO backup, and independently read back every block before considering any replacement. Keep the original published page unchanged until parity and release checks pass.

SEO is also not launch-ready: the live title ends “Updated Today” and the description promises daily tips, while the local route correctly avoids that claim and remains noindex. The exact URL is present, but URL coverage is not content or indexability parity.
