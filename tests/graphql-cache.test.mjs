import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGraphqlClient } from '../src/lib/graphql-cache.mjs';

test('resumes completed requests after failure, isolates endpoints, bypasses disk in fresh mode', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'et-cache-test-'));
  const endpoint = 'https://staging.example/graphql';
  const ok = value => new Response(JSON.stringify({ data: { value } }));
  try {
    const first = createGraphqlClient({ endpoint, directory, attempts: 1, fetchImpl: async (_, options) => {
      if (JSON.parse(options.body).variables.after) throw new Error('timeout');
      return ok('first');
    } });
    await first.request('query', {});
    await assert.rejects(first.request('query', { after: 'next' }), /timeout/);
    let reads = 0;
    const resumed = createGraphqlClient({ endpoint, directory, fetchImpl: async () => { reads++; return ok('next'); } });
    assert.deepEqual(await resumed.request('query'), { value: 'first' });
    await resumed.request('query', { after: 'next' });
    assert.equal(reads, 1);
    const fresh = createGraphqlClient({ endpoint, directory, fresh: true, fetchImpl: async () => ok('fresh') });
    assert.deepEqual(await fresh.request('query'), { value: 'fresh' });
    const other = createGraphqlClient({ endpoint: 'https://live.example/graphql', directory, fetchImpl: async () => ok('other') });
    assert.deepEqual(await other.request('query'), { value: 'other' });
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('serialises requests, backs off transient failures and does not retry schema errors', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'et-cache-test-'));
  let active = 0, peak = 0, calls = 0;
  const delays = [];
  try {
    const client = createGraphqlClient({ endpoint: 'https://test.example/graphql', directory, sleep: async ms => delays.push(ms), fetchImpl: async () => {
      active++; peak = Math.max(active, peak); calls++;
      await new Promise(resolve => setTimeout(resolve, 5)); active--;
      return calls === 1 ? new Response('', { status: 503 }) : new Response(JSON.stringify({ data: { calls } }));
    } });
    await Promise.all([client.request('one'), client.request('two')]);
    assert.equal(peak, 1); assert.deepEqual(delays, [2000]);
    const bad = createGraphqlClient({ endpoint: 'https://test.example/graphql', directory, sleep: async () => assert.fail('schema error retried'), fetchImpl: async () => new Response(JSON.stringify({ errors: [{ message: 'Unknown field' }] })) });
    await assert.rejects(bad.request('bad'), /Unknown field/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
