import { arcadeIds } from '../arcade/types';
import { asciiId, exactKeys, hashId, jsonBytes, pack, plain, uint, unpack } from './saveBits';
export type Completion = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type CompletionEvent = 'opened' | 'helped' | 'together' | 'independent';
const realTimeArcade = new Set<string>(arcadeIds.filter(id => id !== 'reef-builder'));
const transitions: Record<CompletionEvent, readonly Completion[]> = {
  opened: [1,1,2,3,4,5,6], helped: [2,2,2,4,4,5,6], together: [3,3,4,3,4,6,6], independent: [5,5,5,6,6,5,6],
};
export const complete = (state: Completion, event: CompletionEvent): Completion => transitions[event][state];
const facts = [0,1,3,5,7,11,15];
export function mergeCompletion(a: Completion, b: Completion): Completion {
  let union = facts[a] | facts[b]; if (union & 8) union |= 2;
  return facts.indexOf(union) as Completion;
}
export type PuzzleRef = { bank: number; puzzle: number; engine: string; rules: number; hash: string };
export type Bank = { slot: number; engine: string; rules: number; entries: readonly { ordinal: number; hash: string }[]; awards: readonly number[]; cove: boolean };
export type Terminal = { event: Exclude<CompletionEvent, 'opened'>; awards: number; dares: number[]; cost: number | null; solution: string | null };
export type ChallengeSession = { version: 1; owner: string; game: string; id: string; ordinal: number; revision: number; puzzle: PuzzleRef; codec: string; payload: unknown; selectedDares: number[]; partner: string | null; result: Terminal | null; credited: boolean };
/** Boundary is unknown until the exact registered engine has validated and replayed it. */
export type SessionCodec = { game: string; cove: boolean; validate: (session: ChallengeSession) => boolean; evaluate: (session: ChallengeSession) => Terminal | null; canStart: (session: ChallengeSession) => boolean; extends: (before: ChallengeSession, next: ChallengeSession) => boolean };
export type Dare = { kind: 'par'|'clean'|'plan'|'blind'|'whole'|'two-ways'|'pick-up'|'own-read'|'edits'; help: 'allowed'|'independent'; bank: number; puzzle: number };
export type SaveCatalog = { banks: ReadonlyMap<number, Bank>; codecs: ReadonlyMap<string, SessionCodec>; dares: ReadonlyMap<number, Dare>; contexts: ReadonlySet<string> };
/** F2 owns generated registrations. An empty catalog intentionally accepts no invented content. */
export const saveCatalog: SaveCatalog = { banks: new Map(), codecs: new Map(), dares: new Map(), contexts: new Set() };
export type BankProgress = [slot: number, state: string, awards: string];
export type Best = [bank: number, puzzle: number, cost: number];
export type Signal = [context: string, recent: string, failures: number, rating: 'easy'|'right'|'hard'|null, dismissed: boolean];
export type ChallengeProgress = {
  version: 1; banks: BankProgress[]; dares: string; nextOrdinal: number; paused: ChallengeSession[]; signals: Signal[];
  bests: Best[]; recent: [number, number][]; cursors: [number, number][]; practice: [string, number, number][];
  choice: [string, 'deep-water'|'endless', number] | null; solutions: [number, number, string][];
};
export const emptyChallenge = (cove = false): ChallengeProgress => ({ version:1, banks:[], dares:cove ? '' : pack(Array<number>(4096).fill(0),1), nextOrdinal:1, paused:[], signals:[], bests:[], recent:[], cursors:[], practice:[], choice:null, solutions:[] });
export const challengeLimit = (cove = false) => cove ? 72_000 : 104_000;
function validRef(v: unknown, catalog: SaveCatalog, cove = false): v is PuzzleRef {
  if (!plain(v) || !exactKeys(v,['bank','puzzle','engine','rules','hash']) || !uint(v.bank,511) || !uint(v.puzzle,1023) || !asciiId(v.engine) || !uint(v.rules,65535) || !v.rules || !hashId(v.hash)) return false;
  const bank = catalog.banks.get(v.bank), entry = bank?.entries[v.puzzle];
  return !!entry && (!cove || !!bank?.cove) && bank?.engine === v.engine && bank.rules === v.rules && entry.hash === v.hash;
}
export function validChallengeSession(v: unknown, owner: string, catalog = saveCatalog, cove = false): v is ChallengeSession {
  if (!plain(v) || !exactKeys(v,['version','owner','game','id','ordinal','revision','puzzle','codec','payload','selectedDares','partner','result','credited']) || v.version !== 1 || v.owner !== owner || realTimeArcade.has(v.game as string) || !asciiId(v.game) || !asciiId(v.id,100) || !uint(v.ordinal,2147483646) || !v.ordinal || !uint(v.revision,2147483647) || !asciiId(v.codec) || !validRef(v.puzzle,catalog,cove) || v.puzzle.engine !== v.game || !(v.partner === null || asciiId(v.partner,40) && v.partner !== owner) || typeof v.credited !== 'boolean' || !Array.isArray(v.selectedDares) || v.selectedDares.length > 3 || new Set(v.selectedDares).size !== v.selectedDares.length || !v.selectedDares.every(slot => {
    const dare = uint(slot,4095) ? catalog.dares.get(slot) : undefined;
    return !!dare && dare.bank === (v.puzzle as PuzzleRef).bank && dare.puzzle === (v.puzzle as PuzzleRef).puzzle;
  }) || jsonBytes(v) > 4096) return false;
  const codec = catalog.codecs.get(v.codec); if (!codec || codec.game !== v.game || cove && !codec.cove) return false;
  try {
    const session = v as ChallengeSession;
    if (!codec.validate(session)) return false;
    const result = codec.evaluate(session);
    if (JSON.stringify(result) !== JSON.stringify(v.result) || v.credited && result === null) return false;
    if (result === null) return true;
    if (!plain(result) || !exactKeys(result,['event','awards','dares','cost','solution']) || !['helped','together','independent'].includes(result.event) || !uint(result.awards,3) || result.awards & ~(catalog.banks.get(v.puzzle.bank)!.awards[v.puzzle.puzzle] ?? 0) || !Array.isArray(result.dares) || new Set(result.dares).size !== result.dares.length || !result.dares.every(slot => (v.selectedDares as number[]).includes(slot)) || !(result.cost === null || uint(result.cost)) || !(result.solution === null || hashId(result.solution))) return false;
    if (v.partner !== null && result.event !== 'together' || v.partner === null && result.event === 'together') return false;
    return result.dares.every(slot => {
      const dare = catalog.dares.get(slot)!;
      return result.event === 'independent' || dare.help === 'allowed' && (!['clean','whole','own-read'].includes(dare.kind));
    });
  } catch { return false; }
}
const tupleArray = (v: unknown, max: number, size: number): v is unknown[][] => Array.isArray(v) && v.length <= max && v.every(row => Array.isArray(row) && row.length === size);
const uniqueKeys = (v: readonly unknown[][], width: number) => new Set(v.map(row => JSON.stringify(row.slice(0,width)))).size === v.length;
export function validChallengeProgress(v: unknown, owner: string, catalog = saveCatalog, cove = false): v is ChallengeProgress {
  if (!asciiId(owner,40) || !plain(v) || !exactKeys(v,['version','banks','dares','nextOrdinal','paused','signals','bests','recent','cursors','practice','choice','solutions']) || v.version !== 1 || jsonBytes(v) > challengeLimit(cove) || !uint(v.nextOrdinal,2147483647) || !v.nextOrdinal || !tupleArray(v.banks,512,3) || !uniqueKeys(v.banks,1)) return false;
  let last = -1;
  for (const [slot, states, awards] of v.banks) {
    const bank = uint(slot,511) ? catalog.banks.get(slot) : undefined;
    if (!bank || cove && !bank.cove || (slot as number) <= last) return false;
    last = slot as number;
    const codes = unpack(states,bank.entries.length,3), bits = unpack(awards,bank.entries.length,2);
    if (!codes || !bits || codes.some(n => n === 7) || bits.some((n,i) => n & ~(bank.awards[i] ?? 0) || n && codes[i] < 2)) return false;
  }
  const dares = cove ? v.dares === '' ? [] : null : unpack(v.dares,4096,1);
  if (!dares || dares.some((n,i) => n && !catalog.dares.has(i))) return false;
  if (!Array.isArray(v.paused) || v.paused.length > (cove ? 4 : 8) || !v.paused.every(s => validChallengeSession(s,owner,catalog,cove) && s.ordinal < (v.nextOrdinal as number)) || new Set(v.paused.map(s => s.game)).size !== v.paused.length || new Set(v.paused.map(s => s.ordinal)).size !== v.paused.length || !v.paused.every((s,i) => !i || (v.paused as ChallengeSession[])[i-1].game < s.game)) return false;
  const ref = (bank: unknown, puzzle: unknown) => uint(bank,511) && uint(puzzle,1023) && !!catalog.banks.get(bank)?.entries[puzzle] && (!cove || !!catalog.banks.get(bank)?.cove);
  if (!tupleArray(v.bests,cove ? 128 : 256,3) || !uniqueKeys(v.bests,2) || !v.bests.every(([b,p,n]) => ref(b,p) && uint(n)) || !tupleArray(v.recent,cove ? 32 : 64,2) || !uniqueKeys(v.recent,2) || !v.recent.every(([b,p]) => ref(b,p)) || !tupleArray(v.cursors,cove ? 64 : 128,2) || !uniqueKeys(v.cursors,1) || !v.cursors.every(([b,n]) => uint(b,511) && catalog.banks.has(b) && (!cove || catalog.banks.get(b)!.cove) && uint(n)) || !tupleArray(v.practice,cove ? 16 : 64,3) || !uniqueKeys(v.practice,1) || !v.practice.every(([ctx,helped,clean]) => typeof ctx === 'string' && catalog.contexts.has(ctx) && uint(helped) && uint(clean)) || !tupleArray(v.signals,cove ? 8 : 32,5) || !uniqueKeys(v.signals,1) || !v.signals.every(([ctx,recent,failures,rating,dismissed]) => typeof ctx === 'string' && catalog.contexts.has(ctx) && typeof recent === 'string' && /^[chf]{0,5}$/.test(recent) && uint(failures,999) && ['easy','right','hard',null].includes(rating as null) && typeof dismissed === 'boolean') || !tupleArray(v.solutions,cove ? 16 : 32,3) || !uniqueKeys(v.solutions,3) || !v.solutions.every(([b,p,h]) => ref(b,p) && hashId(h))) return false;
  return v.choice === null || Array.isArray(v.choice) && v.choice.length === 3 && typeof v.choice[0] === 'string' && [...catalog.banks.values()].some(b => b.engine === (v.choice as unknown[])[0] && (!cove || b.cove)) && ['deep-water','endless'].includes(v.choice[1]) && uint(v.choice[2],6) && v.choice[2] > 0;
}
/** Monotonic permanent facts; optional working sets are managed separately. */
export function creditProgress(progress: ChallengeProgress, ref: PuzzleRef, result: Terminal, catalog: SaveCatalog, cove = false): ChallengeProgress {
  const bank = catalog.banks.get(ref.bank)!;
  const previous = progress.banks.find(row => row[0] === ref.bank);
  const states = previous ? unpack(previous[1],bank.entries.length,3)! : Array<number>(bank.entries.length).fill(0);
  const awards = previous ? unpack(previous[2],bank.entries.length,2)! : Array<number>(bank.entries.length).fill(0);
  states[ref.puzzle] = complete(states[ref.puzzle] as Completion,result.event); awards[ref.puzzle] |= result.awards;
  const dares = cove ? [] : unpack(progress.dares,4096,1)!; for (const slot of result.dares) if (!cove) dares[slot] = 1;
  const bests: Best[] = result.cost === null ? progress.bests : [...progress.bests.filter(([b,p]) => b !== ref.bank || p !== ref.puzzle), [ref.bank,ref.puzzle,Math.min(result.cost,progress.bests.find(([b,p]) => b === ref.bank && p === ref.puzzle)?.[2] ?? Infinity)] as Best].slice(-(cove ? 128 : 256));
  return { ...progress, banks:[...progress.banks.filter(row => row[0] !== ref.bank),[ref.bank,pack(states,3),pack(awards,2)] as BankProgress].sort((a,b) => a[0]-b[0]), dares:cove ? '' : pack(dares,1), bests,
    recent:[...progress.recent.filter(([b,p]) => b !== ref.bank || p !== ref.puzzle),[ref.bank,ref.puzzle] as [number,number]].slice(-(cove ? 32 : 64)),
    solutions: result.solution === null ? progress.solutions : [...progress.solutions.filter(([b,p,h]) => b !== ref.bank || p !== ref.puzzle || h !== result.solution),[ref.bank,ref.puzzle,result.solution] as [number,number,string]].slice(-(cove ? 16 : 32)) };
}

