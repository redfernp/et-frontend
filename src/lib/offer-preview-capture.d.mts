export type CapturedOfferPreview = {
  capturedAt: string;
  sourceMode: 'dated-capture-preview' | 'fresh-staging-wpgraphql-preview';
  offers: Record<string, { id: number; headline: string; compactTerms: string }>;
};
export function capturedOfferPreview(): Promise<CapturedOfferPreview | null>;
export function parseCapturedOfferPreview(capture: unknown): CapturedOfferPreview;
export function readStagingOfferPreview(options?: { baseUrl?: string; username?: string; password?: string; fetchImpl?: typeof fetch }): Promise<CapturedOfferPreview>;
