/** Compare CMS identities and update times, without reading or rewriting bodies. */
export function comparePublishedInventory(snapshot, inventory) {
  const previous = new Map([...snapshot.posts, ...snapshot.pages].map((node) => [node.databaseId, node]));
  const current = new Map([...inventory.posts, ...inventory.pages].map((node) => [node.databaseId, node]));
  const added = [];
  const missing = [];
  const changedPath = [];
  const modified = [];
  for (const [id, node] of current) {
    const before = previous.get(id);
    if (!before) { added.push({ id, path: node.uri }); continue; }
    if (before.uri !== node.uri) changedPath.push({ id, oldPath: before.uri, path: node.uri });
    if (before.modified !== node.modified) modified.push({ id, path: node.uri, oldModified: before.modified, modified: node.modified });
  }
  for (const [id, node] of previous) {
    if (!current.has(id)) missing.push({ id, path: node.uri });
  }
  return { added, missing, changedPath, modified };
}
