import { apply, columns, legalMoves, opening, rank, red, suit, won, type Deal, type Move, type Position } from './solitaire';
const plans = new Map<string, Move[]>();
const planKey = (s:Position,d:Deal)=>`${d.mode}|${s.piles.map(p=>p.join('.')).join('|')}|${s.hidden.join('.')}`;
export function primePlan(d:Deal,moves:readonly Move[]):boolean{let s=opening(d);for(const a of moves){const next=apply(s,d.mode,a);if(next===s)return false;s=next;}if(!won(s))return false;s=opening(d);moves.forEach((a,i)=>{plans.set(planKey(s,d),moves.slice(i));s=apply(s,d.mode,a);});while(plans.size>4096)plans.delete(plans.keys().next().value!);return true;}
export function knownPlan(s:Position,d:Deal):Move[]|undefined{return plans.get(planKey(s,d));}
export type Search = { status: 'solved'; moves: Move[]; nodes: number; branches: number; techniques: string[] } | { status: 'budget-exhausted'; nodes: number } | { status: 'unsolved'; nodes: number };
/** A bounded best-first graph search. The score orders work; it never proves an optimal move count. */
export function* searchSteps(deal: Deal, initial = opening(deal), budget = 20000): Generator<void,Search,void> {
  type Node = { state: Position; path: Move[]; score: number };
  const score = (s: Position) => s.piles.slice(8, 12).reduce((a, p) => a + p.length * 12, 0) - s.hidden.reduce((a, n) => a + n * 18, 0) + s.piles.slice(0, columns(deal.mode)).filter(p => !p.length).length * 8 - (deal.mode === 'freecell' ? s.piles.slice(12).filter(p => p.length).length * 5 : 0);
  // Binary max heap: deterministic ties by insertion order, no unbounded sorting per expansion.
  const heap: Node[] = [], seen = new Set<string>();
  const positionKey = (s: Position) => { const cols = columns(deal.mode); return s.piles.slice(0, cols).map((p, i) => `${s.hidden[i]}:${p.join('.')}`).sort().join('|') + '/' + s.piles.slice(8,12).map(p=>p.length).join('.') + '/' + (deal.mode === 'freecell' ? s.piles.slice(12).flat().sort((a,b)=>a-b).join('.') : s.piles.slice(12,14).map(p=>p.join('.')).join('|')); };
  const safe = (s: Position, a: Move) => { if (a[1] < 8 || a[1] > 11 || a[2] !== 1) return false; const c=s.piles[a[0]].at(-1)!; return rank(c)<=2 || s.piles.slice(8,12).every((p,i)=>i===suit(c) || p.length >= rank(c)-(red(i*13)===red(c)?2:1)); };
  const push = (n: Node) => { heap.push(n); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p].score >= n.score) break; heap[i] = heap[p]; i = p; } heap[i] = n; };
  const pop = () => { const n = heap[0], last = heap.pop()!; if (heap.length) { let i = 0; while (i * 2 + 1 < heap.length) { let c = i * 2 + 1; if (c + 1 < heap.length && heap[c + 1].score > heap[c].score) c++; if (heap[c].score <= last.score) break; heap[i] = heap[c]; i = c; } heap[i] = last; } return n; };
  push({ state: initial, path: [], score: score(initial) });
  let nodes = 0, branches = 0, clipped=false;
  while (heap.length) {
    yield;
    if (nodes >= budget) return { status: 'budget-exhausted', nodes };
    const { state, path } = pop(), key = positionKey(state);
    if (seen.has(key)) continue;
    seen.add(key); nodes++;
    if (won(state)) {
      let cursor=initial; path.forEach((a,i)=>{plans.set(planKey(cursor,deal),path.slice(i));cursor=apply(cursor,deal.mode,a);}); while(plans.size>4096)plans.delete(plans.keys().next().value!);
      return { status: 'solved', moves: path, nodes, branches, techniques: [...new Set(path.map(a => a[2] === 0 ? 'stock-cycle' : a[1] >= 12 ? 'reserve-space' : a[0] >= 8 && a[0] < 12 ? 'foundation-return' : a[2] > 1 ? 'sequence-transfer' : 'build-and-uncover'))] }; }
    if (path.length >= 240) {clipped=true;continue;}
    const all = legalMoves(state, deal.mode), forced = all.find(a => safe(state,a));
    const moves = forced ? [forced] : all;
    branches += Math.max(0, moves.length - 1);
    for (const a of moves) {
      // A complete foundation card can be returned by the player; search prunes only the immediate inverse.
      const last = path.at(-1);
      if (last && last[0] === a[1] && last[1] === a[0] && last[2] === a[2] && a[2] > 0) continue;
      const next = apply(state, deal.mode, a);
      if (seen.has(positionKey(next))) continue;
      const foundation = a[1] >= 8 && a[1] < 12 ? rank(state.piles[a[0]].at(-1)!) : 0;
      const urgency = foundation && foundation <= 2 ? 3 : 0;
      push({ state: next, path: [...path, a], score: score(next) - path.length * 0.1 + urgency });
    }
    // Memory is part of the search budget. Pruning is a timeout, never an unsolvability claim.
    if (heap.length > budget * 20) return { status: 'budget-exhausted', nodes };
  }
  // Depth-capped search did not exhaust the game's reachable space.
  return { status: clipped?'budget-exhausted':'unsolved', nodes };
}
export function solve(deal:Deal,initial=opening(deal),budget=20000):Search{const job=searchSteps(deal,initial,budget);for(;;){const r=job.next();if(r.done)return r.value;}}
export const cardWords = (c: number) => `${['', 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'][rank(c)]} of ${['clubs', 'diamonds', 'spades', 'hearts'][suit(c)]}`;
