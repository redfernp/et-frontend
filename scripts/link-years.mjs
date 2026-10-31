// Anchor text years on links to commercial pages (reviews, "best" guides, bonus and casino
// pages): "Betfred Review 2025" becomes "Betfred Review 2026". Seasons such as "2025/26" and
// affiliate (/go/) links are left alone. Shared by the pre-launch sync and the staging clean-up.
export const commercialHref = /^(?:https?:\/\/[^/]+)?\/(?!go\/)[^"#?]*(?:-review|best-|bookmakers|betting-sites|bookies|bonus|casino)/i;
export function renewLinkYears(html, year = '2026') {
  return html.replace(/(<a\b[^>]*\bhref="([^"]*)"[^>]*>)([\s\S]*?)(<\/a>)/gi, (whole, open, href, inner, close) => {
    if (!commercialHref.test(href)) return whole;
    // Only text between tags, never attributes.
    return open + inner.replace(/(^|>)([^<]*)/g, (m, lead, text) => lead + text.replace(/\b20(?:2[0-5])\b(?!\s*\/)/g, year)) + close;
  });
}
