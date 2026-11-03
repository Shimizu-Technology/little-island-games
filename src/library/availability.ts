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

/** Empty shelves distinguish parent choices from absent bundled content. */
export function collectionEmptyMessage(category: string, collections: readonly string[]) {
  if (!isAvailable(collections, category)) return category === "books"
    ? "A grown-up has put the picture books away for now."
    : "A grown-up has put this collection away for now. Your place is kept.";
  return category === "books" ? "Reviewed books will appear here when they are installed."
    : "No picture found yet. Try another word, or choose a picture above.";
}
