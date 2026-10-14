export type WordPressMenuItem = {
  id: string;
  label: string;
  uri: string | null;
  parentId: string | null;
  order: number;
  target: string | null;
};

export type NavigationItem = {
  id: string;
  label: string;
  href: string | null;
  children: NavigationItem[];
};

export function buildMenuTree(items: WordPressMenuItem[]): NavigationItem[] {
  const byId = new Map<string, NavigationItem>();
  const ordered = [...items].sort((a, b) => a.order - b.order);
  for (const item of ordered) {
    if (!item.id || byId.has(item.id)) throw new Error(`Duplicate or missing WordPress menu item ID: ${item.id}`);
    const href = item.uri === '#' ? null : item.uri;
    if (href && (!href.startsWith('/') || href.startsWith('//') || /[?#]/.test(href))) {
      throw new Error(`Unexpected WordPress menu URI: ${href}`);
    }
    byId.set(item.id, { id: item.id, label: item.label.trim(), href, children: [] });
  }
  const roots: NavigationItem[] = [];
  for (const item of ordered) {
    const node = byId.get(item.id)!;
    if (item.parentId) {
      const parent = byId.get(item.parentId);
      if (!parent) throw new Error(`Missing parent for WordPress menu item: ${item.id}`);
      if (parent === node) throw new Error(`Self-parented WordPress menu item: ${item.id}`);
      parent.children.push(node);
    } else roots.push(node);
  }
  const visited = new Set<string>();
  const active = new Set<string>();
  const walk = (node: NavigationItem) => {
    if (active.has(node.id)) throw new Error(`Cyclic WordPress menu item: ${node.id}`);
    if (visited.has(node.id)) return;
    active.add(node.id);
    for (const child of node.children) walk(child);
    active.delete(node.id);
    visited.add(node.id);
  };
  for (const root of roots) walk(root);
  if (visited.size !== items.length) throw new Error('WordPress menu contains an orphan or cycle');
  return roots;
}

/** Only expose menu destinations with a verified, built public route. */
export function publicNavigation(items: NavigationItem[], verifiedPaths: Iterable<string>): NavigationItem[] {
  const allowed = new Set(verifiedPaths);
  const filter = (item: NavigationItem): NavigationItem | null => {
    const children = item.children.map(filter).filter((child): child is NavigationItem => child !== null);
    const href = item.href && allowed.has(item.href) ? item.href : null;
    if (!href && children.length === 0) return null;
    return { ...item, href, children };
  };
  return items.map(filter).filter((item): item is NavigationItem => item !== null);
}

export const publicMenuFallback: NavigationItem[] = [
  { id: 'home', label: 'Home', href: '/', children: [] },
  { id: 'tips', label: 'Free tips', href: '/free-betting-tips', children: [] },
  { id: 'review', label: 'Bookie review', href: '/bet365-review', children: [] },
  { id: 'paypal', label: 'PayPal guide', href: '/best-paypal-betting-sites.html', children: [] },
  { id: 'tipsters', label: 'Paid tipsters', href: '/professional-winning-tipsters-comparison-table', children: [] },
  { id: 'dark-horse', label: 'Dark Horse tips', href: '/value-bet-tips-dark-horses.html', children: [] },
  { id: 'kempton', label: 'Kempton', href: '/racecourses/kempton-racing-tips', children: [] },
];