/** Append-only registration seam. F2 passes its generated immutable catalog here before hydration. */
export function registerSaveContent(content: SaveCatalog): void {
  const ordinals = new Set([...saveCatalog.banks.values()].flatMap(b => b.entries.map(e => e.ordinal)));
  for (const [slot,bank] of content.banks) {
    const old = saveCatalog.banks.get(slot);
    if (old && old !== bank) throw new Error('An immutable bank slot cannot be replaced.');
    if (old) continue;
    if (!uint(slot,511) || bank.slot !== slot || !asciiId(bank.engine) || !uint(bank.rules,65535) || !bank.rules || !bank.entries.length || bank.entries.length > 1024 || bank.awards.length !== bank.entries.length || bank.awards.some(n => !uint(n,3)) || bank.entries.some(e => !uint(e.ordinal,2147483647) || !hashId(e.hash) || ordinals.has(e.ordinal))) throw new Error('Invalid immutable bank registration.');
    for (const entry of bank.entries) { if (ordinals.has(entry.ordinal)) throw new Error('Duplicate ordinal.'); ordinals.add(entry.ordinal); }
  }
  for (const [id,codec] of content.codecs) if (!asciiId(id) || realTimeArcade.has(codec.game) || !asciiId(codec.game) || typeof codec.validate !== 'function' || typeof codec.evaluate !== 'function' || typeof codec.canStart !== 'function' || typeof codec.extends !== 'function' || saveCatalog.codecs.has(id) && saveCatalog.codecs.get(id) !== codec) throw new Error('Invalid or replaced session codec.');
  for (const [slot,dare] of content.dares) if (!uint(slot,4095) || !['par','clean','plan','blind','whole','two-ways','pick-up','own-read','edits'].includes(dare.kind) || !['allowed','independent'].includes(dare.help) || !(content.banks.get(dare.bank) ?? saveCatalog.banks.get(dare.bank))?.entries[dare.puzzle] || saveCatalog.dares.has(slot) && saveCatalog.dares.get(slot) !== dare) throw new Error('Invalid or replaced dare slot.');
  if ([...content.contexts].some(id => !asciiId(id))) throw new Error('Invalid signal context.');
  // Validate the whole batch before changing any registration.
  for (const [slot,bank] of content.banks) (saveCatalog.banks as Map<number,Bank>).set(slot,Object.freeze({ ...bank, entries:Object.freeze(bank.entries.map(e => Object.freeze({ ...e }))), awards:Object.freeze([...bank.awards]) }));
  for (const [id,codec] of content.codecs) (saveCatalog.codecs as Map<string,SessionCodec>).set(id,Object.freeze({ ...codec }));
  for (const [slot,dare] of content.dares) (saveCatalog.dares as Map<number,Dare>).set(slot,Object.freeze({ ...dare }));
  for (const context of content.contexts) (saveCatalog.contexts as Set<string>).add(context);
}
/** Merge permanent facts only. Working drafts/cursors never erase accepted facts. */
export function mergeProgressFacts(left: ChallengeProgress, right: ChallengeProgress, catalog = saveCatalog, cove = false): ChallengeProgress {
  const banks: BankProgress[] = [];
  for (const slot of [...new Set([...left.banks,...right.banks].map(b => b[0]))].sort((a,b) => a-b)) {
    const bank = catalog.banks.get(slot); if (!bank) throw new Error('Unknown bank.');
    const a = left.banks.find(b => b[0] === slot), b = right.banks.find(b => b[0] === slot);
    const states = [a,b].map(row => row ? unpack(row[1],bank.entries.length,3)! : Array<number>(bank.entries.length).fill(0));
    const awards = [a,b].map(row => row ? unpack(row[2],bank.entries.length,2)! : Array<number>(bank.entries.length).fill(0));
    banks.push([slot,pack(states[0].map((n,i) => mergeCompletion(n as Completion,states[1][i] as Completion)),3),pack(awards[0].map((n,i) => n | awards[1][i]),2)]);
  }
  const a = cove ? [] : unpack(left.dares,4096,1), b = cove ? [] : unpack(right.dares,4096,1);
  if (!a || !b) throw new Error('Invalid permanent marks.');
  return { ...left,banks,dares:cove ? '' : pack(a.map((n,i) => n | b[i]),1) };
}
