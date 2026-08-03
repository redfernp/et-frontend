import fs from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve("outputs", "019f4c07-a1df-7c72-a3be-af96c909af00");
const outputPath = path.join(outputDir, "everytip-scn-topical-authority-workbook.xlsx");

const checkedDate = "2026-07-10";

const sourceRows = [
  ["Source", "URL", "Checked", "Use", "Notes"],
  ["EveryTip sitemap index", "https://www.everytip.co.uk/sitemap.xml", checkedDate, "Inventory", "Yoast sitemap index with post, page, and category sitemaps."],
  ["EveryTip robots", "https://www.everytip.co.uk/robots.txt", checkedDate, "Robots policy", "Blocks wp-admin, /go/, feeds, Beaver Builder plugin assets; references sitemap_index.xml."],
  ["WordPress posts REST", "https://www.everytip.co.uk/wp-json/wp/v2/posts?per_page=1", checkedDate, "Counts and export", "X-WP-Total observed: 962 posts."],
  ["WordPress pages REST", "https://www.everytip.co.uk/wp-json/wp/v2/pages?per_page=1", checkedDate, "Counts and export", "X-WP-Total observed: 205 pages."],
  ["WordPress media REST", "https://www.everytip.co.uk/wp-json/wp/v2/media?per_page=1", checkedDate, "Counts and export", "X-WP-Total observed: 1,934 media items."],
  ["WordPress categories REST", "https://www.everytip.co.uk/wp-json/wp/v2/categories?per_page=100", checkedDate, "Taxonomy", "Seeded category counts and index/noindex states."],
  ["Astro WordPress migration docs", "https://docs.astro.build/en/guides/migrate-to-astro/from-wordpress/", checkedDate, "Platform guidance", "Astro notes WordPress content can move to files or remain headless."],
  ["Astro content collections docs", "https://docs.astro.build/en/guides/content-collections/", checkedDate, "Architecture", "Use structured collections for posts, pages, authors, bookmakers, and category metadata."],
  ["Astro routing docs", "https://docs.astro.build/en/guides/routing/", checkedDate, "Routing", "Astro file-based and dynamic routes shape the migration route plan."],
  ["Astro image docs", "https://docs.astro.build/en/guides/images/", checkedDate, "Assets", "Local src images can be optimized; public assets are served as-is; remote sources should be authorized."],
  ["Astro redirects config", "https://docs.astro.build/en/reference/configuration-reference/#redirects", checkedDate, "Redirects", "Configured redirects map explicit old to new routes; trailing slash policy belongs at host level."],
];

const pillarRows = [
  ["Pillar ID", "Pillar", "Primary Hub URL", "Index State", "Commercial Role", "Target Intent", "Required Clusters", "Seed Clusters", "Gap Count", "Internal Link Target", "Priority", "Status", "Owner", "Notes", "Source"],
  ["P01", "Horse racing tips", "https://www.everytip.co.uk/racing-tips", "index", "Editorial and commercial", "Daily racing predictions, tipsters, race types, and racecourses", 18, 9, { f: "G2-H2" }, "/racing-tips", "P0", "In Progress", "SEO", "Core authority area. Includes daily tips, NAP, ITV Racing, Lucky 15, racecourse guides.", "REST category 14"],
  ["P02", "Football betting tips", "https://www.everytip.co.uk/sports-tips", "noindex/follow now", "Editorial", "Football predictions and market-specific tips", 12, 6, { f: "G3-H3" }, "/football-betting-tips", "P0", "Needs Review", "SEO", "Sports Tips category is noindex despite several football tips pages being indexable.", "REST category 45"],
  ["P03", "Bookmaker reviews", "https://www.everytip.co.uk/bookmaker-reviews", "index", "Commercial", "Review and compare bookmakers", 25, 10, { f: "G4-H4" }, "/bookmaker-reviews", "P0", "In Progress", "Affiliate", "Canonical consolidation needed for duplicate review variants.", "REST category 46"],
  ["P04", "Free bets and offers", "https://www.everytip.co.uk/bookie-free-bets-bonus-offers", "index", "Commercial", "Find current free bet and sign-up offers", 20, 7, { f: "G5-H5" }, "/bookie-free-bets-bonus-offers", "P0", "In Progress", "Affiliate", "Bridge pages should remain noindex unless strategy changes.", "REST pages"],
  ["P05", "Betting guides and bet types", "https://www.everytip.co.uk/betting-guides", "index", "Editorial and assistive commercial", "Explain bet types, strategies, tools, and mechanics", 20, 8, { f: "G6-H6" }, "/betting-guides", "P1", "In Progress", "SEO", "Good hub candidate for glossary and how-to content.", "REST category 52"],
  ["P06", "Racecourse betting guides", "https://www.everytip.co.uk/racecourses/", "index target", "Editorial", "Racecourse-specific betting information", 60, 13, { f: "G7-H7" }, "/racecourses/", "P1", "Needs Review", "Content", "Some pages sit under /racecourses/ while others are root-level racing tips.", "REST pages sample"],
  ["P07", "Sports betting by sport", "https://www.everytip.co.uk/sports-tips", "noindex/follow now", "Editorial and commercial", "Best sites and tips for cricket, rugby, golf, greyhounds, and other sports", 16, 5, { f: "G8-H8" }, "/sports-betting", "P1", "Needs Review", "SEO", "Decide whether to split football from broader sports.", "REST category 45"],
  ["P08", "Betfair exchange and profits", "https://www.everytip.co.uk/betfair-profits", "index", "Commercial and educational", "Betfair exchange tutorials and profit strategy", 10, 4, { f: "G9-H9" }, "/betfair-profits", "P2", "Planned", "Content", "Small existing category, likely a compact hub and guide set.", "REST category 43"],
  ["P09", "News and event-led betting", "https://www.everytip.co.uk/news", "index", "Editorial", "Current betting news and event previews", 10, 5, { f: "G10-H10" }, "/news", "P2", "Planned", "Editorial", "Separate evergreen SCN links from perishable event coverage.", "REST category 10"],
];

