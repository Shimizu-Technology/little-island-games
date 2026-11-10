import { packedBank } from '../state/bankFacts';
import React from 'react';
import type { ComponentType } from 'react';
import type { Bank, ChallengeProgress, ChallengeSession, PuzzleRef, SaveCatalog, SessionBudget, Terminal } from '../state/challenge';
import { validChallengeSession } from '../state/challenge';
import { asciiId, exactKeys, hashId, jsonBytes, plain, uint, unpack } from '../state/saveBits';
import { bankLoader } from '../puzzles/catalog';
import { BankError, type BankLoader } from '../puzzles/loader';
import { prepareSessionContent } from '../state/sessionContent';
import { proves } from './evidence';
import type { AwardRule, ChallengeCard, ChallengePath, ChallengeViewProps, CompletionFacts, Evidence, PackedBand, PackedChallenge, Puzzle, ReplayEngine, ReplayPayload, TypedRegistration } from './types';
/**
 * Optional packed banks for a replay game. Each bank is one band of a certified family pack, offered
 * as a single choice; its rows stay packed until one is opened. The adopter supplies the committed
 * bank facts (tests compare them with the packaged manifest) and maps a decoded row to its descriptor.
 */
export type PackedReplay<D> = {
  family: string;
  banks: readonly { slot: number; first: number; count: number; packHash: string; rules: number; path: ChallengePath; tier: 1|2|3|4|5|6; title: string }[];
  /** One award mask per bank. Each entry's own award rules must stay inside it. */
  awards: number;
  /** Decode one row through the shared loader, e.g. `loader.entry(adapter, family, ordinal)`. */
  open: (loader: Pick<BankLoader, 'entry'>, ordinal: number) => Promise<{ ref: PuzzleRef; descriptor: D }>;
  /** Award rules and par for one resident entry. Packed entries carry no dare slots. */
  describe: (descriptor: D) => { awards: readonly [AwardRule | null, AwardRule | null]; par?: Puzzle<D>['par'] };
  loader?: () => Pick<BankLoader, 'entry' | 'savedHash'>;
};
const RESIDENT = 16;
const dense = (v: unknown, max: number): v is unknown[] => Array.isArray(v) && v.length <= max && Object.keys(v).length === v.length;
const metrics = ['cards','steps','placements','loads','turns'];
/** Replay-only kit. Checkpoint engines register their bounded exact codecs separately. */
export function defineReplayGame<D,P,A,S>(config: {
  game: string; codec: string; context: string; cove: boolean; budget: SessionBudget;
  completionText?: (ref: ChallengeSession['puzzle'], result: Terminal, facts: CompletionFacts | null) => string;
  helpUI?: 'board';
  /** Worst-case full help sequence, including terminal result overhead, certified by each adopter. */
  assistance?: { bytes: number; actions: number; idempotentHelp: true; isAction: (action: A) => boolean };
  puzzles: readonly Puzzle<D>[]; objectives?: readonly string[]; engine: ReplayEngine<D,P,A,S>;
  Board: ComponentType<ChallengeViewProps<S,A>>; controls: { help: () => A; reset: () => A };
  packed?: PackedReplay<D>;
}): TypedRegistration<ReplayPayload<P,A>,A,S> {
  const { engine } = config;
  if (config.helpUI === 'board' && !config.assistance) throw new Error('A hint ladder needs a certified assistance reserve.');
  const reserve = config.assistance ?? { bytes: 512, actions: 16, isAction: (action: A) => JSON.stringify(action) === JSON.stringify(config.controls.help()) };
  if (!uint(reserve.bytes, 3072) || reserve.bytes < 128 || !uint(reserve.actions, 256) || reserve.actions < 1) throw new Error('Invalid assistance reserve.');
  const objectiveIds=new Set(config.objectives??config.puzzles.flatMap(p=>[...p.dares,...p.awards.filter(a=>a!==null)].flatMap(d=>d.rule.kind==='pick-up'?[d.rule.objective]:[])));
  if(!asciiId(config.game) || !asciiId(config.codec) || !asciiId(config.context,14) || ['story-studio','island-home'].includes(config.game))throw new Error('Invalid Challenge registration.');
  const slots=new Set<number>(),ids=new Set<string>();
  for(const p of config.puzzles) {
    if(!hashId(p.ref.hash) || !uint(p.ref.bank,511) || !uint(p.ref.puzzle,1023) || !uint(p.ref.rules,65535) || !p.ref.rules || !uint(p.tier,6) || !p.tier || !['deep-water','endless'].includes(p.path))throw new Error('Invalid immutable puzzle.');
    if(!['school','deep-water','endless','play'].includes(p.source.kind))throw new Error('Unknown source.');
    if(p.source.kind==='school' && (p.source.game!==config.game || ![1,2,3,4,5].includes(p.source.level) || !asciiId(p.source.puzzle)) || p.source.kind==='endless' && (p.source.bank!==p.ref.bank || p.source.puzzle!==p.ref.puzzle) || p.source.kind==='play' && (p.source.game!==config.game || p.source.rules!==p.ref.rules || !asciiId(p.source.content)) || p.source.kind==='deep-water' && (!uint(p.source.collection,511) || !uint(p.source.puzzle,1023)))throw new Error('Source does not match puzzle.');
    if(p.par && (!metrics.includes(p.par.metric) || !uint(p.par.lower) || !uint(p.par.upper) || p.par.lower>p.par.upper))throw new Error('Invalid certified par bounds.');
    // Awards and optional dares use the same immutable evidence parameters.
    for(const {rule} of [...p.dares,...p.awards.filter(a=>a!==null)]) {
      if(!['par','clean','plan','blind','whole','two-ways','pick-up','own-read','edits'].includes(rule.kind) || (rule.kind==='par' && (!metrics.includes(rule.metric) || !uint(rule.max) || !rule.max)) || (rule.kind==='edits' && !uint(rule.max)) || (rule.kind==='plan' && ![1,2,3].includes(rule.max)) || (rule.kind==='pick-up' && !objectiveIds.has(rule.objective)))throw new Error('Invalid Challenge rule.');
    }
    for(const a of p.awards) if(a && (!['allowed','independent'].includes(a.help) || ['clean','whole','own-read'].includes(a.rule.kind) && a.help!=='independent'))throw new Error('Invalid award help policy.');
    for(const d of p.dares) {
      if(!uint(d.slot,4095) || slots.has(d.slot) || !asciiId(d.id) || ids.has(d.id) || !['allowed','independent'].includes(d.help))throw new Error('Invalid dare registration.');
      slots.add(d.slot);ids.add(d.id);
      if(['clean','whole','own-read'].includes(d.rule.kind) && d.help!=='independent')throw new Error('This dare needs independent evidence.');
    }
  }
  const sameRef=(a:ChallengeSession['puzzle'],b:ChallengeSession['puzzle'])=>a.bank===b.bank&&a.puzzle===b.puzzle&&a.engine===b.engine&&a.rules===b.rules&&a.hash===b.hash;
  // Packed entries become resident only after the shared loader has verified their row hash.
  const resident = new Map<string,Puzzle<D>>(), refKey = (r: PuzzleRef) => `${r.bank}:${r.puzzle}:${r.engine}:${r.rules}:${r.hash}`;
  const packedFind = (ref: PuzzleRef) => { const hit = resident.get(refKey(ref)); if (hit) { resident.delete(refKey(ref)); resident.set(refKey(ref),hit); } return hit; };
  const find = (session: ChallengeSession) => config.puzzles.find(p => sameRef(p.ref,session.puzzle)) ?? (config.packed ? packedFind(session.puzzle) : undefined);
  function replay(session: ChallengeSession): { state: S; evidence: Evidence } | null {
    try {
    const puzzle=find(session), p=session.payload;
    if (!puzzle || !plain(p) || !exactKeys(p,['version','initial','options','firstSolutions','actions']) || p.version !== 1 || !plain(p.options) || !exactKeys(p.options,['supportOff','ownRead']) || typeof p.options.supportOff !== 'boolean' || typeof p.options.ownRead !== 'boolean' || !dense(p.firstSolutions,32) || !p.firstSolutions.every(hashId) || new Set(p.firstSolutions).size !== p.firstSolutions.length || !engine.validInitial(p.initial,puzzle.descriptor) || !dense(p.actions,512) || !p.actions.every(engine.validAction)) return null;
    const payload=p as ReplayPayload<P,A>;
    let state=engine.create(puzzle.descriptor,payload.initial,payload.options);
    let helpUsed=false, heard=false, failed=false, runs=0, checks=0, resets=0;
    for (const action of payload.actions) {
      // A terminal board cannot accumulate post-win evidence or assistance-free replays.
      if (engine.inspect(state,puzzle.descriptor).solved) return null;
      const next=engine.step(state,action,puzzle.descriptor); if (!next) return null;
      if (!['edit','run','check','help','read-aloud','reset'].includes(next.event) || next.event==='edit' && next.state===state) return null;
      if ((next.event === 'run' || next.event === 'check') && typeof next.correct !== 'boolean') return null;
      if (next.event === 'help' || config.assistance?.isAction(action)) helpUsed=true;
      if (next.event === 'read-aloud') heard=true;
      if (next.event === 'run' || next.event === 'check') { runs++; if (!next.correct) failed=true; }
      if (next.event === 'check') checks++;
      if (next.event === 'reset') resets++;
      state=next.state;
    }
    const result=engine.inspect(state,puzzle.descriptor);
    if (typeof result.solved !== 'boolean' || !plain(result.metrics) || Object.entries(result.metrics).some(([k,v])=>!metrics.includes(k) || !uint(v)) || !uint(result.edits) || !(result.solution === null || hashId(result.solution)) || !dense(result.objectives,8) || !result.objectives.every(id=>asciiId(id)&&objectiveIds.has(id)) || new Set(result.objectives).size !== result.objectives.length) return null;
    return {state,evidence:{...result,...payload.options,helpUsed,heard,failed,runs,checks,resets,firstSolutions:payload.firstSolutions}};
    } catch { return null; }
  }
  function evaluate(session: ChallengeSession): Terminal | null {
    const round=replay(session), puzzle=find(session); if (!round?.evidence.solved || !puzzle) return null;
    const e=round.evidence, together=session.partner !== null;
    const event=together?'together':e.helpUsed || e.failed?'helped':'independent';
    const dares=session.selectedDares.filter(slot=>{const dare=puzzle.dares.find(d=>d.slot===slot);return !!dare && proves(dare.rule,e,dare.help,together);}).sort((a,b)=>a-b);
    const awards=puzzle.awards.reduce<number>((bits,rule,i)=>bits | (rule && proves(rule.rule,e,rule.help,together) ? 1<<i : 0),0);
    return {event,awards,dares,cost:puzzle.par ? e.metrics[puzzle.par.metric] ?? null : null,solution:e.solution};
  }
  const banks=new Map<number,Bank>();
  const dares: SaveCatalog['dares'] = new Map(config.puzzles.flatMap(p=>p.dares.map(d=>[d.slot,{kind:d.rule.kind,help:d.help,bank:p.ref.bank,puzzle:p.ref.puzzle}] as const)));
  for (const puzzle of config.puzzles) {
    if (puzzle.ref.engine !== config.game || config.game === 'beep-bot' && puzzle.path === 'deep-water') throw new Error('Incompatible Challenge path.');
    const bank=banks.get(puzzle.ref.bank) ?? {slot:puzzle.ref.bank,engine:config.game,rules:puzzle.ref.rules,entries:[],awards:[],cove:config.cove};
    if (packedBank(bank)) throw new Error('Replay registrations require authored descriptors.');
    if (puzzle.ref.puzzle !== bank.entries.length || bank.rules !== puzzle.ref.rules) throw new Error('Register bank entries in immutable puzzle order.');
    banks.set(bank.slot,{...bank,entries:[...bank.entries,{ordinal:bank.slot*1024+puzzle.ref.puzzle,hash:puzzle.ref.hash}],awards:[...bank.awards,puzzle.awards.reduce<number>((n,r,i)=>n | (r ? 1<<i:0),0)]});
  }
  const packedBanks = config.packed?.banks ?? [];
  if (config.packed) {
    if (!asciiId(config.packed.family) || !uint(config.packed.awards,3)) throw new Error('Invalid packed bank family.');
    for (const b of packedBanks) {
      if (!uint(b.slot,511) || banks.has(b.slot) || !uint(b.first,2147483647) || !uint(b.count,1024) || !b.count || !hashId(b.packHash) || !uint(b.rules,65535) || !b.rules || !uint(b.tier,6) || !b.tier || !['deep-water','endless'].includes(b.path) || config.game === 'beep-bot' && b.path === 'deep-water' || !b.title) throw new Error('Invalid packed bank registration.');
      banks.set(b.slot,{slot:b.slot,engine:config.game,rules:b.rules,first:b.first,count:b.count,family:config.packed.family,packHash:b.packHash,awards:config.packed.awards,cove:config.cove});
    }
  }
  const bandOf = (bank: number) => packedBanks.find(b => b.slot === bank);
  const codec={game:config.game,cove:config.cove,budget:config.budget,validate:(s:ChallengeSession)=>replay(s)!==null,evaluate,
    canStart:(s:ChallengeSession)=>replay(s)!==null && (s.payload as ReplayPayload<P,A>).actions.length===0 && s.result===null,
    extends:(a:ChallengeSession,b:ChallengeSession)=>{const p=a.payload as ReplayPayload<P,A>,q=b.payload as ReplayPayload<P,A>;return (q.actions.length>p.actions.length || q.actions.length===p.actions.length && config.assistance?.idempotentHelp===true && !!replay(a)?.evidence.helpUsed) && JSON.stringify({...p,actions:[]})===JSON.stringify({...q,actions:[]}) && p.actions.every((action,i)=>JSON.stringify(action)===JSON.stringify(q.actions[i]));}};
  const catalog:SaveCatalog={banks,dares,codecs:new Map([[config.codec,codec]]),contexts:new Set([...config.puzzles,...packedBanks].map(p=>`${config.context}-${p.tier}`))};
  const packed: PackedChallenge | undefined = config.packed && (() => {
    const spec = config.packed, loader = spec.loader ?? bankLoader;
    const bands: PackedBand[] = packedBanks.map(b => ({ kind: 'band', bank: b.slot, path: b.path, tier: b.tier, title: b.title, count: b.count }));
    const cardOf = (ref: PuzzleRef, b: (typeof packedBanks)[number]): ChallengeCard => {
      const hit = resident.get(refKey(ref));
      return { ref, source: { kind: b.path === 'endless' ? 'endless' : 'deep-water', ...(b.path === 'endless' ? { bank: b.slot } : { collection: b.slot }), puzzle: ref.puzzle } as ChallengeCard['source'], path: b.path, tier: b.tier, title: `${b.title} ${ref.puzzle + 1}`, dares: [], ...(hit?.par ? { par: hit.par } : {}) };
    };
    /** Decode, bind to the exact saved hash, and run the same content check the Store uses at session open. */
    async function resolve(ref: PuzzleRef | { bank: number; puzzle: number }): Promise<PuzzleRef> {
      const b = bandOf(ref.bank);
      if (!b || !uint(ref.puzzle,b.count-1)) throw new BankError('unknown', 'That puzzle is not in this bank.');
      const want = 'hash' in ref ? ref : null;
      if (want && (want.engine !== config.game || want.rules !== b.rules)) throw new BankError('malformed', 'The saved puzzle needs a different engine revision.');
      if (want && resident.has(refKey(want))) { await prepareSessionContent({ puzzle: want }, catalog, { loader: loader() }); return want; }
      const opened = await spec.open(loader(), b.first + ref.puzzle);
      const got = opened.ref;
      if (got.bank !== b.slot || got.puzzle !== ref.puzzle || got.engine !== config.game || got.rules !== b.rules || !hashId(got.hash) || want && got.hash !== want.hash) throw new BankError('hash-mismatch', 'This puzzle does not match its saved fingerprint.');
      await prepareSessionContent({ puzzle: got }, catalog, { loader: loader() });
      const rules = spec.describe(opened.descriptor);
      if (rules.awards.some((r, i) => r && !(spec.awards & (1 << i))) || rules.par && (!uint(rules.par.lower) || !uint(rules.par.upper) || rules.par.lower > rules.par.upper)) throw new BankError('malformed', 'Packed award rules are outside the bank mask.');
      for (const { rule } of rules.awards.filter(a => a !== null)) if (rule.kind === 'pick-up' && !objectiveIds.has(rule.objective)) throw new BankError('malformed', 'Unknown objective.');
      const card = cardOf(got, b);
      resident.set(refKey(got), { ...card, descriptor: opened.descriptor, awards: rules.awards, ...(rules.par ? { par: rules.par } : {}) });
      while (resident.size > RESIDENT) resident.delete(resident.keys().next().value!);
      return got;
    }
    return {
      bands,
      card: ref => { const b = bandOf(ref.bank); return b && ref.engine === config.game && ref.rules === b.rules && uint(ref.puzzle,b.count-1) ? cardOf(ref, b) : undefined; },
      prepare: async ref => { if (bandOf(ref.bank)) await resolve(ref); },
      /** Never-opened entries first, then unfinished ones, then the least recent, starting after the last played. */
      choose: async (bank: number, progress: ChallengeProgress, avoid?: PuzzleRef) => {
        const b = bandOf(bank); if (!b) throw new BankError('unknown', 'Unknown packed bank.');
        const states = unpack(progress.banks.find(r => r[0] === bank)?.[1] ?? '', b.count, 3) ?? Array<number>(b.count).fill(0);
        const recent = progress.recent.filter(([s]) => s === bank).map(([, p]) => p), last = recent.at(-1) ?? -1;
        const order = Array.from({ length: b.count }, (_, i) => (last + 1 + i) % b.count).filter(i => i !== avoid?.puzzle || avoid.bank !== bank || b.count === 1);
        const pick = order.find(i => !states[i]) ?? order.find(i => states[i] === 1) ?? order.find(i => !recent.includes(i)) ?? order.reduce((a, i) => recent.indexOf(i) < recent.indexOf(a) ? i : a, order[0]);
        return resolve({ bank, puzzle: pick });
      },
    };
  })();
  return {game:config.game,codec:config.codec,cove:config.cove,contextFor:ref=>`${config.context}-${config.puzzles.find(p=>p.ref.bank===ref.bank&&p.ref.puzzle===ref.puzzle)?.tier??bandOf(ref.bank)?.tier??1}`,puzzles:config.puzzles,catalog,controls:config.controls,completionText:config.completionText,completionFacts:s=>{const e=replay(s)?.evidence;return e?{helpUsed:e.helpUsed,failed:e.failed}:null;},helpUI:config.helpUI,
    ...(packed ? { packed } : {}),
    start:(ref,owner,id,progress,options,selectedDares)=>{
      const puzzle=config.puzzles.find(p=>sameRef(p.ref,ref)) ?? (config.packed ? packedFind(ref) : undefined); if(!puzzle)throw new Error('Unknown puzzle.');
      const payload:ReplayPayload<P,A>={version:1,initial:engine.initial(puzzle.descriptor),options:{...options},firstSolutions:progress.solutions.filter(([b,p])=>b===ref.bank&&p===ref.puzzle).map(([, ,hash])=>hash),actions:[]};
      const s:ChallengeSession={version:1,owner,game:config.game,id,ordinal:progress.nextOrdinal,revision:0,puzzle:ref,codec:config.codec,payload,selectedDares:[...selectedDares],partner:null,result:null,credited:false};
      if(jsonBytes(s)>4096-reserve.bytes || !validChallengeSession(s,owner,catalog,owner.startsWith('cove-')) || !codec.canStart(s))throw new Error('Invalid launch.');return s;
    },
    move:(s,action)=>{
      // A packed ref whose content check has lapsed refuses the move instead of throwing; inline is unchanged.
      if(bandOf(s.puzzle.bank)){try{return moveOn(s,action);}catch{return null;}}
      return moveOn(s,action);
    },
    render:(s,dispatch,active,width,host)=>{const round=replay(s);return round ? <config.Board state={round.state} dispatch={dispatch} active={active} width={width} onFresh={host?.onFresh} sessionKey={host?.key} commit={host?async(action,expectedKey)=>{const accepted=await host.commit(action,expectedKey);if(!accepted)return null;const restored=replay(accepted.session);return restored?{key:accepted.key,state:restored.state}:null;}:undefined}/> : null;},
  };
  function moveOn(s: ChallengeSession, action: unknown): ChallengeSession | null {if(!engine.validAction(action) || !validChallengeSession(s,s.owner,catalog,s.owner.startsWith('cove-')) || s.result || s.credited)return null;
      const payload=s.payload as ReplayPayload<P,A>;
      const previous = replay(s);
      const repeatedHelp = config.assistance?.idempotentHelp===true && JSON.stringify(action) === JSON.stringify(config.controls.help()) && previous?.evidence.helpUsed;
      const next={...s,revision:s.revision+1,payload:{...payload,actions:repeatedHelp?payload.actions:[...payload.actions,action]}};
      const restored = replay(next);
      if(!restored)return null;
      const checked = !!previous && restored.evidence.runs > previous.evidence.runs;
      const assisted = reserve.isAction(action) || restored.evidence.solved || checked;
      // Ordinary play cannot spend the bytes/actions reserved for the full help sequence.
      if (!assisted && (jsonBytes(next) > 4096 - reserve.bytes || next.payload.actions.length > 512 - reserve.actions)) return null;
      const result={...next,result:evaluate(next)};
      if (jsonBytes(result)>4096) return null;
      return validChallengeSession(result,s.owner,catalog,s.owner.startsWith('cove-'))?result:null;
  }
}
