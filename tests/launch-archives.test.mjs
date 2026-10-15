import test from 'node:test';
import assert from 'node:assert/strict';
import {archiveMembership,archiveSeo,paginateArchive,launchArchives} from '../src/lib/launch-archives.mjs';
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

test('an empty archive still has a base route for checking staging HTTP and Yoast',()=>{
  assert.deepEqual(paginateArchive([],100),[[]]);
});

test('empty staging-200 terms are served while empty staging-404 terms stay absent',async()=>{
  const {mkdtemp}=await import('node:fs/promises');
  const {tmpdir}=await import('node:os');
  const {join}=await import('node:path');
  const cwd=process.cwd(),originalFetch=globalThis.fetch;
  const directory=await mkdtemp(join(tmpdir(),'everytip-empty-archive-test-'));
  const receipts=[];
  try {
    process.chdir(directory);
    globalThis.fetch=async url=>new Response(url.endsWith('/tag/retired')?'missing':'<title>Empty tag</title><meta name="robots" content="noindex, follow">',{status:url.endsWith('/tag/retired')?404:200});
    const query=async q=>{
      if(q.includes('allSettings'))return {allSettings:{readingSettingsPostsPerPage:100}};
      if(q.includes('LaunchMembership'))return {posts:{nodes:[],pageInfo:{hasNextPage:false}}};
      const kind=['categories','tags','users'].find(k=>q.includes(`${k}(`));
      const nodes=kind==='tags'&&!q.includes('hideEmpty:true')?[{databaseId:1,name:'Empty tag',uri:'/tag/empty'},{databaseId:2,name:'Retired',uri:'/tag/retired'}]:[];
      return {[kind]:{nodes,pageInfo:{hasNextPage:false}}};
    };
    const result=await launchArchives([],{query,endpoint:'https://example.com/graphql',fresh:true,receipts});
    assert.deepEqual(result.records.map(r=>r.uri),['/tag/empty']);
    assert.equal(result.records[0].seo.metaRobotsNoindex,'noindex');
    assert.deepEqual(result.records[0].posts,[]);
    assert.equal(receipts.length,2);
    assert.ok(receipts.every(r=>r.cached===false));
  } finally {process.chdir(cwd);globalThis.fetch=originalFetch;}
});
