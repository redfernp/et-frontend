# Legal pages Gutenberg conversion gate — 13 October 2026

Read-only authenticated staging REST and live public REST, using `scripts/audit-legal-staging-convertibility.mjs`. No WordPress page was edited, no draft created, and no live write made.

| Page | Current parity | Strict converter | Decision |
| --- | --- | --- | --- |
| Terms and conditions, page 61 | Staging and live share published slug, modified `2018-06-17T22:13:31`, rendered text and link inventory. Classic raw is 20,397 characters, with one link and zero blocks. Yoast remains `noindex,nofollow`. | Rejects `Unsupported inline markup: ul` within the top-level ordered list. | **No write.** A naive list conversion would flatten or lose nested legal clauses. Requires nested-list block support plus block validation and exact clause/link readback before guarded staging conversion. |
| Privacy policy, page 6376 | Staging and live share published slug and modified `2018-06-17T22:12:08`. Classic raw is 24,201 characters, with ten links and zero blocks; Yoast remains `noindex,nofollow`. The rendered staging/live difference begins where WordPress substitutes its local hostname for `www.everytip.co.uk`; the final terms link is likewise staging-local. | Rejects `Unsupported top-level markup: header`. | **No write.** The header and surrounding mixed markup need an explicit block mapping. A byte-for-byte staging/live comparison must normalize only the two known site hosts; it must not hide other text or URL differences. |

These are not suitable for the generic one-pass converter. A `wp:html` wrapper would preserve bytes but would not deliver a useful structured Gutenberg editing experience and would bypass the strict block-parity gate. Keep the original pages as the source while building and testing dedicated legal-page conversion, with a complete pre-write body/metadata/Yoast backup and independent REST/rendered readback per page. Their policy wording dates from 2018 and needs owner/legal review separately from the mechanical conversion; this audit does not revise it.

## Narrow extension feasibility check

The terms body has a single top-level ordered list of 19 clauses. Three clauses contain nested unordered lists, and one of those clauses has **two paragraph children after the nested list**. Supporting only nested `wp:list` blocks would therefore still reject a real clause; flattening the paragraphs into inline list text would alter its structure. The privacy body has an `entry-header` wrapping an H2, followed by an `entry-content` div containing a further table-of-contents div and 25 mixed paragraph, list and heading children. Several headings have IDs. Supporting only a `header` group would still reject the nested content and could lose its anchor semantics.

For that reason no partial extension to the shared converter was made, no legal page was written, and the guarded staging write protocol was not invoked. A dedicated converter would need fixtures covering these precise nested structures, WordPress block-parser validity, exact visible text and ordered-link comparison, heading-ID/semantic comparison, and independent staging readback before either page is changed.
