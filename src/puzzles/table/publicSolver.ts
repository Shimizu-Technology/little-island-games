import { apply, legalMoves, positionKey, rank, red, suit, won, type Deal, type Move, type Position } from './solitaire';
import {lineFromProof} from './proof';
import { knownPlan, primePlan, searchSteps } from './solver';
/** Observable state only: no face-down rank, suit or stock order. */
export function publicView(s: Position, d: Deal): Position {
  return { piles: s.piles.map((p, i) => p.map((c, j) => d.mode !== 'freecell' && (i === 12 || i < 7 && j < s.hidden[i]) && !s.known[c] ? -1 : c)), hidden: [...s.hidden], known: [...s.known] };
}
const safeFoundation = (s: Position, a: Move) => {
  if (a[1] < 8 || a[1] > 11) return false;
  const c = s.piles[a[0]].at(-1)!;
  return rank(c) <= 2 || s.piles.slice(8, 12).every((p, i) => i === suit(c) || p.length >= rank(c) - (red(i * 13) === red(c) ? 2 : 1));
};
export type Advice = { kind: 'move'; move: Move; plan: Move[]; depth: number } | { kind: 'unknown' } | { kind: 'dead-end' };
/** A bounded public planner, also used after each stock step in a full pass. */
function* visibleProgress(visible:Position,d:Deal,budget:number):Generator<void,Advice|null,void>{
  const base = visible.piles.slice(8,12).reduce((n,p)=>n+p.length,0);
  const queue: {s: Position; path: Move[]; depth: number}[] = [{s:visible,path:[],depth:0}], seen = new Set<string>();
  let at=0;
  while (at < queue.length && at < budget) {
    yield;
    const node=queue[at++], key=positionKey(node.s); if(seen.has(key))continue; seen.add(key);
    if(node.depth >= 8)continue;
    for(const a of legalMoves(node.s,d.mode)) {
      // Drawing is a reveal boundary. It is considered only after visible planning.
      if(a[2]===0 && a[0]===12 && node.s.piles[12].slice(-(d.mode==='draw-one'?1:3)).includes(-1)) return {kind:'move',move:(node.path[0]??a),plan:[...node.path,a],depth:node.depth+1};
      const next=apply(node.s,d.mode,a), path=[...node.path,a];
      if(next.hidden.some((n,i)=>n<node.s.hidden[i]) || next.piles.slice(8,12).reduce((n,p)=>n+p.length,0)>base) return {kind:'move',move:path[0],plan:path,depth:node.depth+1};
      queue.push({s:next,path,depth:node.depth+1});
    }
  }
  return null;
}

/** Klondike searches visible play until a card is uncovered, never past a hidden reveal. */
export function* adviceSteps(s: Position, d: Deal, budget = 1200): Generator<void,Advice,void> {
  if (won(s)) return { kind: 'unknown' };
  if (d.mode === 'freecell') { let cached=knownPlan(s,d);if(!cached){const proof=lineFromProof(d);if(proof)primePlan(d,proof);cached=knownPlan(s,d);} if(cached?.length)return {kind:'move',move:cached[0],plan:[cached[0]],depth:cached.length}; const r = yield* searchSteps(d, s, budget); return r.status === 'solved' && r.moves.length ? { kind: 'move', move: r.moves[0], plan: [r.moves[0]], depth: r.moves.length } : { kind: r.status==='unsolved'?'dead-end':'unknown' }; }
  const visible = publicView(s, d), all = legalMoves(visible, d.mode);
  const safe = all.find(a => safeFoundation(visible, a));
  if (safe) return { kind: 'move', move: safe, plan: [safe], depth: 1 };
  const uncover = all.find(a => a[0] < 7 && s.hidden[a[0]] > 0 && s.piles[a[0]].length - a[2] === s.hidden[a[0]]);
  if (uncover) return { kind: 'move', move: uncover, plan: [uncover], depth: 1 };
  const progress=yield* visibleProgress(visible,d,budget);if(progress)return progress;
  // Search an entire public stock pass before suggesting another draw. No
  // hidden rank/order is inspected: -1 is an explicit reveal boundary.
  let stock=visible;const cycle=new Set<string>();let useful=false;
  while(stock.piles[12].length||stock.piles[13].length){
    yield;
    const key=positionKey(stock);if(cycle.has(key))break;cycle.add(key);
    if(legalMoves(stock,d.mode).some(a=>a[0]===13&&a[2]>0)||stock!==visible&&(yield* visibleProgress(stock,d,budget))){useful=true;break;}
    const draw:Move=stock.piles[12].length?[12,13,0]:[13,12,0];
    if(draw[0]===12&&stock.piles[12].slice(-(d.mode==='draw-one'?1:3)).includes(-1)){useful=true;break;}
    stock=apply(stock,d.mode,draw);
  }
  if(!useful)return !all.length?{kind:'dead-end'}:{kind:'unknown'};
  if (s.piles[12].length) return {kind:'move',move:[12,13,0],plan:[[12,13,0]],depth:1};
  // A recycle is public and legal, but cannot certify that the hidden stock has a useful card.
  if (s.piles[13].length) return {kind:'move',move:[13,12,0],plan:[[13,12,0]],depth:1};
  return !all.length ? {kind:'dead-end'} : {kind:'unknown'};
}

export function advise(s:Position,d:Deal,budget=1200):Advice{const job=adviceSteps(s,d,budget);for(;;){const r=job.next();if(r.done)return r.value;}}
/** User-requested searches yield after at most 8 ms and cancel at an identity boundary. */
export async function adviseAsync(s:Position,d:Deal,signal:AbortSignal,budget=10000,timeLimitMs=1800):Promise<Advice>{
 const job=adviceSteps(s,d,budget);let started=performance.now();const deadline=started+timeLimitMs;
 while(!signal.aborted&&performance.now()<deadline){const r=job.next();if(r.done)return r.value;if(performance.now()-started>=8){await new Promise<void>(resolve=>setTimeout(resolve,0));started=performance.now();}}
 return {kind:'unknown'};
}
