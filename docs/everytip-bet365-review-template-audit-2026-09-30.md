# Bet365 review template pilot — design and content audit

Date: 30 September 2026. Source: live `/bet365-review` page (WordPress page ID 87553), inspected read-only. Pilot: `/pilot/bet365-review/`. No live or staging WordPress content was changed.

## Keep from the current review

- Seymour Biz's independently described £20 bankroll test, author identity and firsthand observations.
- Ten evaluation areas, pros and cons, overall verdict, detailed long-form content and affiliate/safer-gambling disclosures.
- Bet365 green as a recognizable bookmaker accent; EveryTip blue for site navigation and deep orange for commercial actions.
- The review's current URL and editorial text as migration inputs, subject to a line-by-line factual and link audit.

## Design observations, not conversion conclusions

- The opening viewport currently includes a top claim-offer strip, a large orange offer action in the green hero, and a second offer card with another CTA. Compact terms are repeated in both places before the detailed review begins. The pilot uses one clearly labelled offer card in the opening viewport and another placement after the conclusion.
- The live page visually states **4.8/5**, but two rating widgets expose **3.9 out of 5** in the accessibility tree. The ten visible category scores also do not simply average to 4.8 (nine 5s and one 4.5 average to 4.95). This may reflect an intentional editorial weighting, but the rule and accessible labels should be reconciled before migration.
- Some offer and bookmaker claims are time-sensitive. One reviewed source of truth should supply the offer headline, compact terms, full terms, eligibility and affiliate destination sitewide. Separate review facts (scores, testing notes, banking, streaming, regulatory and market claims) require their own last-checked dates.
- We have not inspected outbound-click analytics or affiliate signup reports. The current signup count cannot be attributed to colour, CTA quantity or layout without instrumented funnel evidence.

## Proposed WordPress editing model

- Review page ↔ `et_bookmaker` and current welcome `et_offer` relationships.
- Reviewer, testing date, testing method, bankroll, overall verdict and overall rating.
- Ordered review-section repeater: stable section key, heading, rating, editable rich-text evidence/body, optional screenshots and last-checked date.
- Pros and cons as editable lists; final verdict and key caveats as editorial fields.
- Offer terms and CTAs come only from the linked ACF Offer record, never copied into the review fields.
- Ensure one data source renders the visible score, machine-readable rating and assistive-technology label.

## Pilot limitations and measurement

The Astro pilot uses summaries and the publicly visible rating as visual fixtures, not the full migrated article. Its CTA elements are inert and no real terms or affiliate URL are included. Before considering a conversion improvement, compare qualified review visits → offer clicks → bookmaker signup/FTD where available, by device and traffic source. This distinguishes page friction from offer competitiveness or traffic intent.

On 1 October, a mobile-only bottom offer bar was added to the pilot. It appears after the opening offer card has scrolled out of view, hides when the site footer enters the viewport, and can be dismissed for the rest of the page view. The pilot action is inert. The production action must use the related approved ACF offer record, including its destination, eligibility and space-restricted terms; it must not copy the pilot's generic disclosure as a substitute for approved offer terms. Phone-width checks at 375px and 320px found no horizontal overflow, and appearance, dismissal and footer clearance were exercised in the local browser.
