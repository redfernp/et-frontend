"""Create a provisional, reproducible template map from a Screaming Frog crawl.

Usage: python scripts/map_crawl_templates.py INPUT.csv OUTPUT.csv
The crawl alone cannot prove builder usage, WordPress taxonomy, or final SEO policy.
"""

import csv
import re
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit

ASTRO_TEMPLATE = {
    "homepage": "Home",
    "commercial-roundup": "RoundupGuide",
    "review": "Review",
    "offer-or-promotion": "OfferExplainer",
    "offer-listing": "OfferIndex",
    "racecourse-guide": "RacecourseGuide",
    "racecourse-index": "RacecourseIndex",
    "tips-hub": "TipsHub",
    "specialist-tips-hub": "TipsHub",
    "dated-prediction-article": "Article",
    "standard-article": "Article",
    "evergreen-guide": "Guide",
    "tipster-directory": "Directory",
    "editorial-archive": "Archive",
    "category-hub": "Archive",
    "blog-archive": "Archive",
    "author-archive": "Archive",
    "tag-archive": "Archive",
    "utility-page": "Utility",
    "newsletter-landing": "NewsletterLanding",
    "unresolved-content": "NeedsReview",
    "redirect-only": "NoPageRedirect",
    "not-found-audit": "NoPageAudit",
    "query-variant": "NoSeparatePage",
}

# Read-only staging editor/frontend checks on 2026-09-30. Blank means unverified.
PILOT_EVIDENCE = {
    "/low-or-no-minimum-deposit-betting-sites.html": ("33470", "Thrive Architect", "No Sidebars", ""),
    "/best-paypal-betting-sites.html": ("58743", "Beaver Builder", "No Sidebars", "Ninja Table 59016 (supporting PayPal fee table)"),
    "/best-odds-guaranteed-bookies.html": ("56442", "Beaver Builder", "No Sidebars", ""),
    "/best-cash-out-betting-sites-uk-ire": ("75559", "Beaver Builder", "Default", ""),
    "/value-bet-tips-dark-horses.html": ("72421", "WordPress editor/shortcode", "Default; right sidebar rendered", "[ninja_tables id=72501]"),
    "/racecourses/kempton-racing-tips": ("45270", "WordPress editor/shortcode", "Default", "[ninja_tables id=72501 filter=KEMPTON]; [ninja_tables id=86633]"),
}


