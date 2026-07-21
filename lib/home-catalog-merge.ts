export type CatalogSortItem = {
  id: string;
  publishedAt: Date | null;
  createdAt: Date;
};

function catalogTimestamp(item: CatalogSortItem): number {
  return (item.publishedAt ?? item.createdAt).getTime();
}

export function mergeCatalogTitles<T extends CatalogSortItem>(
  groups: readonly (readonly T[])[],
  canView: (title: T) => boolean,
  limit: number,
): T[] {
  const byId = new Map<string, T>();

  for (const group of groups) {
    for (const title of group) {
      if (canView(title) && !byId.has(title.id)) {
        byId.set(title.id, title);
      }
    }
  }

  return [...byId.values()]
    .sort((a, b) => catalogTimestamp(b) - catalogTimestamp(a))
    .slice(0, limit);
}
