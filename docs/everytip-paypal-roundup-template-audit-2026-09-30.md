# PayPal roundup template audit

Source: [live PayPal guide](https://www.everytip.co.uk/best-paypal-betting-sites.html), inspected 30 September 2026. Local design pilot: `/pilot/best-paypal-betting-sites/`. This is not a content migration or a verification of bookmaker/payment claims.

## Source modules to preserve

- H1, guide artwork, dated byline, introduction and table of contents.
- Featured bookmaker cards in the current visible order: Betfred, Betway, Spreadex, 10Bet. The intro says six picks, but four cards render.
- Detailed Betfred and 10Bet payment profiles; shorter descriptions of further bookmakers.
- Ninja Tables table ID `59016`, with nine columns: bookie; deposit time/minimum/maximum/fee; withdrawal time/minimum/maximum/fee. The live table renders 37 bookmaker rows.
- Long-form explanations, sign-up instructions, ranking, eligibility discussion and conclusion. The page is a substantial SEO article, not merely a list of offers.

## Editorial issues to resolve before shipping

- The 10Bet profile shows a £0 deposit limit and £5 minimum; the table lists a 10 minimum and 50,000 maximum. Its offer is in euros while surrounding copy is UK-focused. Do not migrate these numbers as approved facts.
- The page's four-card order differs from the later ranked list. Agree one editorial ranking source, or label the lists as intentionally different.
- The 10Bet “Read Full Review” button currently points to `#` on the same page. Resolve the review destination or suppress that button.
- PayPal support does not imply PayPal-funded welcome-offer eligibility. The offer terms on the live cards for at least Betfred and Betway mention debit-card conditions/exclusions. Model the payment method, deposit/withdrawal details, and offer qualifying-payment rule separately.
- The long tail of bookmaker/payment claims needs a current operator/market and payment-method audit before publication. Avoid copying unsupported privacy, financial, licensing or cross-country claims from the existing copy.

## Proposed WordPress editing model

- **Guide post:** intro, hero media, author/update date, ordered ranked-entry repeater, editor verdict and “best for” fields, and approved long-form section blocks with heading/rich-text/image/internal-link fields. Eric edits prose and order; Astro owns layout.
- **Bookmaker record:** canonical brand, logo, review route, active markets and status.
- **Payment-method facts:** bookmaker + jurisdiction + PayPal deposit/withdrawal availability, min/max, processing time, fees, checked date and source. One dataset drives summary cards, full comparison and detailed profiles.
- **Offer record:** approved headline, central compact/full terms, affiliate URL, payment exclusions, eligible jurisdictions, verification/expiry state. Ranked entries reference the offer, rather than copying its terms.
- **Fallback:** if a fact or offer is unverified/expired, hide the actionable claim and show a plain editorial status instead of an active CTA.

The local pilot deliberately uses the live four-bookmaker lineup as a visual fixture. All commercial controls are inert and all numeric payment claims show “Verify”. No staging or live WordPress records were changed.