const clusterRows = [
  ["Cluster ID", "Pillar ID", "Cluster", "Current/Target URL", "Source Type", "Existing Page?", "Index State", "Search Intent", "Funnel Stage", "Content Action", "Priority Score", "Owner", "Status", "Notes", "Source URL"],
  ["C001", "P01", "Free horse racing tips", "https://www.everytip.co.uk/free-horse-racing-tips", "Evergreen page", "Yes", "index", "Daily tips", "Awareness", "Improve", { f: "IF(J2=\"Improve\",90,60)" }, "SEO", "In Progress", "High-value evergreen racing entry point.", "https://www.everytip.co.uk/free-horse-racing-tips"],
  ["C002", "P01", "NAP of the day", "https://www.everytip.co.uk/nap-of-the-day.html", "Daily post/page", "Yes", "index", "Daily racing selection", "Awareness", "Keep", { f: "IF(J3=\"Keep\",85,60)" }, "Editorial", "Live", "Preserve .html if canonical.", "https://www.everytip.co.uk/nap-of-the-day.html"],
  ["C003", "P01", "ITV Racing tips", "https://www.everytip.co.uk/itv-racing-tips.html", "Daily guide", "Yes", "index", "TV racing selections", "Awareness", "Keep", { f: "IF(J4=\"Keep\",80,60)" }, "Editorial", "Live", "Strong recurring intent.", "https://www.everytip.co.uk/itv-racing-tips.html"],
  ["C004", "P01", "Lucky 15 tips", "https://www.everytip.co.uk/lucky-15-tips.html", "Bet type/racing", "Yes", "index", "Racing multiples", "Consideration", "Keep", { f: "IF(J5=\"Keep\",78,60)" }, "Editorial", "Live", "Should link to Lucky 15 bookie guide.", "https://www.everytip.co.uk/lucky-15-tips.html"],
  ["C005", "P02", "Both teams to score tips", "https://www.everytip.co.uk/both-teams-to-score-btts-tips.html", "Football market", "Yes", "index", "BTTS predictions", "Awareness", "Improve", { f: "IF(J6=\"Improve\",82,60)" }, "SEO", "In Progress", "Needs hub links to football betting tips.", "https://www.everytip.co.uk/both-teams-to-score-btts-tips.html"],
  ["C006", "P02", "Over 2.5 goals tips", "https://www.everytip.co.uk/over-2-5-goals-tips.html", "Football market", "Yes", "index", "Goals market predictions", "Awareness", "Improve", { f: "IF(J7=\"Improve\",82,60)" }, "SEO", "In Progress", "Market-specific page.", "https://www.everytip.co.uk/over-2-5-goals-tips.html"],
  ["C007", "P03", "Bet365 review", "https://www.everytip.co.uk/bet365-review-redesign", "Bookmaker review", "Yes", "index", "Bookmaker review", "Conversion", "Consolidate", { f: "IF(J8=\"Consolidate\",95,70)" }, "Affiliate", "Needs Review", "Resolve bet365 review variants before migration.", "https://www.everytip.co.uk/bet365-review-redesign"],
  ["C008", "P03", "Betfred review", "https://www.everytip.co.uk/betfred-review", "Bookmaker review", "Yes", "index", "Bookmaker review", "Conversion", "Keep", { f: "IF(J9=\"Keep\",88,65)" }, "Affiliate", "Live", "Preserve current review URL.", "https://www.everytip.co.uk/betfred-review"],
  ["C009", "P04", "Best free bets and bonus offers", "https://www.everytip.co.uk/bookie-free-bets-bonus-offers", "Offer hub", "Yes", "index", "Free bets comparison", "Conversion", "Improve", { f: "IF(J10=\"Improve\",92,70)" }, "Affiliate", "In Progress", "Primary commercial hub.", "https://www.everytip.co.uk/bookie-free-bets-bonus-offers"],
  ["C010", "P04", "Bet365 sign up offer", "https://www.everytip.co.uk/bet365-sign-up-offer", "Bridge page", "Yes", "noindex/follow", "Offer bridge", "Conversion", "Keep Noindex", { f: "IF(G11=\"noindex/follow\",70,50)" }, "Affiliate", "Live", "Bridge page, keep controlled CTA attributes.", "https://www.everytip.co.uk/bet365-sign-up-offer"],
  ["C011", "P05", "ACCA insurance explained", "https://www.everytip.co.uk/acca-insurance", "Guide", "Yes", "index", "Betting concept", "Consideration", "Keep", { f: "IF(J12=\"Keep\",74,60)" }, "Content", "Live", "Support guides hub and bookmaker offer links.", "https://www.everytip.co.uk/acca-insurance"],
  ["C012", "P06", "Cheltenham racing tips", "https://www.everytip.co.uk/cheltenham-racing-tips", "Racecourse guide", "Yes", "index", "Racecourse betting", "Consideration", "Keep", { f: "IF(J13=\"Keep\",76,60)" }, "Content", "Live", "May need standard racecourse route policy.", "https://www.everytip.co.uk/cheltenham-racing-tips"],
  ["C013", "P06", "Chester racing tips", "https://www.everytip.co.uk/racecourses/chester-racing-tips", "Racecourse guide", "Yes", "index", "Racecourse betting", "Consideration", "Keep", { f: "IF(J14=\"Keep\",74,60)" }, "Content", "Live", "Already under /racecourses/.", "https://www.everytip.co.uk/racecourses/chester-racing-tips"],
  ["C014", "P07", "Cricket betting tips", "https://www.everytip.co.uk/cricket-betting-tips.html", "Sports tips", "Yes", "index", "Cricket predictions", "Awareness", "Keep", { f: "IF(J15=\"Keep\",76,60)" }, "Editorial", "Live", "Links to cricket betting sites page.", "https://www.everytip.co.uk/cricket-betting-tips.html"],
  ["C015", "P08", "Betfair profits hub", "https://www.everytip.co.uk/betfair-profits", "Category hub", "Yes", "index", "Exchange strategy", "Consideration", "Improve", { f: "IF(J16=\"Improve\",72,55)" }, "Content", "Planned", "Refresh hub intro and internal links.", "https://www.everytip.co.uk/betfair-profits"],
  ["C016", "P09", "World Cup 2026 betting tips", "https://www.everytip.co.uk/world-cup-2026-betting-tips.html", "Event guide", "Yes", "index", "Event predictions", "Awareness", "Keep", { f: "IF(J17=\"Keep\",70,50)" }, "Editorial", "Live", "Event-led content; define post-event expiry action.", "https://www.everytip.co.uk/world-cup-2026-betting-tips.html"],
];

