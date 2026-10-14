import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker/index.mjs';
import inventory from '../data/affiliate-redirects.json' with {type:'json'};
test('every inventoried affiliate path preserves the observed status and destination',async()=>{
  for(const [path,redirect] of Object.entries(inventory.redirects)){
    const response=await worker.fetch(new Request(`https://preview.example${path}`),{ASSETS:{fetch(){throw new Error('Affiliate paths must not hit assets');}}});
    assert.equal(response.status,redirect.status,path);assert.equal(response.headers.get('location'),redirect.location,path);
  }
});
test('unknown affiliate paths do not become an open redirect',async()=>{
  const response=await worker.fetch(new Request('https://preview.example/go/unknown?url=https://evil.example'),{});
  assert.equal(response.status,404);
});
