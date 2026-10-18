import test from 'node:test';import assert from 'node:assert/strict';
import {renderOfferSlots} from '../src/lib/launch-offers.mjs';
const marker='<div data-everytip-offer-slot="90846" data-layout="inline" data-heading=""></div>';
test('owner-approved UK offer slot reads central copy and keeps working affiliate CTA',()=>{
  const html=renderOfferSlots(marker,[{databaseId:90846,status:'publish',everyTipOfferDetails:{publicHeadline:'Current & central',compactTerms:'Exact terms'},everyTipOfferPublishing:{etOfferUid:'stable-id',etOfferStatus:'active',etOfferLastChecked:'2026-10-14',etOfferCountriesInclude:'UK'}}]);
  assert.match(html,/Current &amp; central/);assert.match(html,/href="\/go\/betfred" rel="nofollow"/);assert.doesNotMatch(html,/data-everytip-offer-slot/);
});
test('draft or missing offer cannot silently disappear from published placement',()=>{assert.throws(()=>renderOfferSlots(marker,[]),/not ready/);});

test('staging WPGraphQL single-select arrays resolve a published GB offer',()=>{
  const offer={databaseId:90846,status:'publish',everyTipOfferDetails:{publicHeadline:'Central headline',compactTerms:'Central terms'},everyTipOfferPublishing:{etOfferUid:'stable-id',etOfferStatus:['active'],etOfferLastChecked:'2026-10-14T00:00:00+00:00',etOfferCountriesInclude:'GB'}};
  assert.match(renderOfferSlots(marker,[offer]),/Central headline/);
  offer.everyTipOfferPublishing.etOfferStatus=['active','paused'];
  assert.throws(()=>renderOfferSlots(marker,[offer]),/not ready/);
});
