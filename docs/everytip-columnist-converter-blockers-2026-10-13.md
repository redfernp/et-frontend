# Columnist converter blocker analysis — local only, 13 October 2026

No staging or live WordPress calls or writes were made. The 2 October GraphQL snapshot was screened with the existing strict `classicHtmlToBlocks` converter and columnist portrait option. Among 513 Seymour/John posts, **25** rendered bodies reject: 15 complex Seymour blockquotes, 3 Seymour nested lists, 5 top-level divs (four John, one Seymour), and 2 John bodies with active/builder markup. These are snapshot-level shape classifications, not current raw-editor diagnoses.

## Quote shapes

The 15 blocked Seymour quote cases are not one uniform variation of the existing paragraph-only quote rule. Examples include `h2/h3/h4 + p`, `heading + ul + p`, `p + ul + p`, `p + p + ul`, and six `div dir="ltr"` rows inside a quote. The list-bearing quotes contain selection lists and historical bookmaker links. They must retain hierarchy, text order and link attributes. IDs: `66158`, `64121`, `46784`, `44193`, `42349`, `42050`, `41849`, `41668`, `41461`, `41266`, `41036`, `40931`, `40821`, `40747`, `40637`.

An isolated, unsaved prototype replacing the `div dir="ltr"` wrappers with paragraphs in `64121` did make the current converter emit 38 blocks and preserved a basic link fingerprint, **but visible-text parity failed** (6,404 source versus 6,394 converted characters). It is therefore **not** a safe conversion rule. No shared converter code was changed.

## Nested-list shapes

IDs `76483`, `68280`, `67259` each have an otherwise empty outer `ul > li` containing a second `ul` with 5, 7 or 6 meaningful list items. The current list serialization rejects nested `ul` within `li`. A local DOM-unwrapping prototype made all three parsable but **failed text and link parity** against the original snapshot. It was discarded. Even if parity were corrected, WordPress block validity would still need a staging editor/render check before an original could be changed.

## Recommended narrow implementation path

1. Keep the current fail-closed converter for these 25 posts. Do not flatten lists or quotes into plain paragraphs and do not convert the two John active-markup records generically.
2. When staging is healthy, fetch authenticated current raw bodies for individual candidate IDs and compare with the dated snapshot. Inspect whether the quote/list source is editor HTML or rendered plugin output.
3. Build **separate pure conversion helpers** for (a) an empty wrapper list around a single nested list and (b) quote children limited to known safe `p`, `h2–h4`, `ul` and simple presentational `div` shapes. Reject every other child/attribute. Add per-ID tests comparing normalized visible text, ordered anchor `href`, `rel` and anchor text, images, and list-item counts. Test serialized block validity through WordPress before any published-post update.
4. Keep historical affiliate links inert in Astro until offer/destination review. Gutenberg body conversion must not silently alter them or any Yoast state. Continue using saved pre-conversion backups, guarded current-state checks and independent rendered readback one post at a time.

The local evidence does **not** justify a shared converter change or a staging write today. Simple candidate Seymour columns remain available in the separate backlog report and should be processed first when staging recovers.