const inventoryRows = [
  ["URL ID", "Legacy URL", "Current Type", "WP ID", "Title", "Pillar/Category", "Robots", "Current Canonical", "Migration Action", "Astro Collection", "Proposed Astro Route", "Priority", "Status", "Source"],
  ["U001", "https://www.everytip.co.uk/racing-tips", "Category", "14", "Racing Tips", "Horse racing tips", "index", "https://www.everytip.co.uk/racing-tips", "Improve", "categories", "/racing-tips", "P0", "Needs content audit", "REST category"],
  ["U002", "https://www.everytip.co.uk/betting-guides", "Category", "52", "Betting Guides", "Betting guides", "index", "https://www.everytip.co.uk/betting-guides", "Improve", "categories", "/betting-guides", "P1", "Needs content audit", "REST category"],
  ["U003", "https://www.everytip.co.uk/bookmaker-reviews", "Category", "46", "Bookmaker Reviews", "Bookmaker reviews", "index", "https://www.everytip.co.uk/bookmaker-reviews", "Improve", "categories", "/bookmaker-reviews", "P0", "Needs content audit", "REST category"],
  ["U004", "https://www.everytip.co.uk/betfair-profits", "Category", "43", "Betfair Profits", "Betfair exchange", "index", "https://www.everytip.co.uk/betfair-profits", "Improve", "categories", "/betfair-profits", "P2", "Needs content audit", "REST category"],
  ["U005", "https://www.everytip.co.uk/news", "Category", "10", "News", "News", "index", "https://www.everytip.co.uk/news", "Keep", "categories", "/news", "P2", "Needs crawl", "REST category"],
  ["U006", "https://www.everytip.co.uk/sports-tips", "Category", "45", "Sports Tips", "Sports betting", "noindex/follow", "https://www.everytip.co.uk/sports-tips", "Noindex", "categories", "/sports-tips", "P1", "Needs SEO decision", "REST category"],
  ["U007", "https://www.everytip.co.uk/seymour-biz", "Category", "48", "Seymour Biz", "Column archive", "noindex/follow", "https://www.everytip.co.uk/seymour-biz-horse-racing-tips", "Noindex", "authors", "/seymour-biz", "P2", "Needs author policy", "REST category"],
  ["U008", "https://www.everytip.co.uk/john-newsome", "Category", "49", "John Newsome", "Column archive", "noindex/follow", "https://www.everytip.co.uk/john-newsome", "Noindex", "authors", "/john-newsome", "P2", "Needs author policy", "REST category"],
  ["U009", "https://www.everytip.co.uk/bet365-review-redesign", "Page", "89169", "Bet365 Review 2026", "Bookmaker reviews", "index", "https://www.everytip.co.uk/bet365-review-redesign", "Consolidate", "pages", "/bet365-review", "P0", "Needs canonical decision", "REST pages"],
  ["U010", "https://www.everytip.co.uk/bet365-review", "Page", "87553", "bet365 review PPC", "Bookmaker reviews", "index", "https://www.everytip.co.uk/bet365-review", "Consolidate", "pages", "/bet365-review", "P0", "Needs canonical decision", "REST pages"],
  ["U011", "https://www.everytip.co.uk/bet365-review-old", "Page", "43135", "Bet365 Review 2026", "Bookmaker reviews", "index", "https://www.everytip.co.uk/bet365-review-old", "Redirect", "pages", "/bet365-review", "P0", "Needs canonical decision", "REST pages"],
  ["U012", "https://www.everytip.co.uk/betfred-review", "Page", "42466", "Betfred Review 2026", "Bookmaker reviews", "index", "https://www.everytip.co.uk/betfred-review", "Keep", "pages", "/betfred-review", "P0", "Ready for content export", "REST pages"],
  ["U013", "https://www.everytip.co.uk/bookie-free-bets-bonus-offers", "Page", "56315", "Best Bookie New Customer Free Bets and Bonus Offers For 2026", "Offers", "index", "https://www.everytip.co.uk/bookie-free-bets-bonus-offers", "Improve", "pages", "/bookie-free-bets-bonus-offers", "P0", "Needs offer audit", "REST pages"],
  ["U014", "https://www.everytip.co.uk/bet365-sign-up-offer", "Page", "88965", "bet365 sign up offer", "Offer bridge", "noindex/follow", "https://www.everytip.co.uk/bet365-sign-up-offer", "Keep", "pages", "/bet365-sign-up-offer", "P1", "Bridge template", "REST pages"],
  ["U015", "https://www.everytip.co.uk/betfred-sign-up-offer", "Page", "88994", "Betfred Sign Up Offer", "Offer bridge", "noindex/follow", "https://www.everytip.co.uk/betfred-sign-up-offer", "Keep", "pages", "/betfred-sign-up-offer", "P1", "Bridge template", "REST pages"],
  ["U016", "https://www.everytip.co.uk/nap-of-the-day.html", "Post", "44981", "NAP of the Day Horse Racing", "Horse racing tips", "index", "https://www.everytip.co.uk/nap-of-the-day.html", "Keep", "posts", "/nap-of-the-day.html", "P0", "Preserve .html", "REST posts"],
  ["U017", "https://www.everytip.co.uk/both-teams-to-score-btts-tips.html", "Post", "51334", "Both Teams To Score BTTS Tips", "Football betting tips", "index", "https://www.everytip.co.uk/both-teams-to-score-btts-tips.html", "Improve", "posts", "/both-teams-to-score-btts-tips.html", "P0", "Needs hub links", "REST posts"],
  ["U018", "https://www.everytip.co.uk/cricket-betting-tips.html", "Post", "944", "Cricket Betting Tips", "Sports betting", "index", "https://www.everytip.co.uk/cricket-betting-tips.html", "Keep", "posts", "/cricket-betting-tips.html", "P1", "Needs template QA", "REST posts"],
  ["U019", "https://www.everytip.co.uk/racecourses/chester-racing-tips", "Page", "45714", "Chester Racing Tips", "Racecourse guides", "index", "https://www.everytip.co.uk/racecourses/chester-racing-tips", "Keep", "racecourses", "/racecourses/chester-racing-tips", "P1", "Preserve route", "REST pages"],
  ["U020", "https://www.everytip.co.uk/cheltenham-racing-tips", "Page", "73041", "Cheltenham Racing Tips", "Racecourse guides", "index", "https://www.everytip.co.uk/cheltenham-racing-tips", "Keep", "racecourses", "/cheltenham-racing-tips", "P1", "Review route policy", "REST pages"],
];

