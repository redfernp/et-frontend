import { graphql } from './wpgraphql.ts';
import { offlinePreviewEnabled } from './offline-snapshot.mjs';
import { buildMenuTree, publicMenuFallback, type NavigationItem, type WordPressMenuItem } from './menu-tree.ts';
export { publicNavigation, publicMenuFallback } from './menu-tree.ts';

type WordPressMenu = {
  databaseId: number;
  name: string;
  locations: string[];
  menuItems: { nodes: WordPressMenuItem[]; pageInfo: { hasNextPage: boolean } };
};

const MENU_QUERY = `query EveryTipNavigation {
  menus(first: 50) {
    nodes {
      databaseId name locations
      menuItems(first: 100) {
        nodes { id label uri parentId order target }
        pageInfo { hasNextPage }
      }
    }
  }
}`;

const menuRequests = new Map<string, Promise<{ id: number; name: string; items: NavigationItem[] }>>();

export async function getWordPressMenu(location: string): Promise<{ id: number; name: string; items: NavigationItem[] }> {
  if (offlinePreviewEnabled()) {
    if (location !== 'PRIMARY') throw new Error(`No offline preview menu for ${location}`);
    return { id: 0, name: 'Offline navigation preview (not a WordPress menu snapshot)', items: publicMenuFallback };
  }
  if (!menuRequests.has(location)) {
    const request = graphql<{ menus: { nodes: WordPressMenu[] } }>(MENU_QUERY).then((result) => {
      const matches = result.menus?.nodes?.filter((menu) => menu.locations?.includes(location)) ?? [];
      if (matches.length !== 1) throw new Error(`Expected one WordPress menu at ${location}; found ${matches.length}`);
      const menu = matches[0];
      if (menu.menuItems.pageInfo.hasNextPage) throw new Error(`WordPress menu at ${location} exceeds 100 items; add pagination`);
      return { id: menu.databaseId, name: menu.name, items: buildMenuTree(menu.menuItems.nodes) };
    }).catch((error) => { menuRequests.delete(location); throw error; });
    menuRequests.set(location, request);
  }
  return menuRequests.get(location)!;
}
