import test from 'node:test';
import assert from 'node:assert/strict';
import {archiveMembership,archiveSeo,paginateArchive} from '../src/lib/launch-archives.mjs';
test('WordPress page size preserves archive order without losing final page',()=>{
  const posts=Array.from({length:201},(_,i)=>i);
  const pages=paginateArchive(posts,100);
  assert.deepEqual(pages.map(p=>p.length),[100,100,1]); assert.deepEqual(pages.flat(),posts);
});
test('paginated SEO uses rendered Yoast values, including robots and entity decoding',()=>{
  assert.deepEqual(archiveSeo('<title>News &amp; Tips - Page 2</title><meta name="robots" content="noindex, follow, max-snippet:-1"><link rel="canonical" href="https://example.com/news/page/2"><meta name="description" content="A &amp; B">'),{title:'News & Tips - Page 2',metaDesc:'A & B',canonical:'https://example.com/news/page/2',metaRobotsNoindex:'noindex',metaRobotsNofollow:'follow'});
});
test('membership refuses truncated taxonomy connections',async()=>{
  await assert.rejects(archiveMembership(async()=>({posts:{nodes:[{databaseId:1,categories:{pageInfo:{hasNextPage:true}}}],pageInfo:{hasNextPage:false}}})),/truncated/);
});