const redirectRows = [
  ["Old URL", "New URL", "Status Code", "Type", "Reason", "Owner", "QA Status", "Notes"],
  ["https://www.everytip.co.uk/bet365-review-old", "https://www.everytip.co.uk/bet365-review", 301, "Canonical consolidation", "Duplicate Bet365 review variant", "SEO", "Pending", "Confirm canonical target before launch."],
  ["https://www.everytip.co.uk/bet365-review-redesign", "https://www.everytip.co.uk/bet365-review", 301, "Canonical consolidation", "Duplicate Bet365 review variant", "SEO", "Pending", "Only redirect if PPC/redesign page is not final canonical."],
  ["https://www.everytip.co.uk/seymour-biz-horse-racing-tips", "https://www.everytip.co.uk/seymour-biz", 301, "Canonical cleanup", "Yoast OG URL differs from category link", "SEO", "Pending", "Verify live canonical and inbound links."],
  ["https://www.everytip.co.uk/sitemap_index.xml", "https://www.everytip.co.uk/sitemap.xml", 301, "Sitemap alias", "Robots references alternate sitemap index", "Engineering", "Pending", "Only if both endpoints are live equivalents."],
  ["https://www.everytip.co.uk/bet365-world-cup-offer", "https://www.everytip.co.uk/bet365-world-cup-offer", 200, "Keep noindex", "Bridge page should remain controlled", "Affiliate", "Pending", "No redirect unless campaign expires."],
  ["https://www.everytip.co.uk/football-world-cup-offer", "https://www.everytip.co.uk/football-world-cup-offer", 200, "Keep noindex", "Offer bridge/page", "Affiliate", "Pending", "Review after World Cup campaign."],
];

