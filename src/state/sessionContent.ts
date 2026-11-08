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
export const contentUnavailable = (e: unknown) => e instanceof ContentPendingError || e instanceof ContentLoadError || e instanceof BankError;
/** A cache miss is a loading state, never a corrupt-save verdict. No hashes originate in saved data. */
export function sessionHash(bank: Bank,index: number,catalog: SaveCatalog): string {
  if(!packedBank(bank)) return bank.entries[index]?.hash;
  const p=poolFor(catalog), id=key(bank,index), hash=p.pinned.get(id) ?? p.recent.get(id);
  if(hash===undefined) throw new ContentPendingError();
  return hash;
}
type Ref = {bank:number;puzzle:number;engine:string;rules:number;hash:string};
function sessionRefs(value: unknown): Ref[] {
  if(!plain(value)||!plain(value.puzzle))return [];
  const r=value.puzzle;
  return uint(r.bank,511)&&uint(r.puzzle,1023)&&asciiId(r.engine)&&uint(r.rules,65535)&&hashId(r.hash)?[r as Ref]:[];
}
/** Explicit envelope traversal: extra root keys cannot select a different input shape. */
function saveRefs(value: unknown): Ref[] {
  if(!plain(value))return [];
  const refs:Ref[]=[];
  const progress=(p:unknown,limit:number)=>{if(!plain(p)||!Array.isArray(p.paused))return;if(p.paused.length>limit)throw new Error('Too many paused puzzles.');for(const s of p.paused)refs.push(...sessionRefs(s));};
  const people=(group:unknown,limit:number,slots:number)=>{if(!plain(group)||!plain(group.people))return;const rows=Object.values(group.people);if(rows.length>limit)throw new Error('Too many people.');for(const p of rows)if(plain(p))progress(p.challenge,slots);};
  people(value.profiles,5,8);people(value.cove,4,4);
  if(!value.profiles)progress(value.challenge,8);
  if(refs.length>MAX_REFS)throw new Error('Too many paused puzzles.');
  return refs;
}
export function sessionContentReady(value:unknown,catalog:SaveCatalog):boolean {
  const p=poolFor(catalog);
  return sessionRefs(value).every(ref=>{const b=catalog.banks.get(ref.bank);return !b || !packedBank(b) || p.pinned.has(key(b,ref.puzzle)) || p.recent.has(key(b,ref.puzzle));});
}
export class ContentLoadError extends Error {
  readonly kind='content-unavailable';
  constructor(cause:unknown){super('This puzzle could not open. Your saved work is kept. Try again, or choose another puzzle.',{cause});this.name='ContentLoadError';}
}
export const contentMessage = 'This puzzle could not open. Your saved work is kept. Try again, or choose another puzzle.';
export type SessionOpenResult = {ok:true}|{ok:false;kind:'stale'|'content-unavailable'|'invalid-session';message:string};
export type ContentOptions = { live?: () => boolean; loader?: Pick<BankLoader,'savedHash'> };
export function assertContentLive(options:ContentOptions):void {if(options.live && !options.live())throw new BankError('cancelled','Puzzle load was cancelled.');}
/** Resolve at most the referenced paused set, sequentially, then publish atomically after the last await. */
export const prepareSessionContent = (session:unknown,catalog:SaveCatalog,options:ContentOptions={}) => prepareRefs(sessionRefs(session),catalog,options);
/** Optional explicit audit only. Launch, import, export and draft recovery never call this. */
export const prepareSaveContent = (value:unknown,catalog:SaveCatalog,options:ContentOptions={}) => prepareRefs(saveRefs(value),catalog,options);
async function prepareRefs(refs:Ref[],catalog: SaveCatalog,options: ContentOptions): Promise<void> {
  const p=poolFor(catalog), staged=new Map<string,string>();
  const live=()=>assertContentLive(options);
  live();
  for(const ref of refs){
    const bank=catalog.banks.get(ref.bank);
    if(!bank || !packedBank(bank) || ref.puzzle>=bankSize(bank) || ref.engine!==bank.engine || ref.rules!==bank.rules)continue; // ordinary validator rejects unknown identities
    const id=key(bank,ref.puzzle);
    if(staged.has(id) || p.pinned.has(id) || p.recent.has(id))continue;
    let expected:string;
    try {expected=await (options.loader ?? bankLoader()).savedHash(bank,ref.puzzle);}
    catch(error){if(error instanceof BankError)throw error;throw new ContentLoadError(error);}
    live();staged.set(id,expected);
  }
  live();
  for(const [id,hash] of staged){p.recent.delete(id);p.recent.set(id,hash);}
  while(p.recent.size>TRANSIENT_REFS)p.recent.delete(p.recent.keys().next().value!);
}
/** Capture proofs before boundary I/O; publication cannot throw after disk has committed. */
export function captureSessionContent(value: unknown,catalog: SaveCatalog): () => void {
  const p=poolFor(catalog), next=new Map<string,string>();
  for(const ref of saveRefs(value)){
    const bank=catalog.banks.get(ref.bank);if(!bank || !packedBank(bank))continue;
    const id=key(bank,ref.puzzle), hash=p.pinned.get(id)??p.recent.get(id);
    if(hash!==undefined)next.set(id,hash); // structurally accepted unopened slots have no proof yet
  }
  return ()=>{p.pinned=next;};
}
export function retainSessionContent(value:unknown,catalog:SaveCatalog):void {captureSessionContent(value,catalog)();}
export const sessionContentSize = (catalog:SaveCatalog) => {const p=poolFor(catalog);return {pinned:p.pinned.size,recent:p.recent.size};};
