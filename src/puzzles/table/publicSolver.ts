import { apply, legalMoves, positionKey, rank, red, suit, won, type Deal, type Move, type Position } from './solitaire';
import {lineFromProof} from './proof';
import { knownPlan, primePlan, searchHintSteps } from './solver';
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
function* visibleProgress(visible:Position,d:Deal,budget:number,previous?:PreviousMove,foundationFloor=0):Generator<void,Advice|null,void>{
  const base = Math.max(foundationFloor,visible.piles.slice(8,12).reduce((n,p)=>n+p.length,0));
  const queue: {s: Position; path: Move[]; depth: number}[] = [{s:visible,path:[],depth:0}], seen = new Set<string>();
  let at=0;
  while (at < queue.length && at < budget) {
    yield;
    const node=queue[at++], key=positionKey(node.s); if(seen.has(key))continue; seen.add(key);
    if(node.depth >= 8)continue;
    for(const a of legalMoves(node.s,d.mode)) {
      if(!node.path.length&&reverses(visible,d,a,previous))continue;
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
function* freshAdviceSteps(s: Position, d: Deal, budget = 1200, previous?: PreviousMove): Generator<void,Advice,void> {
  if (won(s)) return { kind: 'unknown' };
  if (d.mode === 'freecell') { let cached=knownPlan(s,d);if(!cached){const proof=lineFromProof(d);if(proof)primePlan(d,proof);cached=knownPlan(s,d);} if(cached?.length)return {kind:'move',move:cached[0],plan:[cached[0]],depth:cached.length}; const r = yield* searchHintSteps(d, s, budget); return r.status === 'solved' && r.moves.length ? { kind: 'move', move: r.moves[0], plan: [r.moves[0]], depth: r.moves.length } : { kind: r.status==='unsolved'?'dead-end':'unknown' }; }
  const visible = publicView(s, d), all = legalMoves(visible, d.mode);
  const safe = all.find(a => safeFoundation(visible, a)&&!reverses(s,d,a,previous));
  if (safe) return { kind: 'move', move: safe, plan: [safe], depth: 1 };
  const uncover = all.find(a => !reverses(s,d,a,previous)&&a[0] < 7 && s.hidden[a[0]] > 0 && s.piles[a[0]].length - a[2] === s.hidden[a[0]]);
  if (uncover) return { kind: 'move', move: uncover, plan: [uncover], depth: 1 };
  const progress=yield* visibleProgress(visible,d,budget,previous);if(progress)return progress;
  // Search an entire public stock pass before suggesting another draw. No
  // hidden rank/order is inspected: -1 is an explicit reveal boundary.
  let stock=visible;const cycle=new Set<string>();let useful=false;
  while(stock.piles[12].length||stock.piles[13].length){
    yield;
    const key=positionKey(stock);if(cycle.has(key))break;cycle.add(key);
    if(stock!==visible&&(yield* visibleProgress(stock,d,budget))){useful=true;break;}
    const draw:Move=stock.piles[12].length?[12,13,0]:[13,12,0];
    if(draw[0]===12&&stock.piles[12].slice(-(d.mode==='draw-one'?1:3)).includes(-1)){useful=true;break;}
    stock=apply(stock,d.mode,draw);
  }
  if(!useful){
    // A transfer back can be required to expose another card. It is allowed
    // only with a public multi-step proof of NEW progress beyond the previous
    // position; returning a card home by itself is never such a proof.
    if(previous){const floor=previous.before.piles.slice(8,12).reduce((n,p)=>n+p.length,0),proved=yield* visibleProgress(visible,d,budget,undefined,floor);if(proved?.kind==='move'&&proved.plan.length>1)return proved;}
    return !all.length?{kind:'dead-end'}:{kind:'unknown'};
  }
  if (s.piles[12].length) return {kind:'move',move:[12,13,0],plan:[[12,13,0]],depth:1};
  // A recycle is public and legal, but cannot certify that the hidden stock has a useful card.
  if (s.piles[13].length) return {kind:'move',move:[13,12,0],plan:[[13,12,0]],depth:1};
  return !all.length ? {kind:'dead-end'} : {kind:'unknown'};
}

/** Derived from the validated opening path; it needs no extra saved field. */
export type PreviousMove={before:Position;move:Move};
const sameMove=(a:Move,b:Move)=>a.every((n,i)=>n===b[i]);
const publicKey=(s:Position,d:Deal)=>`${d.mode}|${positionKey(publicView(s,d))}|${s.known.join('')}`;
const reverses=(s:Position,d:Deal,a:Move,previous?:PreviousMove)=>!!previous&&positionKey(apply(s,d.mode,a))===positionKey(previous.before); // A proved reveal stays face-up even if a stack moves back.
// Only public, already proved plans enter this bounded cache. Identical public
// positions share the same answer, including hidden-information twins. No hidden ranks,
// unknown stock order or future reveal is used to choose a continuation.
const publicPlans=new Map<string,Move[]>();
function retainPlan(s:Position,d:Deal,plan:Move[]){
 const cache=publicPlans;
 let visible=publicView(s,d);
 for(let i=0;i<plan.length;i++){
  if(cache.size>=1024)cache.delete(cache.keys().next().value!);
  cache.set(`${d.mode}|${positionKey(visible)}|${visible.known.join('')}`,plan.slice(i).map(a=>[...a] as Move));
  const a=plan[i];
  if(a[2]===0&&a[0]===12&&visible.piles[12].slice(-(d.mode==='draw-one'?1:3)).includes(-1)||a[0]<7&&visible.hidden[a[0]]>0&&visible.piles[a[0]].length-a[2]===visible.hidden[a[0]])break;
  visible=apply(visible,d.mode,a);
 }
}
/** Continue a public plan, rebuilding its predecessor after a cold load. */
export function* adviceSteps(s:Position,d:Deal,budget=1200,previous?:PreviousMove):Generator<void,Advice,void>{
 if(d.mode==='freecell')return yield* freshAdviceSteps(s,d,budget);
 let plan=publicPlans.get(publicKey(s,d));
 if(!plan&&previous){
  const prior=publicPlans.get(publicKey(previous.before,d));
  const advice=prior?{kind:'move' as const,plan:prior}:yield* freshAdviceSteps(previous.before,d,budget);
  if(advice.kind==='move'&&sameMove(advice.plan[0],previous.move)){
   retainPlan(previous.before,d,advice.plan);plan=publicPlans.get(publicKey(s,d));
  }
 }
 if(plan?.length&&!reverses(s,d,plan[0],previous))return{kind:'move',move:plan[0],plan:plan.map(a=>[...a] as Move),depth:plan.length};
 const result=yield* freshAdviceSteps(s,d,budget,previous);
 // A one-card foundation gain alone does not justify an immediate reversal.
 // freshAdviceSteps allows it only with the public multi-step progress proof.
 if(result.kind==='move'){
  if(reverses(s,d,result.move,previous)&&result.plan.length===1)return{kind:'unknown'};
  retainPlan(s,d,result.plan);
 }
 return result;
}

/** Fresh public planning for deterministic band grading, independent of runtime cache history. */
export function gradeAdvice(s:Position,d:Deal,budget=1200):Advice{const job=freshAdviceSteps(s,d,budget);for(;;){const r=job.next();if(r.done)return r.value;}}

export function advise(s:Position,d:Deal,budget=1200,previous?:PreviousMove):Advice{const job=adviceSteps(s,d,budget,previous);for(;;){const r=job.next();if(r.done)return r.value;}}
/** User-requested searches yield after at most 8 ms and cancel at an identity boundary. */
export async function adviseAsync(s:Position,d:Deal,signal:AbortSignal,budget=10000,timeLimitMs=1800,previous?:PreviousMove):Promise<Advice>{
 const job=adviceSteps(s,d,budget,previous);let started=performance.now();const deadline=started+timeLimitMs;
 while(!signal.aborted&&performance.now()<deadline){const r=job.next();if(r.done)return r.value;if(performance.now()-started>=8){await new Promise<void>(resolve=>setTimeout(resolve,0));started=performance.now();}}
 return {kind:'unknown'};
}
