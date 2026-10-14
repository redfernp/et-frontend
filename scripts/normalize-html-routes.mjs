import { readdir, rename, rmdir, stat } from 'node:fs/promises';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
let normalized = 0;

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const child = join(directory, entry.name);
    await walk(child);
    if (!entry.name.endsWith('.html')) continue;

    const contents = await readdir(child);
    if (contents.length !== 1 || contents[0] !== 'index.html') {
      throw new Error(`Cannot normalize non-simple HTML route: ${child}`);
    }
    const destination = join(dirname(child), basename(child));
    const temporary = `${destination}.tmp-${process.pid}`;
    try {
      await stat(temporary);
      throw new Error(`Temporary HTML route already exists: ${temporary}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    await rename(join(child, 'index.html'), temporary);
    await rmdir(child);
    await rename(temporary, destination);
    normalized++;
  }
}

await walk(root);
console.log(`Normalized ${normalized} exact .html route(s).`);
