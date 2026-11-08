import type { Bank, Dare, SaveCatalog } from './challenge';
/** Commit this manifest with generated content. Existing slots, lengths, ordinals and hashes are immutable. */
export type CatalogManifest = { version:1; banks: readonly Bank[]; dares: readonly (readonly [number,Dare])[]; contexts: readonly string[] };
export const catalogManifest = (catalog: SaveCatalog): CatalogManifest => ({version:1,banks:[...catalog.banks.values()],dares:[...catalog.dares],contexts:[...catalog.contexts]});
export function assertFrozenCatalog(previous: CatalogManifest, next: CatalogManifest): void {
  if (previous.version !== 1 || next.version !== 1) throw new Error('Invalid catalog manifest.');
  for (const old of previous.banks) if (JSON.stringify(next.banks.find(b=>b.slot===old.slot)) !== JSON.stringify(old)) throw new Error(`Immutable catalog bank ${old.slot} changed.`);
  for (const [slot,dare] of previous.dares) if (JSON.stringify(next.dares.find(d=>d[0]===slot)?.[1]) !== JSON.stringify(dare)) throw new Error(`Immutable dare ${slot} changed.`);
  for (const id of previous.contexts) if (!next.contexts.includes(id)) throw new Error(`Immutable context ${id} removed.`);
}