const internalLinkRows = [
  ["Source Pillar", "Source URL", "Target URL", "Anchor", "Purpose", "Status", "Notes"],
  ["Horse racing tips", "https://www.everytip.co.uk/free-horse-racing-tips", "https://www.everytip.co.uk/racing-tips", "racing tips", "Hub reinforcement", "Planned", "Contextual link near intro and related guides."],
  ["Horse racing tips", "https://www.everytip.co.uk/nap-of-the-day.html", "https://www.everytip.co.uk/free-horse-racing-tips", "free horse racing tips", "Cluster to hub", "Planned", "Avoid repeated exact anchor site-wide."],
  ["Horse racing tips", "https://www.everytip.co.uk/lucky-15-tips.html", "https://www.everytip.co.uk/best-bookie-for-lucky-15-bets-uk-ireland", "best bookie for Lucky 15 bets", "Commercial support", "Planned", "Connect tip intent to bookmaker comparison."],
  ["Football betting tips", "https://www.everytip.co.uk/both-teams-to-score-btts-tips.html", "https://www.everytip.co.uk/over-2-5-goals-tips.html", "over 2.5 goals tips", "Sibling cluster", "Planned", "Use only when editorially relevant."],
  ["Bookmaker reviews", "https://www.everytip.co.uk/betfred-review", "https://www.everytip.co.uk/bookmaker-reviews", "bookmaker reviews", "Hub reinforcement", "Planned", "Review template should include category breadcrumb."],
  ["Offers", "https://www.everytip.co.uk/bookie-free-bets-bonus-offers", "https://www.everytip.co.uk/bet365-sign-up-offer", "bet365 sign up offer", "Conversion path", "Planned", "Bridge page remains noindex/follow."],
  ["Racecourse guides", "https://www.everytip.co.uk/racecourses/chester-racing-tips", "https://www.everytip.co.uk/racing-tips", "today's racing tips", "Authority loop", "Planned", "Template-level related links."],
  ["Sports betting", "https://www.everytip.co.uk/cricket-betting-tips.html", "https://www.everytip.co.uk/top-cricket-betting-sites", "best cricket betting sites", "Commercial support", "Planned", "Link from tips to comparison page."],
];

const templateRows = [
  ["Page Type", "Astro Template", "Collection", "Robots Default", "Sitemap", "Schema Types", "Key Components", "QA Checks"],
  ["Homepage", "src/pages/index.astro", "site", "index,follow", "Yes", "WebSite, Organization", "Hero, latest tips, hubs, bookmaker modules", "Title, canonical, schema, internal links, performance"],
  ["Article/tip", "src/pages/[...slug].astro", "posts", "index,follow", "Yes if indexable", "Article, BreadcrumbList", "Article layout, author, related links, CTA slot", "Legacy .html URL, meta, body parity, schema"],
  ["Evergreen page", "src/pages/[...slug].astro", "pages", "index,follow", "Yes if indexable", "Article, BreadcrumbList", "MDX components, FAQ, pros/cons", "Meta, canonical, links, components"],
  ["Category hub", "src/pages/[category].astro", "categories", "Matches workbook", "Only if index", "CollectionPage, ItemList, BreadcrumbList", "Intro copy, cluster cards, latest posts", "Index state, sitemap inclusion, pagination"],
  ["Bookmaker review", "src/pages/[bookmaker]-review.astro", "pages/bookmakers", "index,follow", "Yes", "Review, Organization, BreadcrumbList", "Rating, offer box, pros/cons, reviewer", "Offer compliance, schema visible facts, CTA rel"],
  ["Offer bridge", "src/pages/[bookmaker]-sign-up-offer.astro", "pages/bookmakers", "noindex,follow", "No", "WebPage, BreadcrumbList", "Bridge copy, CTA, responsible gambling", "Robots noindex, CTA rel, no sitemap"],
  ["Author/column archive", "src/pages/[author].astro", "authors", "noindex,follow unless approved", "No by default", "ProfilePage, Person", "Bio, latest articles", "Robots, pagination, canonical"],
  ["Racecourse guide", "src/pages/racecourses/[slug].astro", "racecourses", "index,follow", "Yes", "Article or Place, BreadcrumbList", "Guide content, tips links, bookmaker CTA", "Route policy, schema, related racecourses"],
];