def classify(path, title, wp_kind):
    slug = path.strip("/").lower()
    title = title.lower()
    if not slug:
        return "homepage", "high", "Check Thrive/ladder and sidebar against live design"
    if slug.startswith("racecourses/"):
        return "racecourse-guide", "high", "Verify course alias and today/archive tips filter"
    if slug == "racecourses":
        return "racecourse-index", "high", ""
    if slug.startswith("author/"):
        return "author-archive", "high", "Preserve pagination and current robots policy"
    if slug.startswith("tag/"):
        return "tag-archive", "high", "Preserve current robots policy"
    if slug == "blog" or slug.startswith("blog/page/"):
        return "blog-archive", "high", "Preserve pagination and current robots policy"
    if slug in {"betting-guides", "sports-tips", "racing-tips", "news", "bookmaker-reviews", "betfair-profits"}:
        return "category-hub", "medium", "Confirm category route in WordPress"
    if slug in {"about-us", "privacy-policy", "terms-conditions", "safer-gambling", "we-love-to-hear-from-you", "html-sitemap"}:
        return "utility-page", "high", ""
    if slug in {"daily-newsletter"}:
        return "newsletter-landing", "high", "Check ConvertBox/form integration"
    if slug == "free-betting-tips-previews-analysis-by-email":
        return "newsletter-landing", "medium", "Check whether this is still an active signup page"
    if slug in {"nap-of-the-day.html", "bet365-6-scores-challenge", "best-backed-horses-today.html", "english-premier-league-predictions-for-saturday"}:
        return "tips-hub", "medium", "Confirm live data source and archived tips component"
    if slug in {"winning-football-tipsters", "everytips-professional-horse-racing-tipster-portfolio.html"}:
        return "tipster-directory", "medium", "Check listing/comparison modules"
    if slug in {"latest-betting-offers"}:
        return "offer-listing", "high", "Resolve central ACF offer placements"
    if re.search(r"(?:^|/)(?:saturdays?-horse-racing-preview|sunday-horse-racing-preview|epl-game-week|premier-league-preview|epl-week-\d+|.*world-cup.*(?:preview|tips)|.*-premier-league-football-correct-score-betting-tips-)", slug) or ("preview" in slug and re.search(r"(?:20\d\d|qatar22|euro-2024)", slug)):
        return "dated-prediction-article", "high", "Preserve author/date/robots; audit inline offers"
    if re.search(r"(?:^|/)(?:best-|top-.*betting-sites|casino-sites-that-accept|low-or-no-minimum-deposit|online-bookmakers|bookie-free-bets|high-stakes-betting-sites|professional-winning-tipsters-comparison)", slug):
        return "commercial-roundup", "high", "Audit Beaver/Thrive modules and ranked sections individually"
    if re.search(r"(?:^|/)(?:casino-review-|.*-review(?:\.html)?$)", slug):
        return "review", "medium", "Check operator/product type and legacy builder modules"
    if slug in {"bet365-pays-out-30m-on-sub-on-play-on-offer.html", "shearer-vs-owen-vs-rooney-best-of-3-series.html"}:
        return "standard-article", "medium", "Confirm article subtype/category"
    if slug in {"free-betting-tips", "free-horse-racing-tips", "free-horse-racing-football-cricket-tips", "value-bet-tips-dark-horses.html", "todays-tips-updated"}:
        return "tips-hub", "high", "Check live table/feed and archived tips component"
    if re.search(r"(?:^|/)(?:.*-tips(?:-for-today)?\.html|.*-tips)$", slug):
        return "specialist-tips-hub", "medium", "Confirm evergreen hub versus dated article; audit dynamic tables"
    if re.search(r"(?:^|/)(?:.*(?:sign-up-offer|bonus-code|free-bets|acca-insurance|best-odds-guaranteed|cash-out|money-back|extra-places|early-payout|scratch-of-the-day|pick-your-punt|double-delight|acca-club|bet-credits|maximum-payout).*)", slug):
        return "offer-or-promotion", "medium", "Check active offer, exact terms, and index policy"
    if slug in {"pro-tipster-list", "professional-sports-betting-tipsters", "professional-tipster-views-tips", "tipster-links", "winning-professional-tipsters"}:
        return "tipster-directory", "medium", "Check comparison/listing modules"
    if slug in {"channel-4-racing-tips-morning-line.html", "free-horse-racing-system.html"}:
        return "specialist-tips-hub", "medium", "Confirm current versus historical/live data"
    if slug.startswith("john-newsome-archive-posts-"):
        return "editorial-archive", "high", "Preserve seasonal grouping"
    if wp_kind == "post":
        return "standard-article", "low", "Confirm article subtype/category and builder/inline blocks"
    if wp_kind == "page":
        return "evergreen-guide", "low", "Inspect custom modules before assigning final template"
    if slug.startswith(("how-", "make-money-", "learn-how-", "false-favourites")):
        return "evergreen-guide", "low", "WordPress object unknown; inspect guide modules"
    return "unresolved-content", "low", "Resolve WordPress object/type and inspect page"


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python map_crawl_templates.py INPUT.csv OUTPUT.csv")
    source, target = (Path(value) for value in sys.argv[1:])
    with source.open(encoding="utf-8-sig", newline="") as input_file:
        rows = list(csv.DictReader(input_file))

    output = []
    for row in rows:
        url = row["Address"]
        parts = urlsplit(url)
        path = parts.path or "/"
        status = row["Status Code"]
        link = row.get("Response Header: link", "")
        match = re.search(r"/wp/v2/(posts|pages)/(\d+)", link)
        wp_kind = match.group(1)[:-1] if match else "unknown"
        wp_id = match.group(2) if match else ""
        if status.startswith("3"):
            template, confidence, review = "redirect-only", "high", "Retain/verify redirect chain and destination"
        elif status == "404":
            template, confidence, review = "not-found-audit", "high", "Investigate inbound links before redirect/410 decision"
        elif parts.query:
            template, confidence, review = "query-variant", "high", "Do not create a separate page; preserve query parameters and canonical"
        else:
            template, confidence, review = classify(path, row.get("Title 1", ""), wp_kind)
        verified = PILOT_EVIDENCE.get(path, ("", "", "", "")) if status == "200" and not parts.query else ("", "", "", "")
        output.append({
            "address": url,
            "path": path,
            "status_code": status,
            "indexability": row["Indexability"],
            "indexability_reason": row.get("Indexability Status", ""),
            "canonical": row.get("Canonical Link Element 1", ""),
            "wp_kind_from_header": wp_kind,
            "wp_id_from_header": wp_id,
            "verified_staging_wp_id": verified[0],
            "verified_builder": verified[1],
            "verified_sidebar_setting": verified[2],
            "verified_data_source": verified[3],
            "suggested_template": template,
            "astro_template": ASTRO_TEMPLATE[template],
            "confidence": confidence,
            "review_note": review,
            "title": row.get("Title 1", ""),
            "h1": row.get("H1-1", ""),
            "word_count": row.get("Word Count", ""),
            "redirect_target": row.get("Redirect URL", ""),
        })

    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", encoding="utf-8-sig", newline="") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=output[0].keys())
        writer.writeheader()
        writer.writerows(output)
    for name, count in Counter(item["suggested_template"] for item in output).most_common():
        print(f"{name}: {count}")
    print(f"Total: {len(output)}; output: {target}")


if __name__ == "__main__":
    main()
