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
    +`<div class="rank-logo" style="background:${escape(offer.brandColor)}"><a href="${escape(offer.link)}" rel="sponsored nofollow"><img src="${escape(offer.logo)}" alt="${escape(offer.bookmaker)}" loading="lazy"></a></div>`
    +`<div class="rank-body"><p class="offer-bookmaker">${escape(offer.bookmaker)}</p><h3>${escape(offer.headline)}</h3>${reason?`<p class="rank-reason">${escape(reason)}</p>`:''}<p class="rank-terms">${escape(offer.terms)}</p></div>`
    +`<div class="rank-cta"><a href="${escape(offer.link)}" rel="sponsored nofollow">${escape(offer.buttonText)}</a></div></aside>`;
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

export async function resolveLaunchOffers(records){
  for(const record of records)if(record.content?.includes('data-everytip-offer-slot'))record.content=renderOfferSlots(record.content);
}
