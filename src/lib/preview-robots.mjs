/** A preview can never opt into indexing; follow is permitted only explicitly. */
export function resolvePreviewRobots({ previewOnly, publicPage, robots, seoRobots }) {
  if (previewOnly) return robots === 'noindex,follow' ? 'noindex,follow' : 'noindex,nofollow';
  return publicPage ? (seoRobots || 'noindex,follow') : robots;
}
