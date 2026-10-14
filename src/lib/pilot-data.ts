export type Offer = {
  id: string;
  bookmaker: string;
  headline: string;
  compactTerms: string;
  fullTerms: string;
  type: 'welcome' | 'existing_customer' | 'event';
};

export type RankedEntry = {
  offerId: string;
  bestFor: string;
  verdict: string;
};

export type FeaturedOfferPreview = {
  id: string;
  bookmaker: string;
  headline: string;
  brandColor: string;
  logoUrl: string;
  logoOnLight?: boolean;
};

export type Tip = {
  published: string;
  time: string;
  courseId: string;
  course: string;
  horse: string;
  forecast: string;
  jockey: string;
  trainer: string;
  tissue: string;
};

// Deliberately fictional fixture content. No affiliate URL or live promotion is shipped.
export const offers: Record<string, Offer> = {
  exampleA: {
    id: 'exampleA', bookmaker: 'Example Bookmaker A',
    headline: 'Sample welcome offer', compactTerms: 'Preview only — no active offer.',
    fullTerms: 'This is sample template content. Approved offer terms will be read from one ACF Offer record.',
    type: 'welcome',
  },
  exampleB: {
    id: 'exampleB', bookmaker: 'Example Bookmaker B',
    headline: 'Sample existing-customer offer', compactTerms: 'Preview only — no active offer.',
    fullTerms: 'This is sample template content. Approved offer terms will be read from one ACF Offer record.',
    type: 'existing_customer',
  },
};

export const rankedEntries: RankedEntry[] = [
  { offerId: 'exampleA', bestFor: 'Low opening deposit', verdict: 'Eric can edit this verdict independently of the reusable offer and its terms.' },
  { offerId: 'exampleB', bestFor: 'Existing customers', verdict: 'The guide can rank a different offer while sharing the same card component.' },
];

// Current homepage-ladder roster and display order, captured for visual QA only.
// Approved headline, short/full terms, eligibility and CTA must resolve from ACF
// before this component is connected to any public Astro route.
export const featuredOfferPreview: FeaturedOfferPreview[] = [
  { id: 'betfred', bookmaker: 'Betfred', headline: 'Bet £10 Get £50 in Free Bets', brandColor: '#0f488f', logoUrl: 'https://www.everytip.co.uk/wp-content/uploads/2018/06/betfred-154x40.png' },
  { id: 'quinnbet', bookmaker: 'QuinnBet', headline: 'Get 50% Back In Free Bets Up To £25', brandColor: '#222222', logoUrl: 'https://www.everytip.co.uk/wp-content/uploads/2024/09/quinnbet-logo-328.png' },
  { id: 'spreadex', bookmaker: 'Spreadex Sports', headline: 'Bet £10, Get £60 in Free Bets', brandColor: '#1f1f1f', logoUrl: 'https://www.everytip.co.uk/wp-content/uploads/2024/03/SPX_1_Sports-Primarylogo-WO-11.png' },
  { id: '10bet', bookmaker: '10Bet', headline: 'Up to £50 Welcome Bonus', brandColor: '#0b447f', logoUrl: 'https://www.everytip.co.uk/wp-content/uploads/2019/07/new-10bet-150x40-logo.jpg' },
  { id: 'betway', bookmaker: 'Betway', headline: 'Bet £10, Get £40 in Free Bets', brandColor: '#101010', logoUrl: 'https://www.everytip.co.uk/wp-content/uploads/2018/03/Betway-sport-bets-review.jpg' },
  { id: 'netbet', bookmaker: 'NetBet', headline: 'Bet £10, Get £20 in Free Bets', brandColor: '#677f9a', logoUrl: 'https://www.everytip.co.uk/wp-content/uploads/2018/04/NetBet_Logo-2CRev-48px.png', logoOnLight: true },
  { id: 'betwright', bookmaker: 'BetWright', headline: 'Bangers N’ Cash Rewards — No Wagering', brandColor: '#253745', logoUrl: 'https://www.everytip.co.uk/wp-content/uploads/2025/04/betwright-logo-light-400px.png' },
];

export const tips: Tip[] = [
  { published: '2026-09-30', time: '14:10', courseId: 'kempton', course: 'Kempton (AW)', horse: 'Example Runner A', forecast: '9.00', jockey: 'Example Jockey A', trainer: 'Example Trainer A', tissue: '6.00' },
  { published: '2026-09-30', time: '15:20', courseId: 'york', course: 'York', horse: 'Example Runner B', forecast: '7.00', jockey: 'Example Jockey B', trainer: 'Example Trainer B', tissue: '5.00' },
  { published: '2026-09-29', time: '16:05', courseId: 'kempton', course: 'Kempton (AW)', horse: 'Example Runner C', forecast: '11.00', jockey: 'Example Jockey C', trainer: 'Example Trainer C', tissue: '8.00' },
];

export function tipsForCourse(courseId?: string) {
  return courseId ? tips.filter((tip) => tip.courseId === courseId) : tips;
}
