import { apply, legalMoves, positionKey, rank, red, suit, won, type Deal, type Move, type Position } from './solitaire';
import witnesses from './witnesses.generated.json';
import { knownPlan, primePlan, solve } from './solver';
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
/** Klondike searches visible play until a card is uncovered, never past a hidden reveal. */
export function advise(s: Position, d: Deal, budget = 1200): Advice {
  if (won(s)) return { kind: 'unknown' };
  if (d.mode === 'freecell') { const proof=(witnesses as Record<string,Move[]>)[d.cards];if(proof&&!knownPlan(s,d))primePlan(d,proof); const cached=knownPlan(s,d); if(cached?.length)return {kind:'move',move:cached[0],plan:[cached[0]],depth:cached.length}; const r = solve(d, s, Math.min(400,budget)); return r.status === 'solved' && r.moves.length ? { kind: 'move', move: r.moves[0], plan: [r.moves[0]], depth: r.moves.length } : { kind: 'unknown' }; }
  const visible = publicView(s, d), all = legalMoves(visible, d.mode);
  const safe = all.find(a => safeFoundation(visible, a));
  if (safe) return { kind: 'move', move: safe, plan: [safe], depth: 1 };
  const uncover = all.find(a => a[0] < 7 && s.hidden[a[0]] > 0 && s.piles[a[0]].length - a[2] === s.hidden[a[0]]);
  if (uncover) return { kind: 'move', move: uncover, plan: [uncover], depth: 1 };
  const base = s.piles.slice(8,12).reduce((n,p)=>n+p.length,0);
  const queue: {s: Position; path: Move[]; depth: number}[] = [{s:visible,path:[],depth:0}], seen = new Set<string>();
  let at=0;
  while (at < queue.length && at < budget) {
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
  if (s.piles[12].length) return {kind:'move',move:[12,13,0],plan:[[12,13,0]],depth:1};
  // A recycle is public and legal, but cannot certify that the hidden stock has a useful card.
  if (s.piles[13].length) return {kind:'move',move:[13,12,0],plan:[[13,12,0]],depth:1};
  return !all.length ? {kind:'dead-end'} : {kind:'unknown'};
}
