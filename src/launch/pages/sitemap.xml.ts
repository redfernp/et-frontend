import { launchContent, robotsFor } from '../../lib/launch-content.mjs';
import { verifiedLegacyRedirects } from '../../lib/legacy-redirects.mjs';
const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export async function GET() {
  const records = await launchContent();
  const urls = records.filter(record => !robotsFor(record).includes('noindex') && !verifiedLegacyRedirects.has(record.uri))
    .map(record => `<url><loc>${escape(new URL(record.uri, 'https://www.everytip.co.uk').href)}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'content-type': 'application/xml' } });
}
