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
// Visual identity for each partner; headline, terms and status always come from WordPress.
const brand={
  betfred:{bookmaker:'Betfred',brandColor:'#0f488f',logoUrl:'https://www.everytip.co.uk/wp-content/uploads/2018/06/betfred-154x40.png'},
  quinnbet:{bookmaker:'QuinnBet',brandColor:'#222222',logoUrl:'https://www.everytip.co.uk/wp-content/uploads/2024/09/quinnbet-logo-328.png'},
  spreadex:{bookmaker:'Spreadex Sports',brandColor:'#1f1f1f',logoUrl:'https://www.everytip.co.uk/wp-content/uploads/2024/03/SPX_1_Sports-Primarylogo-WO-11.png'},
  '10bet':{bookmaker:'10Bet',brandColor:'#0b447f',logoUrl:'https://www.everytip.co.uk/wp-content/uploads/2019/07/new-10bet-150x40-logo.jpg'},
  betway:{bookmaker:'Betway',brandColor:'#101010',logoUrl:'https://www.everytip.co.uk/wp-content/uploads/2018/03/Betway-sport-bets-review.jpg'},
  netbet:{bookmaker:'NetBet',brandColor:'#677f9a',logoUrl:'https://www.everytip.co.uk/wp-content/uploads/2018/04/NetBet_Logo-2CRev-48px.png',logoOnLight:true},
  betwright:{bookmaker:'BetWright',brandColor:'#253745',logoUrl:'https://www.everytip.co.uk/wp-content/uploads/2025/04/betwright-logo-light-400px.png'},
};
const lineupOrder=['betfred','quinnbet','spreadex','10bet','betway','netbet','betwright'];
let lineup=[];
// Active offers in ladder order, for the homepage ladder and the sidebar.
export function launchOfferLineup(){return lineup;}
function buildLineup(offers){
  lineup=lineupOrder.map(partner=>{
    const copy=approvedCopy.offers.find(o=>o.partner===partner);
    const offer=copy&&approvedOfferForSlot({type:'offer-slot',offerId:copy.id},offers,{approvedIds});
    if(!offer)return null;
    return {id:partner,offerId:offer.databaseId,...brand[partner],headline:offer.everyTipOfferDetails.publicHeadline,
      compactTerms:offer.everyTipOfferDetails.compactTerms,ctaPath:copy.ctaPath,
      ctaLabel:offer.everyTipOfferPublishing.etOfferCtaLabel||'Claim offer'};
  }).filter(Boolean);
  if(!lineup.length)throw new Error('No active central offers for the offer ladder');
}
export async function resolveLaunchOffers(records,query){
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
  buildLineup(offers);
  for(const record of records)if(record.content?.includes('data-everytip-offer-slot'))record.content=renderOfferSlots(record.content,offers);
}
