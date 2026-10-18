import {splitOfferSlots} from './offer-slots.mjs';
import offerFile from '../data/offers.json' with {type:'json'};

// All offer copy lives in src/data/offers.json (edited by Paul). WordPress only decides
// where an offer appears: in-article offer blocks reference an offer by its id.
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const required=['id','partner','bookmaker','headline','terms','buttonText','link','logo','brandColor','position'];
for(const offer of offerFile.offers){
  const missing=required.filter(key=>offer[key]===undefined||offer[key]==='');
  if(missing.length)throw new Error(`Offer ${offer.id??offer.partner??'?'} in src/data/offers.json is missing: ${missing.join(', ')}`);
  if(!/^\/go\/[a-z0-9-]+$/.test(offer.link))throw new Error(`Offer ${offer.id} link must be a /go/ path, got ${offer.link}`);
}
const active=offerFile.offers.filter(offer=>offer.active!==false).sort((a,b)=>a.position-b.position);
const byId=new Map(active.map(offer=>[offer.id,offer]));

// The shape the offer components use. "lineup": false keeps an offer (e.g. an existing-customer
// promo) out of ladders and the sidebar; it still renders wherever an article places it.
const lineup=active.filter(offer=>offer.lineup!==false).map(offer=>({id:offer.partner,offerId:offer.id,bookmaker:offer.bookmaker,brandColor:offer.brandColor,
  logoUrl:offer.logo,logoOnLight:offer.logoOnLight===true,headline:offer.headline,compactTerms:offer.terms,
  ctaPath:offer.link,ctaLabel:offer.buttonText}));
if(!lineup.length)throw new Error('No active offers in src/data/offers.json');

// Active offers in ladder order, for the homepage ladder, hubs and the sidebar.
export function launchOfferLineup(){return lineup;}

// WordPress stores the block heading attribute HTML-escaped.
const decode=value=>value.replace(/&quot;/g,'"').replace(/&#0?39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
// One offer card: logo on its brand colour, headline, the block's optional one-line reason,
// terms and button. Offer blocks placed one after another become a numbered ranking.
function offerCard(offer,reason,rank){
  return `<aside class="rank-card offer-card" data-offer-id="${offer.id}">${rank?`<span class="rank-number" aria-label="Rank ${rank}">${rank}</span>`:''}`
    +`<div class="rank-logo" style="background:${escape(offer.brandColor)}"><a href="${escape(offer.link)}" rel="nofollow"><img src="${escape(offer.logo)}" alt="${escape(offer.bookmaker)}" loading="lazy"></a></div>`
    +`<div class="rank-body"><p class="offer-bookmaker">${escape(offer.bookmaker)}</p><h3>${escape(offer.headline)}</h3>${reason?`<p class="rank-reason">${escape(reason)}</p>`:''}<p class="rank-terms">${escape(offer.terms)}</p></div>`
    +`<div class="rank-cta"><a href="${escape(offer.link)}" rel="nofollow">${escape(offer.buttonText)}</a></div></aside>`;
}
export function renderOfferSlots(content){
  const pieces=splitOfferSlots(content);
  const isSlot=index=>pieces[index]?.type==='offer-slot';
  const gap=index=>pieces[index]?.type==='html'&&!pieces[index].html.replace(/<\/?(?:p|div|br)[^>]*>|\s/g,'');
  let rank=0;
  return pieces.map((piece,index)=>{
    if(piece.type==='html'){if(!(isSlot(index-1)&&isSlot(index+1)&&gap(index)))rank=0;return piece.html;}
    const offer=byId.get(piece.offerId);
    // A switched-off or removed offer simply disappears from the article.
    if(!offer){console.warn(`Offer ${piece.offerId} is not active; its in-article placement is omitted`);return '';}
    const inRun=(isSlot(index-2)&&gap(index-1))||(isSlot(index+2)&&gap(index+1));
    return offerCard(offer,decode(piece.heading??'').trim(),inRun?++rank:0);
  }).join('');
}

// [everytip_top_offers count="3"] in an article: the current top offers from offers.json as a
// numbered ladder of offer cards, so tip posts never hold offer copy or a plugin table.
const topOffersPattern=/(?:<p>\s*)?\[everytip_top_offers(?:\s+count=[^\d\]]{0,10}(\d+)[^\]]{0,10})?\s*\](?:\s*<\/p>)?/g;
export function renderTopOffers(content){
  // WordPress turns the quotes round count into entities (&#8221;); drop them before matching.
  return content.replace(/\[everytip_top_offers[^\]]*\]/g,marker=>marker.replace(/&#\d+;|&quot;/g,'')).replace(topOffersPattern,(_,count)=>{
    const top=active.filter(offer=>offer.lineup!==false).slice(0,Math.min(Number(count)||3,active.length));
    // Same markup and styles as the homepage/free bets ladder (HomeOfferLadder), top N only.
    const rows=top.map((offer,index)=>`<li class="home-ladder-row" data-offer-id="${offer.id}" style="--ladder-brand:${escape(offer.brandColor)}">`
      +`<span class="home-ladder-rank">${index+1}</span>`
      +`<span class="home-ladder-logo${offer.logoOnLight===true?' logo-on-light':''}"><img src="${escape(offer.logo)}" alt="${escape(offer.bookmaker)}" loading="lazy"></span>`
      +`<div class="home-ladder-copy"><h3>${escape(offer.headline)}</h3><p>${escape(offer.terms)}</p></div>`
      +`<a class="home-ladder-cta" href="${escape(offer.link)}" rel="nofollow">${escape(offer.buttonText)}</a></li>`).join('');
    return `<section class="home-ladder post-ladder" aria-label="Today’s top ${top.length} betting offers"><div class="home-ladder-heading"><div><h2>Today’s Top ${top.length} Betting Offers</h2>`
      +`<p>Our current top picks for new customers · 18+ · T&amp;Cs apply</p></div><span class="home-ladder-badge">Top ${top.length}</span></div>`
      +`<ol class="home-ladder-list">${rows}</ol><p class="home-ladder-foot">Please gamble responsibly · 18+ · BeGambleAware.org</p></section>`;
  });
}
export async function resolveLaunchOffers(records){
  for(const record of records){
    if(record.content?.includes('data-everytip-offer-slot'))record.content=renderOfferSlots(record.content);
    if(record.content?.includes('[everytip_top_offers'))record.content=renderTopOffers(record.content);
  }
}
