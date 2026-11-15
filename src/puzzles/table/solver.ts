import { apply, columns, legalMoves, opening, rank, forcedFoundation, suit, won, type Deal, type Move, type Position } from './solitaire';
const plans = new Map<string, Move[]>();
const planKey = (s:Position,d:Deal)=>`${d.mode}|${s.piles.map(p=>p.join('.')).join('|')}|${s.hidden.join('.')}`;
export function primePlan(d:Deal,moves:readonly Move[]):boolean{let s=opening(d);for(const a of moves){const next=apply(s,d.mode,a);if(next===s)return false;s=next;}if(!won(s))return false;s=opening(d);moves.forEach((a,i)=>{plans.set(planKey(s,d),moves.slice(i));s=apply(s,d.mode,a);});while(plans.size>512)plans.delete(plans.keys().next().value!);return true;}
export function knownPlan(s:Position,d:Deal):Move[]|undefined{return plans.get(planKey(s,d));}
export type Search = { status: 'solved'; moves: Move[]; nodes: number; branches: number; techniques: string[] } | { status: 'budget-exhausted'; nodes: number } | { status: 'unsolved'; nodes: number };
/** A bounded best-first graph search. The score orders work; it never proves an optimal move count. */
export function* searchSteps(deal: Deal, initial = opening(deal), budget = 20000, compactFrontier = false): Generator<void,Search,void> {
  type Node = { state: Position; parent: Node | null; move: Move | null; depth: number; key: string; score: number };
  const score=(s:Position)=>{
    let home=0,covered=0,empty=0,cells=0;
    for(let i=8;i<12;i++)home+=s.piles[i].length*12;
    for(let i=0;i<8;i++)covered+=s.hidden[i]*18;
    for(let i=0;i<columns(deal.mode);i++)if(!s.piles[i].length)empty++;
    if(deal.mode==='freecell')for(let i=12;i<16;i++)if(s.piles[i].length)cells++;
    return home-covered+empty*8-cells*5;
  };
  // Binary max heap: preserve the existing deterministic ordering and grades.
  const heap: Node[] = [], seen = new Set<string>(), queued=new Map<string,Node>();
  const positionKey=(s:Position)=>{
    const cols:string[]=[];for(let i=0;i<columns(deal.mode);i++)cols.push(`${s.hidden[i]}:${s.piles[i].join('.')}`);
    const home=`${s.piles[8].length}.${s.piles[9].length}.${s.piles[10].length}.${s.piles[11].length}`;
    let reserve:string;
    if(deal.mode==='freecell'){const cells:number[]=[];for(let i=12;i<16;i++)cells.push(...s.piles[i]);reserve=cells.sort((a,b)=>a-b).join('.');}
    else reserve=s.piles[12].join('.')+'|'+s.piles[13].join('.');
    return cols.sort().join('|')+'/'+home+'/'+reserve;
  };

  const push = (n: Node) => {
    // Hint-only dominance: the canonical state reached with no more moves
    // leaves at least as much of the 240-move allowance. Keep its actual path.
    if(compactFrontier){const old=queued.get(n.key);if(old&&old.depth<=n.depth)return;queued.set(n.key,n);}
    heap.push(n); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p].score >= n.score) break; heap[i] = heap[p]; i = p; } heap[i] = n; };
  const pop = () => { const n = heap[0], last = heap.pop()!; if (heap.length) { let i = 0; while (i * 2 + 1 < heap.length) { let c = i * 2 + 1; if (c + 1 < heap.length && heap[c + 1].score > heap[c].score) c++; if (heap[c].score <= last.score) break; heap[i] = heap[c]; i = c; } heap[i] = last; } return n; };
  push({ state: initial, parent: null, move: null, depth: 0, key: positionKey(initial), score: score(initial) });
  let nodes = 0, branches = 0, clipped=false;
  while (heap.length) {
    yield;
    if (nodes >= budget) return { status: 'budget-exhausted', nodes };
    const node=pop(), { state, key, depth }=node;
    if(compactFrontier){if(queued.get(key)!==node)continue;queued.delete(key);}
    if (seen.has(key)) continue;
    seen.add(key); nodes++;
    if (won(state)) {
      const path:Move[]=[];for(let cursor:Node|null=node;cursor?.move;cursor=cursor.parent)path.push(cursor.move);path.reverse();
      let cursor=initial; path.forEach((a,i)=>{plans.set(planKey(cursor,deal),path.slice(i));cursor=apply(cursor,deal.mode,a);}); while(plans.size>512)plans.delete(plans.keys().next().value!);
      return { status: 'solved', moves: path, nodes, branches, techniques: [...new Set(path.map(a => a[2] === 0 ? 'stock-cycle' : a[1] >= 12 ? 'reserve-space' : a[0] >= 8 && a[0] < 12 ? 'foundation-return' : a[2] > 1 ? 'sequence-transfer' : 'build-and-uncover'))] }; }
    if (depth >= 240) {clipped=true;continue;}
    const forced=forcedFoundation(state,deal.mode),moves=forced?[forced]:legalMoves(state,deal.mode);
    branches += Math.max(0, moves.length - 1);
    for (const a of moves) {
      // A complete foundation card can be returned by the player; search prunes only the immediate inverse.
      const last = node.move;
      if (last && last[0] === a[1] && last[1] === a[0] && last[2] === a[2] && a[2] > 0) continue;
      const next = apply(state, deal.mode, a);
      const nextKey=positionKey(next);if (seen.has(nextKey)) continue;
      const foundation = a[1] >= 8 && a[1] < 12 ? rank(state.piles[a[0]].at(-1)!) : 0;
      const urgency = foundation && foundation <= 2 ? 3 : 0;
      push({ state: next, parent: node, move: a, depth: depth+1, key: nextKey, score: score(next) - depth * 0.1 + urgency });
    }
    // Memory is part of the search budget. Pruning is a timeout, never an unsolvability claim.
    if (heap.length > budget * 20) return { status: 'budget-exhausted', nodes };
  }
  // Depth-capped search did not exhaust the game's reachable space.
  return { status: clipped?'budget-exhausted':'unsolved', nodes };
}
export function solve(deal:Deal,initial=opening(deal),budget=20000):Search{const job=searchSteps(deal,initial,budget);for(;;){const r=job.next();if(r.done)return r.value;}}
export const cardWords = (c: number) => `${['', 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'][rank(c)]} of ${['clubs', 'diamonds', 'spades', 'hearts'][suit(c)]}`;
