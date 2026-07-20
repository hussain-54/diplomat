export type CategoryVisibility = "public" | "hidden";

export type TaxonomyCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  visibility: CategoryVisibility;
  color: string | null;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  featured?: boolean;
  seo_score?: number | null;
  news_eligible?: boolean;
  discover_eligible?: boolean;
  language?: string | null;
  country?: string | null;
  articles?: Array<{ count: number }> | null;
};

export type TaxonomyNode = TaxonomyCategory & {
  children: TaxonomyNode[];
  depth: number;
  articleCount: number;
};

export function normalizeVisibility(value: string | null | undefined): CategoryVisibility {
  return value === "hidden" ? "hidden" : "public";
}

/** Build a nested tree from a flat category list, sorted by sort_order then name. */
export function buildCategoryTree(categories: TaxonomyCategory[]): TaxonomyNode[] {
  const byId = new Map<string, TaxonomyNode>();
  for (const category of categories) {
    byId.set(category.id, {
      ...category,
      visibility: normalizeVisibility(category.visibility),
      children: [],
      depth: 0,
      articleCount: category.articles?.[0]?.count ?? 0,
    });
  }

  const roots: TaxonomyNode[] = [];
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: TaxonomyNode[], depth: number) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    for (const node of nodes) {
      node.depth = depth;
      sortNodes(node.children, depth + 1);
    }
  };
  sortNodes(roots, 0);
  return roots;
}

/** Depth-first flat list for rendering and drag-drop index math. */
export function flattenCategoryTree(nodes: TaxonomyNode[]): TaxonomyNode[] {
  const out: TaxonomyNode[] = [];
  const walk = (list: TaxonomyNode[]) => {
    for (const node of list) {
      out.push(node);
      walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

export function getDescendantIds(categories: TaxonomyCategory[], rootId: string): Set<string> {
  const childrenByParent = new Map<string | null, string[]>();
  for (const category of categories) {
    const key = category.parent_id;
    const list = childrenByParent.get(key) ?? [];
    list.push(category.id);
    childrenByParent.set(key, list);
  }
  const ids = new Set<string>();
  const stack = [...(childrenByParent.get(rootId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (ids.has(id)) continue;
    ids.add(id);
    stack.push(...(childrenByParent.get(id) ?? []));
  }
  return ids;
}

/** Valid parent options excluding self and descendants (prevents cycles in the UI). */
export function parentOptions(
  categories: TaxonomyCategory[],
  excludeId?: string,
): TaxonomyCategory[] {
  const blocked = excludeId
    ? new Set([excludeId, ...getDescendantIds(categories, excludeId)])
    : new Set<string>();
  return categories
    .filter((category) => !blocked.has(category.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Apply a drag-and-drop move: place `dragId` among siblings under `newParentId`
 * at sibling index `siblingIndex` (0-based among children of the new parent).
 * Returns the full reorder payload for the server.
 */
export function applyCategoryMove(
  categories: TaxonomyCategory[],
  dragId: string,
  newParentId: string | null,
  siblingIndex: number,
): Array<{ id: string; parent_id: string | null; sort_order: number }> {
  if (dragId === newParentId) return [];
  const descendants = getDescendantIds(categories, dragId);
  if (newParentId && descendants.has(newParentId)) return [];

  const next = categories.map((category) => ({ ...category }));
  const dragged = next.find((category) => category.id === dragId);
  if (!dragged) return [];
  dragged.parent_id = newParentId;

  const siblings = next
    .filter((category) => category.parent_id === newParentId && category.id !== dragId)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  const clamped = Math.max(0, Math.min(siblingIndex, siblings.length));
  siblings.splice(clamped, 0, dragged);
  siblings.forEach((category, index) => {
    category.sort_order = index;
  });

  // Preserve relative order of unaffected parent groups.
  const byParent = new Map<string | null, TaxonomyCategory[]>();
  for (const category of next) {
    const key = category.parent_id;
    const list = byParent.get(key) ?? [];
    list.push(category);
    byParent.set(key, list);
  }
  for (const [parentId, list] of byParent) {
    if (parentId === newParentId) continue;
    list
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
      .forEach((category, index) => {
        category.sort_order = index;
      });
  }

  return next.map((category) => ({
    id: category.id,
    parent_id: category.parent_id,
    sort_order: category.sort_order,
  }));
}
