/** One visibility check for child browsing, links, search, shelf and direct destinations. */
export function isAvailable(collections: readonly string[], category: string) {
  return collections.includes(category);
}
export function visibleSaved(
  ids: readonly string[],
  categoryById: ReadonlyMap<string, string>,
  collections: readonly string[]
) {
  return ids.filter((id) => {
    const category = categoryById.get(id);
    return category !== undefined && isAvailable(collections, category);
  });
}
