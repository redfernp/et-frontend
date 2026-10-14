export function extractFreeTipsEditorial(record: { uri: string; content: string }): {
  html: string;
  headingCount: number;
  sourceNodeCount: number;
};
