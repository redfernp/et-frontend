import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function createGraphqlClient({ endpoint, directory = 'outputs/wpgraphql-cache', fresh = false,
  fetchImpl = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  attempts = 6, timeout = 60000 } = {}) {
  let queue = Promise.resolve();
  const memory = new Map();
  const receipts = [];
  async function read(query, variables, force = fresh) {
    const body = JSON.stringify({ query, variables });
    const key = createHash('sha256').update(`v1\n${endpoint}\n${body}`).digest('hex');
    if (memory.has(key)) return memory.get(key);
    const file = join(directory, `${key}.json`);
    if (!force) {
      try {
        const cached = JSON.parse(await readFile(file, 'utf8'));
        if (cached.key !== key || cached.endpoint !== endpoint || !cached.data || !cached.fetchedAt) throw new Error(`Invalid GraphQL cache: ${file}`);
        receipts.push({ key, fetchedAt: cached.fetchedAt, cached: true });
        memory.set(key, cached.data);
        return cached.data;
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const response = await fetchImpl(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' },
          body, signal: AbortSignal.timeout(timeout) });
        if (!response.ok) {
          const error = new Error(`WPGraphQL HTTP ${response.status}`);
          error.permanent = response.status < 500 && ![408, 429].includes(response.status);
          throw error;
        }
        const result = await response.json();
        if (result.errors?.length || !result.data) {
          const error = new Error(result.errors?.map(e => e.message).join('; ') || 'WPGraphQL returned no data');
          error.permanent = true;
          throw error;
        }
        const fetchedAt = new Date().toISOString();
        await mkdir(directory, { recursive: true });
        const temporary = `${file}.${randomUUID()}.tmp`;
        await writeFile(temporary, JSON.stringify({ key, endpoint, fetchedAt, data: result.data }));
        await rename(temporary, file);
        receipts.push({ key, fetchedAt, cached: false });
        memory.set(key, result.data);
        return result.data;
      } catch (error) {
        if (error.permanent || attempt === attempts - 1) throw error;
        const delay = Math.min(20000, 2000 * 2 ** attempt);
        console.warn(`WPGraphQL ${key.slice(0, 8)} attempt ${attempt + 1}/${attempts}: ${error.message}; retry in ${delay / 1000}s`);
        await sleep(delay);
      }
    }
  }
  return {
    receipts,
    // { fresh: true } skips the disk cache for this one request (incremental builds use it for listings).
    request(query, variables = {}, options = {}) {
      // Even independent build routes share one sequential source queue.
      const result = queue.then(() => read(query, variables, options.fresh ?? fresh));
      queue = result.catch(() => {});
      return result;
    },
  };
}
