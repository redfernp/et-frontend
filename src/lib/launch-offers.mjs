import {splitOfferSlots,approvedOfferForSlot} from './offer-slots.mjs';
import approvedCopy from '../../data/approved-offer-copy.json' with {type:'json'};
const approvedIds=new Set(approvedCopy.offers.map(o=>o.id));
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function renderOfferSlots(content, offers) {
  return splitOfferSlots(content).map(piece=>{
    if(piece.type==='html')return piece.html;
    const offer=approvedOfferForSlot(piece,offers,{approvedIds});
    if(!offer)throw new Error(`ACF offer ${piece.offerId} is not ready for its published slot`);
    const copy=approvedCopy.offers.find(o=>o.id===piece.offerId);
    const details=offer.everyTipOfferDetails;
    return `<aside class="offer-slot" data-offer-id="${offer.databaseId}"><p class="offer-bookmaker">${escape(copy.partner)}</p><h2>${escape(details.publicHeadline)}</h2><p>${escape(details.compactTerms)}</p><a href="${escape(copy.ctaPath)}" rel="sponsored nofollow">${escape(offer.everyTipOfferPublishing.etOfferCtaLabel||'View offer')}</a></aside>`;
  }).join('');
}
export async function resolveLaunchOffers(records,query){
  if(!records.some(r=>r.content?.includes('data-everytip-offer-slot')))return;
  const offers=[];let after=null;const cursors=new Set();
  do{
    const {everytipOffers:connection}=await query(`query LaunchOffers($after:String){everytipOffers(first:5,after:$after){nodes{
      databaseId status everyTipOfferDetails{publicHeadline compactTerms fullTerms}
      everyTipOfferPublishing{etOfferUid etOfferStatus etOfferCtaLabel etOfferCountriesInclude etOfferCountriesExclude etOfferStartsAt etOfferEndsAt etOfferLastChecked}
    }pageInfo{endCursor hasNextPage}}}`,{after});
    if(!Array.isArray(connection?.nodes))throw new Error('Missing central offer records');
    offers.push(...connection.nodes);if(!connection.pageInfo.hasNextPage)break;
    after=connection.pageInfo.endCursor;if(!after||cursors.has(after)||!connection.nodes.length)throw new Error('Offer pagination stalled');cursors.add(after);
  }while(true);
  for(const record of records)if(record.content?.includes('data-everytip-offer-slot'))record.content=renderOfferSlots(record.content,offers);
}