const backlogRows = [
  ["Phase", "Task", "Owner", "Priority", "Status", "Dependency", "Acceptance Criteria"],
  ["Inventory", "Full sitemap crawl and status capture", "Engineering", "P0", "Not Started", "None", "All sitemap URLs captured with status, canonical, robots, title, description."],
  ["Inventory", "REST export for posts, pages, categories, media, users", "Engineering", "P0", "Not Started", "None", "Raw JSON export saved and repeatable."],
  ["Inventory", "Populate full URL Inventory sheet", "SEO", "P0", "In Progress", "Crawl export", "Every URL has action, route, owner, and status."],
  ["SEO", "Approve canonical review URL decisions", "SEO", "P0", "Not Started", "URL inventory", "Bet365 and other duplicate reviews have one canonical destination."],
  ["Architecture", "Scaffold Astro project and content schemas", "Engineering", "P0", "Not Started", "Route policy", "Build passes with typed collections."],
  ["Architecture", "Build SEO component", "Engineering", "P0", "Not Started", "Schema model", "Templates render title, description, canonical, robots, OG, schema."],
  ["Content", "Convert high-priority pages to MDX", "Content", "P0", "Not Started", "Exporter", "P0 pages render in Astro with component parity."],
  ["Affiliate", "Create bookmaker and affiliate link registry", "Affiliate", "P0", "Not Started", "Compliance policy", "All CTAs use registry and rel attributes."],
  ["QA", "Build redirect validation script", "Engineering", "P0", "Not Started", "Redirect map", "No chains, no unexpected 404s on sampled URLs."],
  ["Launch", "Run staging crawl and structured data QA", "SEO", "P0", "Not Started", "Staging deployment", "Launch checklist passes."],
];

const qaRows = [
  ["QA Area", "Check", "Target", "Method", "Owner", "Status", "Evidence/Notes"],
  ["Redirects", "Legacy URL resolves or redirects correctly", "All indexable legacy URLs", "Crawler plus redirect map", "SEO", "Not Started", "Verify 200 or one-hop 301."],
  ["Metadata", "Title and description preserved or intentionally improved", "P0/P1 pages", "Rendered HTML diff", "SEO", "Not Started", "Record intentional changes."],
  ["Robots", "No unintended noindex", "All indexable templates", "Rendered HTML crawl", "SEO", "Not Started", "Noindex pages excluded from sitemap."],
  ["Schema", "Structured data matches visible content", "Representative templates", "Schema validator and code review", "SEO", "Not Started", "No invisible ratings or FAQs."],
  ["Links", "Affiliate CTAs use sponsored/nofollow", "Bookmaker/offer templates", "DOM assertion", "Affiliate", "Not Started", "Check /go/ policy."],
  ["Performance", "Core templates hit target performance", "Mobile P0 templates", "Lighthouse and field monitoring", "Engineering", "Not Started", "Target mobile Performance 90+."],
  ["Content", "High-risk pages reviewed by owner", "P0 commercial pages", "Editorial checklist", "Content", "Not Started", "Add last reviewed date."],
  ["Sitemap", "Only indexable canonicals included", "XML sitemap", "Generated XML crawl", "Engineering", "Not Started", "No noindex bridge pages."],
];

