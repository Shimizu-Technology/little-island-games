import { bankLoader } from '../puzzles/catalog';
import { BankError, type BankLoader } from '../puzzles/loader';
import { packedBank, bankSize, type Bank } from './bankFacts';
import type { SaveCatalog } from './challenge';
import { asciiId, hashId, plain, uint } from './saveBits';

const MAX_REFS = 56; // five learners × eight slots plus four Cove people × four
const TRANSIENT_REFS = 64;
type Pool = { pinned: Map<string,string>; recent: Map<string,string> };
const pools = new WeakMap<SaveCatalog,Pool>();
const poolFor = (catalog: SaveCatalog) => { let p=pools.get(catalog); if(!p){p={pinned:new Map(),recent:new Map()};pools.set(catalog,p);} return p; };
const key = (bank: Bank,index: number) => `${bank.slot}:${packedBank(bank)?bank.packHash:'inline'}:${index}`;
export class ContentPendingError extends Error {
  constructor(){super('Puzzle content is still loading. Your saved work is kept. Please retry.');this.name='ContentPendingError';}
}
export const contentUnavailable = (e: unknown) => e instanceof ContentPendingError || e instanceof BankError;
/** A cache miss is a loading state, never a corrupt-save verdict. No hashes originate in saved data. */
export function sessionHash(bank: Bank,index: number,catalog: SaveCatalog): string {
  if(!packedBank(bank)) return bank.entries[index]?.hash;
  const p=poolFor(catalog), id=key(bank,index), hash=p.pinned.get(id) ?? p.recent.get(id);
  if(hash===undefined) throw new ContentPendingError();
  return hash;
}
function refsIn(value: unknown): {bank:number;puzzle:number;engine:string;rules:number;hash:string}[] {
  const refs: {bank:number;puzzle:number;engine:string;rules:number;hash:string}[]=[];
  const session=(s:unknown)=>{if(!plain(s)||!plain(s.puzzle))return;const r=s.puzzle;
    if(uint(r.bank,511)&&uint(r.puzzle,1023)&&asciiId(r.engine)&&uint(r.rules,65535)&&hashId(r.hash)) refs.push(r as typeof refs[number]);};
  const progress=(p:unknown,limit:number)=>{if(!plain(p)||!Array.isArray(p.paused))return;if(p.paused.length>limit)throw new Error('Too many paused puzzles. Your original has been kept.');p.paused.forEach(session);};
  if(!plain(value))return refs;
  if('puzzle' in value)session(value);
  else if('session' in value)session(value.session);
  else {
    if(plain(value.profiles)&&plain(value.profiles.people)){
      const people=Object.values(value.profiles.people);if(people.length>5)throw new Error('Too many learners.');
      people.forEach(p=>{if(plain(p))progress(p.challenge,8);});
    }
    if(plain(value.cove)&&plain(value.cove.people)){
      const people=Object.values(value.cove.people);if(people.length>4)throw new Error('Too many Cove people.');
      people.forEach(p=>{if(plain(p))progress(p.challenge,4);});
    }
    // Runtime active projection duplicates one canonical profile; collect it only without profiles.
    if(!value.profiles)progress(value.challenge,8);
  }
  if(refs.length>MAX_REFS)throw new Error('Too many paused puzzles. Your original has been kept.');
  return refs;
}
export function sessionContentReady(value:unknown,catalog:SaveCatalog):boolean {
  const p=poolFor(catalog);
  return refsIn(value).every(ref=>{const b=catalog.banks.get(ref.bank);return !b || !packedBank(b) || p.pinned.has(key(b,ref.puzzle)) || p.recent.has(key(b,ref.puzzle));});
}
export type ContentOptions = { live?: () => boolean; loader?: Pick<BankLoader,'savedHash'> };
export function assertContentLive(options:ContentOptions):void {if(options.live && !options.live())throw new BankError('cancelled','Puzzle load was cancelled.');}
/** Resolve at most the referenced paused set, sequentially, then publish atomically after the last await. */
export async function prepareSessionContent(value: unknown,catalog: SaveCatalog,options: ContentOptions = {}): Promise<void> {
  const p=poolFor(catalog), staged=new Map<string,string>();
  const live=()=>assertContentLive(options);
  live();
  for(const ref of refsIn(value)){
    const bank=catalog.banks.get(ref.bank);
    if(!bank || !packedBank(bank) || ref.puzzle>=bankSize(bank) || ref.engine!==bank.engine || ref.rules!==bank.rules)continue; // ordinary validator rejects unknown identities
    const id=key(bank,ref.puzzle);
    if(staged.has(id) || p.pinned.has(id) || p.recent.has(id))continue;
    const expected=await (options.loader ?? bankLoader()).savedHash(bank,ref.puzzle);
    live();staged.set(id,expected);
  }
  live();
  for(const [id,hash] of staged){p.recent.delete(id);p.recent.set(id,hash);}
  while(p.recent.size>TRANSIENT_REFS)p.recent.delete(p.recent.keys().next().value!);
}
/** Pin only the accepted envelope's references; eviction of pack data never invalidates accepted work. */
export function retainSessionContent(value: unknown,catalog: SaveCatalog): void {
  const p=poolFor(catalog), next=new Map<string,string>();
  for(const ref of refsIn(value)){
    const bank=catalog.banks.get(ref.bank);if(!bank || !packedBank(bank))continue;
    next.set(key(bank,ref.puzzle),sessionHash(bank,ref.puzzle,catalog));
  }
  p.pinned=next;
}
export const sessionContentSize = (catalog:SaveCatalog) => {const p=poolFor(catalog);return {pinned:p.pinned.size,recent:p.recent.size};};
