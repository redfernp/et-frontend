import { columnArchives } from './column-archives';

export type EditorialEntry = { title: string; category: string; excerpt: string; href: string; date: string };
export type EditorialArchiveData = { slug: string; title: string; eyebrow: string; intro: string; category: string; seoPolicy: 'index' | 'noindex'; entries: EditorialEntry[] };

export const EDITORIAL_ARCHIVE_PAGE_SIZE = 4;

const entries: EditorialEntry[] = [
  { title: 'Best PayPal betting sites', category: 'Betting guide', excerpt: 'Payment methods, fees and offer eligibility in a structured roundup.', href: '/pilot/best-paypal-betting-sites/', date: 'Guide preview' },
  { title: 'Bet365 sportsbook review', category: 'Bookmaker review', excerpt: 'A bookmaker profile with editorial verdict and separately managed offers.', href: '/pilot/bet365-review/', date: 'Review preview' },
  { title: 'Bookmaker free bets and bonus offers', category: 'Free bets', excerpt: 'The colourful offer ladder and the conditions readers should check.', href: '/pilot/bookie-free-bets-bonus-offers/', date: 'Guide preview' },
  { title: 'Bet365 best odds guaranteed, explained', category: 'Betting guide', excerpt: 'How a bookmaker feature differs from a time-limited promotion.', href: '/pilot/bet365-best-odds-guaranteed/', date: 'Explainer preview' },
  { title: 'New betting offers for existing customers', category: 'Offer news', excerpt: 'A flexible index for event-led and ongoing promotions.', href: '/pilot/latest-betting-offers/', date: 'Index preview' },
  { title: 'Football betting tips', category: 'Football', excerpt: 'A sport hub with imported picks, market sections and authored analysis.', href: '/pilot/english-premier-league-betting-tips/', date: 'Hub preview' },
  { title: 'Saturday horse racing tips', category: 'Racing', excerpt: 'Seymour Biz’s weekly column and earlier previews.', href: '/pilot/saturday-horse-racing-tips/', date: 'Archive preview' },
  { title: 'Premier League predictions', category: 'Football', excerpt: 'John Newsome’s weekly previews in an accessible archive.', href: '/pilot/english-premier-league-predictions-for-saturday/', date: 'Archive preview' },
];

export const editorialArchives: Record<string, EditorialArchiveData> = {
  blog: { slug: 'blog', title: 'Latest from EveryTip', eyebrow: 'Editorial archive', intro: 'A design preview of the main article feed: latest stories first, clear categories, useful summaries and pagination. Real published posts will come from WPGraphQL.', category: 'All stories', seoPolicy: 'index', entries },
  'betting-guides': { slug: 'betting-guides', title: 'Betting guides', eyebrow: 'Guide archive', intro: 'Find practical explanations, bookmaker comparisons and sport-specific guides. Editors can update the category introduction in WordPress while entries are queried automatically.', category: 'Guides', seoPolicy: 'index', entries: [entries[0], entries[3], entries[2], entries[1], entries[4], entries[5], entries[6], entries[7]] },
  'author/jnewsome': { slug: 'author/jnewsome', title: 'Articles by John Newsome', eyebrow: 'Author archive', intro: 'An author profile with a paginated post list. This variant must preserve the live author archive’s noindex policy even though the weekly-column landing page has its own design.', category: 'John Newsome', seoPolicy: 'noindex', entries: columnArchives['english-premier-league-predictions-for-saturday'].entries.map((entry) => ({ title: entry.title, category: entry.tag ?? 'Football', excerpt: entry.excerpt, href: entry.href, date: entry.dateLabel })) },
};

export function editorialArchivePagePath(slug: string, page: number) { return page === 1 ? `/pilot/${slug}/` : `/pilot/${slug}/page/${page}/`; }
export function editorialArchivePageCount(data: EditorialArchiveData) { return Math.ceil(data.entries.length / EDITORIAL_ARCHIVE_PAGE_SIZE); }
export function editorialArchiveEntries(data: EditorialArchiveData, page: number) { return data.entries.slice((page - 1) * EDITORIAL_ARCHIVE_PAGE_SIZE, page * EDITORIAL_ARCHIVE_PAGE_SIZE); }