const dashboardRows = [
  ["EveryTip SCN / Topical Authority Workbook", "", "", "", "", "", "", ""],
  ["Metric", "Value", "Formula / Source", "Owner", "Status", "", "", ""],
  ["Seed URL inventory rows", { f: "COUNTA('URL Inventory'!B2:B200)" }, "URL Inventory", "SEO", "Live", "", "", ""],
  ["Indexable inventory rows", { f: "COUNTIF('URL Inventory'!G2:G200,\"index\")" }, "URL Inventory", "SEO", "Live", "", "", ""],
  ["Noindex/follow rows", { f: "COUNTIF('URL Inventory'!G2:G200,\"noindex*\")" }, "URL Inventory", "SEO", "Live", "", "", ""],
  ["Keep actions", { f: "COUNTIF('URL Inventory'!I2:I200,\"Keep\")" }, "URL Inventory", "SEO", "Live", "", "", ""],
  ["Improve actions", { f: "COUNTIF('URL Inventory'!I2:I200,\"Improve\")" }, "URL Inventory", "SEO", "Live", "", "", ""],
  ["Consolidate actions", { f: "COUNTIF('URL Inventory'!I2:I200,\"Consolidate\")" }, "URL Inventory", "SEO", "Live", "", "", ""],
  ["Redirect QA completion", { f: "IFERROR(COUNTIF('Redirect Map'!G2:G200,\"Verified\")/COUNTA('Redirect Map'!A2:A200),0)", s: 8 }, "Redirect Map", "Engineering", "Pending", "", "", ""],
  ["Backlog completion", { f: "IFERROR(COUNTIF(Backlog!E2:E200,\"Done\")/COUNTA(Backlog!B2:B200),0)", s: 8 }, "Backlog", "PM", "Pending", "", "", ""],
  ["Live cluster coverage", { f: "IFERROR(COUNTIF(Clusters!M2:M300,\"Live\")/COUNTA(Clusters!B2:B300),0)", s: 8 }, "Clusters", "SEO", "Pending", "", "", ""],
  ["Total pillar gap count", { f: "SUM(Pillars!I2:I20)" }, "Pillars", "SEO", "Live", "", "", ""],
  ["Seed internal link rows", { f: "COUNTA('Internal Links'!A2:A300)" }, "Internal Links", "SEO", "Live", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["Current live footprint", "Observed count", "Source", "Notes", "", "", "", ""],
  ["Posts", 962, "REST header X-WP-Total", "Observed 2026-07-10", "", "", "", ""],
  ["Pages", 205, "REST header X-WP-Total", "Observed 2026-07-10", "", "", "", ""],
  ["Media", 1934, "REST header X-WP-Total", "Observed 2026-07-10", "", "", "", ""],
  ["Categories", 8, "REST categories endpoint", "Seed rows only; tags not yet exported", "", "", "", ""],
];

const sheets = [
  { name: "Dashboard", rows: dashboardRows, widths: [36, 18, 34, 18, 18, 12, 12, 12], merges: ["A1:H1"], autoFilter: "A2:E13", validations: [] },
  { name: "Sources", rows: sourceRows, widths: [30, 70, 14, 22, 70], autoFilter: "A1:E12", validations: [] },
  { name: "Pillars", rows: pillarRows, widths: [12, 28, 52, 18, 24, 48, 16, 15, 12, 24, 12, 18, 16, 62, 22], autoFilter: "A1:O10", validations: [{ sqref: "K2:K50", values: ["P0", "P1", "P2", "P3"] }, { sqref: "L2:L50", values: ["Not Started", "Planned", "In Progress", "Needs Review", "Live", "Deferred"] }] },
  { name: "Clusters", rows: clusterRows, widths: [12, 11, 34, 58, 20, 14, 18, 28, 16, 18, 16, 16, 18, 58, 58], autoFilter: "A1:O17", validations: [{ sqref: "J2:J300", values: ["Keep", "Improve", "Consolidate", "Redirect", "Keep Noindex", "Create", "Remove"] }, { sqref: "M2:M300", values: ["Not Started", "Planned", "In Progress", "Needs Review", "Live", "Deferred"] }] },
  { name: "URL Inventory", rows: inventoryRows, widths: [10, 62, 16, 10, 45, 24, 18, 62, 18, 18, 36, 10, 24, 18], autoFilter: "A1:N21", validations: [{ sqref: "I2:I500", values: ["Keep", "Improve", "Consolidate", "Redirect", "Noindex", "Remove", "Hold"] }, { sqref: "L2:L500", values: ["P0", "P1", "P2", "P3"] }] },
  { name: "Redirect Map", rows: redirectRows, widths: [62, 62, 12, 24, 38, 16, 18, 62], autoFilter: "A1:H7", validations: [{ sqref: "C2:C500", values: ["200", "301", "302", "410"] }, { sqref: "G2:G500", values: ["Not Started", "Pending", "Verified", "Failed"] }] },
  { name: "Internal Links", rows: internalLinkRows, widths: [24, 62, 62, 30, 24, 18, 58], autoFilter: "A1:G9", validations: [{ sqref: "F2:F300", values: ["Not Started", "Planned", "Placed", "Verified", "Removed"] }] },
  { name: "Templates Schema", rows: templateRows, widths: [24, 36, 22, 24, 16, 34, 50, 58], autoFilter: "A1:H9", validations: [] },
  { name: "Backlog", rows: backlogRows, widths: [18, 44, 18, 12, 18, 24, 70], autoFilter: "A1:G11", validations: [{ sqref: "D2:D300", values: ["P0", "P1", "P2", "P3"] }, { sqref: "E2:E300", values: ["Not Started", "In Progress", "Blocked", "Done", "Deferred"] }] },
  { name: "QA", rows: qaRows, widths: [20, 48, 30, 36, 18, 18, 62], autoFilter: "A1:G9", validations: [{ sqref: "F2:F300", values: ["Not Started", "In Progress", "Passed", "Failed", "Waived"] }] },
];

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function colName(index) {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function cellXml(value, rowIndex, colIndex, defaultStyle = 0) {
  const ref = `${colName(colIndex)}${rowIndex + 1}`;
  const cell = typeof value === "object" && value !== null && !Array.isArray(value) ? value : { v: value };
  const style = cell.s ?? defaultStyle;
  const styleAttr = style ? ` s="${style}"` : "";

  if (cell.f) {
    const formula = xmlEscape(cell.f);
    return `<c r="${ref}"${styleAttr}><f>${formula}</f></c>`;
  }

  if (cell.v === null || cell.v === undefined || cell.v === "") {
    return `<c r="${ref}"${styleAttr}/>`;
  }

  if (typeof cell.v === "number") {
    return `<c r="${ref}"${styleAttr}><v>${cell.v}</v></c>`;
  }

  return `<c r="${ref}" t="inlineStr"${styleAttr}><is><t>${xmlEscape(cell.v)}</t></is></c>`;
}

function inferStyle(sheetName, rowIndex, colIndex, value) {
  if (sheetName === "Dashboard" && rowIndex === 0) return 1;
  if (sheetName === "Dashboard" && (rowIndex === 1 || rowIndex === 14)) return 2;
  if (rowIndex === 0) return 3;
  if (typeof value === "object" && value !== null && value.s) return value.s;
  if (typeof value === "object" && value !== null && value.f) return 5;
  if (sheetName === "Sources" && colIndex === 1 && rowIndex > 0) return 11;
  if ((sheetName === "URL Inventory" || sheetName === "Redirect Map" || sheetName === "Clusters") && rowIndex > 0) {
    const text = typeof value === "object" && value !== null ? value.v : value;
    if (String(text).includes("noindex")) return 6;
    if (["Keep", "Live", "Verified", "Passed"].includes(String(text))) return 7;
  }
  return 10;
}

function sheetXml(sheet) {
  const maxCols = Math.max(...sheet.rows.map((row) => row.length));
  const dimension = `A1:${colName(maxCols - 1)}${sheet.rows.length}`;
  const cols = sheet.widths
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join("");

  const rows = sheet.rows
    .map((row, rowIndex) => {
      const height = rowIndex === 0 ? 28 : rowIndex === 1 && sheet.name === "Dashboard" ? 22 : 36;
      const cells = Array.from({ length: maxCols }, (_, colIndex) => {
        const value = row[colIndex] ?? "";
        return cellXml(value, rowIndex, colIndex, inferStyle(sheet.name, rowIndex, colIndex, value));
      }).join("");
      return `<row r="${rowIndex + 1}" ht="${height}" customHeight="1">${cells}</row>`;
    })
    .join("");

  const mergeXml = sheet.merges?.length
    ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>`
    : "";

  const autoFilterXml = sheet.autoFilter ? `<autoFilter ref="${sheet.autoFilter}"/>` : "";

  const validations = sheet.validations?.length
    ? `<dataValidations count="${sheet.validations.length}">${sheet.validations
        .map((validation) => `<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="${validation.sqref}"><formula1>&quot;${xmlEscape(validation.values.join(","))}&quot;</formula1></dataValidation>`)
        .join("")}</dataValidations>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="${dimension}"/>
  <sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${cols}</cols>
  <sheetData>${rows}</sheetData>
  ${autoFilterXml}
  ${mergeXml}
  ${validations}
  <pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`;
}

function contentTypesXml() {
  const overrides = sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${overrides}
</Types>`;
}

function rootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function workbookXml() {
  const sheetEntries = sheets.map((sheet, index) => `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <workbookPr date1904="false"/>
  <sheets>${sheetEntries}</sheets>
  <calcPr calcId="0" fullCalcOnLoad="1" forceFullCalc="1"/>
</workbook>`;
}

function workbookRelsXml() {
  const sheetRels = sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRels}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="0.0%"/>
    <numFmt numFmtId="165" formatCode="yyyy-mm-dd"/>
  </numFmts>
  <fonts count="5">
    <font><sz val="10"/><color rgb="FF111827"/><name val="Calibri"/></font>
    <font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FF111827"/><name val="Calibri"/></font>
    <font><u/><sz val="10"/><color rgb="FF1D4ED8"/><name val="Calibri"/></font>
  </fonts>
  <fills count="8">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF123C69"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F766E"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF7CC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE8F2FF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFDE2E2"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE5F4E3"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFD1D5DB"/></left><right style="thin"><color rgb="FFD1D5DB"/></right><top style="thin"><color rgb="FFD1D5DB"/></top><bottom style="thin"><color rgb="FFD1D5DB"/></bottom><diagonal/></border>
    <border><left/><right/><top/><bottom style="medium"><color rgb="FF123C69"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="12">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="7" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="3" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;
}

function coreXml() {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>EveryTip SCN Topical Authority Workbook</dc:title>
  <dc:creator>Codex</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

function appXml() {
  const titles = sheets.map((sheet) => `<vt:lpstr>${xmlEscape(sheet.name)}</vt:lpstr>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex OpenXML Builder</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>${sheets.length}</vt:i4></vt:variant></vt:vector></HeadingPairs>
  <TitlesOfParts><vt:vector size="${sheets.length}" baseType="lpstr">${titles}</vt:vector></TitlesOfParts>
  <Company>EveryTip</Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0300</AppVersion>
</Properties>`;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function createZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { dosTime, dosDate } = dosDateTime();

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, "utf8");
    const data = Buffer.from(entry.content, "utf8");
    const crc = crc32(data);

    const localHeader = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(dosTime),
      u16(dosDate),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBuffer.length),
      u16(0),
      nameBuffer,
    ]);

    localParts.push(localHeader, data);

    const centralHeader = Buffer.concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(dosTime),
      u16(dosDate),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBuffer.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBuffer,
    ]);

    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralDirectory.length),
    u32(offset),
    u16(0),
  ]);

  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}

const entries = [
  { name: "[Content_Types].xml", content: contentTypesXml() },
  { name: "_rels/.rels", content: rootRelsXml() },
  { name: "docProps/core.xml", content: coreXml() },
  { name: "docProps/app.xml", content: appXml() },
  { name: "xl/workbook.xml", content: workbookXml() },
  { name: "xl/_rels/workbook.xml.rels", content: workbookRelsXml() },
  { name: "xl/styles.xml", content: stylesXml() },
  ...sheets.map((sheet, index) => ({ name: `xl/worksheets/sheet${index + 1}.xml`, content: sheetXml(sheet) })),
];

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(outputPath, createZip(entries));
console.log(outputPath);
