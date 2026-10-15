// Section 4 launch gate: compare the build's fresh-source receipt with its assets.
import { readFile, writeFile } from 'node:fs/promises';
import { parseDocument } from 'htmlparser2';
import { robotsFor } from '../src/lib/launch-content.mjs';
import { verifiedLegacyRedirects } from '../src/lib/legacy-redirects.mjs';
import { workerArchiveRedirects } from '../src/lib/archive-redirects.mjs';
const source = JSON.parse(await readFile('outputs/launch-source.json', 'utf8'));
const origin = process.argv.find(arg=>arg.startsWith('--origin='))?.slice('--origin='.length);
const sitemap = origin ? await (await fetch(new URL('/sitemap.xml',origin))).text() : await readFile('dist/sitemap.xml', 'utf8');
const failures = [];
const tierAIds = new Set(JSON.parse(await readFile('data/builder-tiers.json', 'utf8')).records.filter(r => r.tier === 'A').map(r => r.id));
let offerPlacements = 0;
if (process.argv.includes('--fresh') && (source.mode !== 'fresh' || !source.receipts?.length || source.receipts.some(receipt => receipt.cached))) {
  failures.push({ field: 'fresh-source', error: 'Final launch check requires WPGRAPHQL_FRESH=1 and no reused disk pages.' });
}
let checked = 0;
let ninjaTables = 0;
let ninjaRows = 0;
let matchingSourceRedirects = 0;
let stagingQueue=Promise.resolve();
function elements(node, name) {
  return [...(node.name === name ? [node] : []), ...(node.children ?? []).flatMap(child => elements(child, name))];
}
function text(node) { return node?.type === 'text' ? node.data : (node?.children ?? []).map(text).join(''); }
async function inspect(record) {
  const asset = record.uri === '/' ? 'dist/index.html' : `dist${record.uri}${record.uri.endsWith('.html') ? '' : '/index.html'}`;
  let html;
  try {
    if(origin){
      const response=await fetch(new URL(record.uri,origin),{redirect:'manual',signal:AbortSignal.timeout(30000)});
      if(response.status!==200){
        const location=response.headers.get('location');
        await response.body?.cancel();
        if(response.status===301 && verifiedLegacyRedirects.has(record.uri)){
          const check=stagingQueue.then(async()=>{
            const staging=await fetch(new URL(record.uri,source.endpoint),{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(30000)});
            const expected=staging.headers.get('location');
            return staging.status===301 && expected && new URL(expected,source.endpoint).pathname===new URL(location,origin).pathname;
          });
          stagingQueue=check.catch(()=>{});
          if(await check){matchingSourceRedirects++;return;}
        }
        failures.push({path:record.uri,field:'http-status',expected:200,actual:response.status,location});return;
      }
      html=await response.text();
    }else html = await readFile(asset, 'utf8');
  } catch(error) { failures.push({ path: record.uri, field: 'asset', error: origin?error.message:'missing' }); return; }
  checked++;
  if (html.includes('data-everytip-offer-slot')) failures.push({ path: record.uri, field: 'unresolved-offer-slot' });
  const doc = parseDocument(html);
  const sourceOffers = elements(parseDocument(record.content || ''), 'aside').filter(node => node.attribs['data-offer-id']);
  const builtOffers = elements(doc, 'aside').filter(node => node.attribs['data-offer-id']);
  offerPlacements += builtOffers.length;
  if (tierAIds.has(record.databaseId) && !builtOffers.length) failures.push({path:record.uri,field:'missing-tier-a-offers'});
  const offerSignature = nodes => nodes.map(node => ({id:node.attribs['data-offer-id'],text:text(node),ctas:elements(node,'a').map(a => ({path:new URL(a.attribs.href,'https://www.everytip.co.uk').pathname,rel:a.attribs.rel}))}));
  if (JSON.stringify(offerSignature(sourceOffers)) !== JSON.stringify(offerSignature(builtOffers))) failures.push({path:record.uri,field:'central-offer-content'});
  const sourceTables = elements(parseDocument(record.content || ''), 'table').filter(node => /ninja/i.test(JSON.stringify(node.attribs)));
  for (const table of sourceTables) {
    const built = elements(doc, 'table').find(node => node.attribs.id === table.attribs.id);
    const expectedRows = elements(table, 'tr').map(row => text(row).replace(/\s+/g, ' ').trim());
    const actualRows = built ? elements(built, 'tr').map(row => text(row).replace(/\s+/g, ' ').trim()) : [];
    ninjaTables++; ninjaRows += expectedRows.length;
    if (JSON.stringify(expectedRows) !== JSON.stringify(actualRows)) failures.push({path:record.uri,field:'ninja-table-rows',table:table.attribs.id,expected:expectedRows.length,actual:actualRows.length});
  }
  const meta = Object.fromEntries(elements(doc, 'meta').map(node => [node.attribs.name, node.attribs.content]));
  const canonical = elements(doc, 'link').find(node => node.attribs.rel === 'canonical')?.attribs.href ?? '';
  const actual = { title: text(elements(doc, 'title')[0]), description: meta.description ?? '', canonical, robots: meta.robots };
  const expected = { title: record.seo?.title || text(parseDocument(record.title)), description: record.seo?.metaDesc || '', canonical: record.seo?.canonical || '', robots: robotsFor(record) };
  for (const field of Object.keys(expected)) if (actual[field] !== expected[field]) failures.push({ path: record.uri, field, expected: expected[field], actual: actual[field] });
  const sitemapPath = new URL(record.uri, 'https://www.everytip.co.uk').href.replaceAll('&', '&amp;');
  const included = sitemap.includes(`<loc>${sitemapPath}</loc>`);
  const expectedInSitemap = !robotsFor(record).includes('noindex') && !verifiedLegacyRedirects.has(record.uri);
  if (included !== expectedInSitemap) failures.push({ path: record.uri, field: 'sitemap' });
  for (const a of elements(doc, 'a')) if (/\/go\//.test(a.attribs.href ?? '') && !['sponsored','nofollow'].every(rel => (a.attribs.rel ?? '').split(/\s+/).includes(rel))) failures.push({ path: record.uri, field: 'affiliate-rel' });
}
const remaining=[...source.records];
await Promise.all(Array.from({length:origin?5:1},async()=>{while(remaining.length)await inspect(remaining.shift());}));
let redirectsChecked=0;
if(origin){
  const affiliate=JSON.parse(await readFile('data/affiliate-redirects.json','utf8')).redirects;
  const redirects={...affiliate,...Object.fromEntries([...verifiedLegacyRedirects].map(([path,location])=>[path,{status:301,location}])),...workerArchiveRedirects(source.archiveRedirects)};
  for(const[path,expected]of Object.entries(redirects)){
    const response=await fetch(new URL(path,origin),{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(30000)});
    redirectsChecked++;
    const location=new URL(expected.location,origin).href;
    if(response.status!==expected.status||response.headers.get('location')!==location)failures.push({path,field:'redirect',expected,actual:{status:response.status,location:response.headers.get('location')}});
  }
}
const result = { fetchedAt: source.fetchedAt, origin:origin||'local assets', checked, matchingSourceRedirects, redirectsChecked, ninjaTables, ninjaRows, offerPlacements, failures, scope: 'Post/page and discovered archive routes; browser QA is separate.' };
await writeFile(origin?'outputs/launch-network-parity.json':'outputs/launch-parity.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify({ checked, ninjaTables, ninjaRows, offerPlacements, failures: failures.length, firstFailures: failures.slice(0, 10) }));
if (failures.length) process.exitCode = 1;
