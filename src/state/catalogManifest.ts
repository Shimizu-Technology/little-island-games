import type { Bank, Dare, SaveCatalog } from './challenge';
/** Revision 2 adds range-based packed banks; save/session encodings and ordinals do not change. */
export type CatalogManifest = { version:1|2; banks: readonly Bank[]; dares: readonly (readonly [number,Dare])[]; contexts: readonly string[] };
export const catalogManifest = (catalog: SaveCatalog): CatalogManifest => ({version:2,banks:[...catalog.banks.values()],dares:[...catalog.dares],contexts:[...catalog.contexts]});
type Entries = readonly {ordinal:number;hash:string}[];
export type BankEntries = (bank: Bank) => Entries;
const equal = (a:unknown,b:unknown):boolean => JSON.stringify(a)===JSON.stringify(b);
const shape = (m:CatalogManifest) => {
  if(![1,2].includes(m.version) || !Array.isArray(m.banks) || m.banks.length>512 || new Set(m.banks.map(b=>b.slot)).size!==m.banks.length || !Array.isArray(m.dares) || new Set(m.dares.map(d=>d[0])).size!==m.dares.length || !Array.isArray(m.contexts) || new Set(m.contexts).size!==m.contexts.length) throw new Error('Invalid catalog manifest.');
};
export function assertFrozenCatalog(previous: CatalogManifest, next: CatalogManifest, entries?: BankEntries): void {
  shape(previous);shape(next);
  if(previous.version===2 && next.version===1)throw new Error('Immutable catalog revision cannot go backwards.');
  for (const old of previous.banks) {
    const bank=next.banks.find(b=>b.slot===old.slot);
    if(equal(old,bank))continue;
    // One-way representation change, proved from the verified packaged bytes at build time.
    if(bank && 'entries' in old && 'first' in bank && entries && old.engine===bank.engine && old.rules===bank.rules && old.cove===bank.cove &&
      old.entries.length===bank.count && old.entries.every((e,i)=>e.ordinal===bank.first+i) &&
      old.awards.every((a,i)=>a===(typeof bank.awards==='number'?bank.awards:bank.awards[i])) && equal(old.entries,entries(bank)))continue;
    throw new Error(`Immutable catalog bank ${old.slot} changed.`);
  }
  for (const [slot,dare] of previous.dares) if (!equal(next.dares.find(d=>d[0]===slot)?.[1],dare)) throw new Error(`Immutable dare ${slot} changed.`);
  for (const id of previous.contexts) if (!next.contexts.includes(id)) throw new Error(`Immutable context ${id} removed.`);
}
