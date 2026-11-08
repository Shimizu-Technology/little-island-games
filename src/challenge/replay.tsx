import { packedBank } from '../state/bankFacts';
import React from 'react';
import type { ComponentType } from 'react';
import type { Bank, ChallengeSession, SaveCatalog, SessionBudget, Terminal } from '../state/challenge';
import { validChallengeSession } from '../state/challenge';
import { asciiId, exactKeys, hashId, jsonBytes, plain, uint } from '../state/saveBits';
import { proves } from './evidence';
import type { ChallengeViewProps, Evidence, Puzzle, ReplayEngine, ReplayPayload, TypedRegistration } from './types';
const dense = (v: unknown, max: number): v is unknown[] => Array.isArray(v) && v.length <= max && Object.keys(v).length === v.length;
const metrics = ['cards','steps','placements','loads','turns'];
/** Replay-only kit. Checkpoint engines register their bounded exact codecs separately. */
export function defineReplayGame<D,P,A,S>(config: {
  game: string; codec: string; context: string; cove: boolean; budget: SessionBudget;
  puzzles: readonly Puzzle<D>[]; objectives?: readonly string[]; engine: ReplayEngine<D,P,A,S>;
  Board: ComponentType<ChallengeViewProps<S,A>>; controls: { help: () => A; reset: () => A };
}): TypedRegistration<ReplayPayload<P,A>,A,S> {
  const { engine } = config;
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
  const find = (session: ChallengeSession) => config.puzzles.find(p => sameRef(p.ref,session.puzzle));
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
      if (next.event === 'help') helpUsed=true;
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
  const codec={game:config.game,cove:config.cove,budget:config.budget,validate:(s:ChallengeSession)=>replay(s)!==null,evaluate,
    canStart:(s:ChallengeSession)=>replay(s)!==null && (s.payload as ReplayPayload<P,A>).actions.length===0 && s.result===null,
    extends:(a:ChallengeSession,b:ChallengeSession)=>{const p=a.payload as ReplayPayload<P,A>,q=b.payload as ReplayPayload<P,A>;return q.actions.length>p.actions.length && JSON.stringify({...p,actions:[]})===JSON.stringify({...q,actions:[]}) && p.actions.every((action,i)=>JSON.stringify(action)===JSON.stringify(q.actions[i]));}};
  const catalog:SaveCatalog={banks,dares,codecs:new Map([[config.codec,codec]]),contexts:new Set(config.puzzles.map(p=>`${config.context}-${p.tier}`))};
  return {game:config.game,codec:config.codec,cove:config.cove,contextFor:ref=>`${config.context}-${config.puzzles.find(p=>p.ref.bank===ref.bank&&p.ref.puzzle===ref.puzzle)?.tier??1}`,puzzles:config.puzzles,catalog,controls:config.controls,
    start:(ref,owner,id,progress,options,selectedDares)=>{
      const puzzle=config.puzzles.find(p=>sameRef(p.ref,ref)); if(!puzzle)throw new Error('Unknown puzzle.');
      const payload:ReplayPayload<P,A>={version:1,initial:engine.initial(puzzle.descriptor),options:{...options},firstSolutions:progress.solutions.filter(([b,p])=>b===ref.bank&&p===ref.puzzle).map(([, ,hash])=>hash),actions:[]};
      const s:ChallengeSession={version:1,owner,game:config.game,id,ordinal:progress.nextOrdinal,revision:0,puzzle:ref,codec:config.codec,payload,selectedDares:[...selectedDares],partner:null,result:null,credited:false};
      if(!validChallengeSession(s,owner,catalog,owner.startsWith('cove-')) || !codec.canStart(s))throw new Error('Invalid launch.');return s;
    },
    move:(s,action)=>{if(!engine.validAction(action) || !validChallengeSession(s,s.owner,catalog,s.owner.startsWith('cove-')) || s.result || s.credited)return null;
      const payload=s.payload as ReplayPayload<P,A>, next={...s,revision:s.revision+1,payload:{...payload,actions:[...payload.actions,action]}};
      if(jsonBytes(next)>4096 || !replay(next))return null;
      const result={...next,result:evaluate(next)};return validChallengeSession(result,s.owner,catalog,s.owner.startsWith('cove-'))?result:null;
    },
    render:(s,dispatch,active,width)=>{const round=replay(s);return round ? <config.Board state={round.state} dispatch={dispatch} active={active} width={width}/> : null;},
  };
}
