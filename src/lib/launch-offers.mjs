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

// The shape the offer components use.
const lineup=active.map(offer=>({id:offer.partner,offerId:offer.id,bookmaker:offer.bookmaker,brandColor:offer.brandColor,
  logoUrl:offer.logo,logoOnLight:offer.logoOnLight===true,headline:offer.headline,compactTerms:offer.terms,
  ctaPath:offer.link,ctaLabel:offer.buttonText}));
if(!lineup.length)throw new Error('No active offers in src/data/offers.json');

// Active offers in ladder order, for the homepage ladder, hubs and the sidebar.
export function launchOfferLineup(){return lineup;}

export function renderOfferSlots(content){
  return splitOfferSlots(content).map(piece=>{
    if(piece.type==='html')return piece.html;
    const offer=byId.get(piece.offerId);
    // A switched-off or removed offer simply disappears from the article.
    if(!offer){console.warn(`Offer ${piece.offerId} is not active; its in-article placement is omitted`);return '';}
    return `<aside class="offer-slot" data-offer-id="${offer.id}"><p class="offer-bookmaker">${escape(offer.bookmaker)}</p><h2>${escape(offer.headline)}</h2><p>${escape(offer.terms)}</p><a href="${escape(offer.link)}" rel="sponsored nofollow">${escape(offer.buttonText)}</a></aside>`;
  }).join('');
}

export async function resolveLaunchOffers(records){
  for(const record of records)if(record.content?.includes('data-everytip-offer-slot'))record.content=renderOfferSlots(record.content);
}
