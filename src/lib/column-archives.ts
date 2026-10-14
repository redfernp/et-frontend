export type ColumnEntry = {
  dateLabel: string;
  title: string;
  href: string;
  excerpt: string;
  tag?: string;
};

export type ColumnArchiveData = {
  slug: string;
  pageTitle: string;
  title: string;
  subtitle: string;
  columnist: string;
  discipline: string;
  accent: string;
  portrait: string;
  intro: string;
  siblingLabel: string;
  siblingHref: string;
  relatedTopic: 'racing' | 'football';
  entries: ColumnEntry[];
};

export const ARCHIVE_PAGE_SIZE = 3;
const root = 'https://www.everytip.co.uk/';

export const columnArchives: Record<string, ColumnArchiveData> = {
  'saturday-horse-racing-tips': {
    slug: 'saturday-horse-racing-tips',
    pageTitle: 'Saturday horse racing tips — Seymour Biz archive pilot',
    title: 'Saturday Horse Racing Tips',
    subtitle: 'Seymour Biz’s Weekend Racing Previews',
    columnist: 'Seymour Biz',
    discipline: 'Horse racing',
    accent: '#f26800',
    portrait: `${root}wp-content/uploads/2025/06/Seymour-Biz-Horse-Racing-Feature-Writer-100x100.png`,
    intro: 'Seymour Biz previews the key Saturday racing every week, from ITV’s major UK meetings to big-field handicaps and festival weekends. Read his latest analysis first, then explore previous columns below.',
    siblingLabel: 'John’s football column',
    siblingHref: '/pilot/english-premier-league-predictions-for-saturday/',
    relatedTopic: 'racing',
    entries: [
      { dateLabel: '26 September 2026', title: 'Saturday’s Horse Racing Preview & Tips – 26th September 2026 – Seymour Biz', href: `${root}saturdays-horse-racing-preview-tips-26th-september-2026-seymour-biz.html`, excerpt: 'Seymour’s latest published Saturday preview, covering the leading televised races and his view of the main contenders.' },
      { dateLabel: '19 September 2026', title: 'Saturday’s Horse Racing Preview & Tips – 19th September 2026 – Seymour Biz', href: `${root}saturdays-horse-racing-preview-tips-19th-september-2026-seymour-biz.html`, excerpt: 'Ayr takes centre stage in this week’s racing preview, with Seymour’s analysis and selections.' },
      { dateLabel: '12 September 2026', title: 'Saturday’s Horse Racing Preview & Tips – 12th September 2026 – Seymour Biz', href: `${root}saturdays-horse-racing-preview-tips-12th-september-2026-seymour-biz.html`, excerpt: 'A look ahead to the autumn racing programme and the Saturday contests worth watching.' },
      { dateLabel: '5 September 2026', title: 'Saturday’s Horse Racing Preview & Tips – 5th September 2026 – Seymour Biz', href: `${root}saturdays-horse-racing-preview-tips-5th-september-2026-seymour-biz.html`, excerpt: 'Seymour’s early-September assessment of the televised meetings and big-field races.' },
      { dateLabel: '29 August 2026', title: 'Saturday’s Horse Racing Preview & Tips – 29th August 2026 – Seymour Biz', href: `${root}saturdays-horse-racing-preview-tips-29th-august-2026-seymour-biz.html`, excerpt: 'The late-summer Saturday racing programme, previewed race by race.' },
      { dateLabel: '22 August 2026', title: 'Saturday’s Horse Racing Preview & Tips – 22nd August 2026 – Seymour Biz', href: `${root}saturdays-horse-racing-preview-tips-22nd-august-2026-seymour-biz.html`, excerpt: 'A weekly racing column covering the standout action and major contenders.' },
    ],
  },
  'english-premier-league-predictions-for-saturday': {
    slug: 'english-premier-league-predictions-for-saturday',
    pageTitle: 'Premier League predictions — John Newsome archive pilot',
    title: 'English Premier League Predictions For Saturday',
    subtitle: 'John Newsome’s Football Correct Score Betting Tips',
    columnist: 'John Newsome',
    discipline: 'Football',
    accent: '#256dae',
    portrait: `${root}wp-content/uploads/2025/06/John-Newsome-Everytip-Football-Feature-Writer-100x100.png`,
    intro: 'John Newsome previews the Premier League’s weekend fixtures with match-by-match analysis and correct-score predictions. His column also covers major football tournaments, so those special previews belong in the same archive.',
    siblingLabel: 'Seymour’s racing column',
    siblingHref: '/pilot/saturday-horse-racing-tips/',
    relatedTopic: 'football',
    entries: [
      { dateLabel: '2026/27 · Game Week 5', title: 'EPL Game Week 5 – 2026/27 Season Premier League Tips – John Newsome', href: `${root}epl-game-week-5-2026-27-season-premier-league-tips-john-newsome.html`, excerpt: 'John’s latest Premier League preview, including the headline fixtures and his correct-score analysis.', tag: 'Premier League' },
      { dateLabel: '2026/27 · Game Week 4', title: 'EPL Game Week 4 – 2026/27 Season Premier League Tips – John Newsome', href: `${root}epl-game-week-4-2026-27-season-premier-league-tips-john-newsome.html`, excerpt: 'The weekend slate includes Liverpool versus Fulham and Manchester United’s next fixture.', tag: 'Premier League' },
      { dateLabel: '2026/27 · Game Week 3', title: 'EPL Game Week 3 – 2026/27 Season Premier League Tips – John Newsome', href: `${root}epl-game-week-3-2026-27-season-premier-league-tips-john-newsome.html`, excerpt: 'John looks across the third week’s fixtures, including Manchester City and Arsenal.', tag: 'Premier League' },
      { dateLabel: '2026/27 · Game Week 2', title: 'EPL Game Week 2 – 2026/27 Season Premier League Tips – John Newsome', href: `${root}epl-game-week-2-2026-27-season-premier-league-tips-john-newsome.html`, excerpt: 'Liverpool versus Nottingham Forest features among the second round of matches.', tag: 'Premier League' },
      { dateLabel: '2026/27 · Game Week 1', title: 'EPL Game Week 1 – 2026/27 Season Premier League Tips – John Newsome', href: `${root}epl-game-week-1-2026-27-season-premier-league-tips-john-newsome.html`, excerpt: 'The opening week of the new Premier League season, previewed by John.', tag: 'Premier League' },
      { dateLabel: 'Summer 2026', title: 'Football World Championship 2026 – Final Preview & Tips', href: `${root}football-world-championship-2026-final-preview-tips.html`, excerpt: 'John’s preview of the final and third-place playoff.', tag: 'Tournament' },
      { dateLabel: 'Summer 2026', title: 'Football World Championship 2026 – Semi-Final Preview & Tips', href: `${root}football-world-championship-2026-semi-final-preview-tips.html`, excerpt: 'The semi-final matches and John’s pre-match analysis.', tag: 'Tournament' },
    ],
  },
};

export function archivePagePath(slug: string, page: number) {
  const base = `/pilot/${slug}/`;
  return page === 1 ? base : `${base}page/${page}/`;
}

export function archivePageCount(archive: ColumnArchiveData) {
  return Math.ceil(archive.entries.length / ARCHIVE_PAGE_SIZE);
}

export function archiveEntriesForPage(archive: ColumnArchiveData, page: number) {
  return archive.entries.slice((page - 1) * ARCHIVE_PAGE_SIZE, page * ARCHIVE_PAGE_SIZE);
}
