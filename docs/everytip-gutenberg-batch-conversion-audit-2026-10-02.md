# Gutenberg batch-conversion audit — 2 October 2026

This is a local, read-only screen of the latest staging public snapshot. It does not rewrite or publish posts.

The strict core-block converter initially accepted **49 of 983** published posts. Adding an explicit `wordpress-upload` image mode raised that to **448 of 983** without allowing external images, active embeds, Beaver/Thrive markup or unsupported inline structures. A sole EveryTip upload becomes a core image block; a leading upload followed by text becomes an image block plus an editable paragraph. Wrapping image links and inline styles are discarded. Existing default converter behavior still rejects images unless the image mode is explicitly selected.

This is **convertibility**, not approval. Many accepted posts retain old text links, claims and media that require editorial/SEO review before any public Astro route or bulk WordPress rewrite. The remaining **535** posts need dedicated handling: complex image placement, builder/active markup, unsupported structures, or empty content. Use `node scripts/audit-gutenberg-convertibility.mjs` to repeat the screen after a fresh snapshot.

For the next batch, create separate staging drafts or use an exact-ID/modified-time guarded conversion with a local raw-content backup and post-write metadata/Yoast readback. Start with representative daily tips and editorial articles, then confirm Gutenberg visual rendering and source text/image parity. Do not turn the 448 into an unchecked bulk update.
