/**
 * Build-time only (C4, BK-24). Chooses every certified Tide Logic belt: School Levels 1-5, Endless Tide and Deep Water.
 * Each belt is built by the solver so that every wrong rule in its frame fails it, then graded. bake.ts writes the result.
 */
import { CATCHES, FRAMES, LITERALS, TERMS, gateTrace, goalSentence, routes, ruleSpace, sameRoutes, separation, signature, space, termHolds, type Frame, type FrameId, type Rule, type Side } from './rules';
import { keywordBot, noCarryBot, oneClueBot } from './bots';

export type Kind = 'write' | 'find' | 'trace';
/** One certified belt. `need` is the irreducible separating core; `trace` is School Level 5's trace question. */
export type Row = { frame: FrameId; kind: Kind; target: number[]; belt: number[]; need: number; family: string; score: number; trace?: number };

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffle = <T,>(xs: readonly T[], r: () => number) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const sequential = (f: FrameId) => f === 'bell' || f === 'flip';
const usesBell = (f: FrameId) => f !== 'color' && f !== 'size' && f !== 'two6';
const attrOf = (t: string) => { const b = t.replace(/^not /, ''); return b === 'blue' || b === 'coral' ? 'color' : b === 'big' || b === 'small' ? 'size' : b === 'bell' ? 'bell' : 'kind'; };

/** A family is what the child reads: the joins, which kinds of clue, which are NOT, and the bucket. */
export function familyOf(f: Frame, t: Rule, kind: Kind): string {
  const words = t.map((o, i) => f.slots[i].options[o]);
  const clues = f.slots.flatMap((s, i) => s.kind === 'clue' ? [words[i]] : []), joins = f.slots.flatMap((s, i) => s.kind === 'join' ? [words[i]] : []);
  switch (f.id) {
    case 'color': case 'size': return `${words[0]}-${words[1]}`;
    case 'bell': return `${words[0]}-${attrOf(words[1])}`;
    case 'flip': return `${kind}-${words[0] === 'bell' ? 'bell' : words[0] === 'not bell' ? 'no-bell' : 'clue'}`;
    case 'three': return `${kind}-${joins.join('-')}-${words.at(-1)}`;
    case 'not': return `${kind}-${joins[0]}-${clues.map(c => c.startsWith('not ') ? 'n' : 'p').join('')}-${words.at(-1)}`;
    default: return `${kind}-${joins[0]}-${clues.map(attrOf).sort().join('+')}`;
  }
}
/** Targets a child could be asked for: two different kinds of clue, no contradiction, and the frame's new idea really needed. */
function targets(f: Frame): number[][] {
  const sig2 = new Set(space(FRAMES.two7).map(x => x.sig)), sig1 = new Set(ruleSpace(FRAMES.two7).filter(r => r[0] === r[2]).map(r => signature(FRAMES.two7, r)));
  return ruleSpace(f).filter(t => {
    const words = t.map((o, i) => f.slots[i].options[o]), clues = f.slots.flatMap((s, i) => s.kind === 'clue' ? [words[i]] : []);
    if (goalSentence(f, t) === null) return false;
    if (f.id === 'flip') return true;
    if (new Set(clues.map(attrOf)).size !== clues.length) return false;
    const sig = signature(f, t);
    if (f.id === 'bell') return true;
    if (f.id === 'two6' || f.id === 'two7') return !sig1.has(sig);
    // On two-valued clues "not blue" is just coral, so a target's Not is always "no bell": the one Not with no other word.
    // Flipping the bucket also negates (coral and no bell → left is blue or bell → right), and that twin is a right answer too.
    if (f.id === 'not') return clues.includes('not bell') && clues.every(c => !c.startsWith('not ') || c === 'not bell');
    if (f.id === 'three') return !sig2.has(sig);
    return true;
  });
}
/** Greedy separating core, then trimmed until no catch can be dropped. Sequence frames keep their order and are never trimmed. */
function core(f: Frame, t: Rule, pool: readonly number[], r: () => number): number[] | null {
  const sig = signature(f, t), wrong = space(f).filter(x => x.sig !== sig).map(x => x.rule);
  let belt: number[] = [], alive = wrong;
  for (let guard = 0; alive.length && guard < 12; guard++) {
    let best: number[] = [], bestAlive = alive;
    for (const c of shuffle(pool, r)) {
      if (!sequential(f.id) && belt.includes(c)) continue;
      const next = [...belt, c], want = routes(f, t, next);
      const left = alive.filter(x => sameRoutes(routes(f, x, next), want));
      if (left.length < bestAlive.length) { best = next; bestAlive = left; }
    }
    if (!best.length) return null;
    belt = best; alive = bestAlive;
  }
  if (alive.length) return null;
  if (!sequential(f.id)) for (let i = belt.length - 1; i >= 0; i--) { const less = belt.filter((_, k) => k !== i); if (less.length && !separation(f, t, less).lucky.length) belt = less; }
  return belt;
}
const bothSides = (f: Frame, t: Rule, belt: readonly number[]) => new Set(routes(f, t, belt)).size === 2;
/** Pads the core with ordinary catches to a belt a child enjoys, keeping both buckets used. */
function beltFor(f: Frame, t: Rule, length: [number, number], r: () => number): { belt: number[]; need: number } | null {
  const pool = usesBell(f.id) ? CATCHES : CATCHES.filter(c => c < 8);
  for (let attempt = 0; attempt < 8; attempt++) {
    const c = core(f, t, pool, r);
    if (!c || c.length > length[1]) continue;
    const size = Math.max(length[0], c.length) + Math.floor(r() * (length[1] - Math.max(length[0], c.length) + 1));
    let belt = [...c];
    const extra = shuffle(pool.filter(x => sequential(f.id) || !belt.includes(x)), r);
    while (belt.length < size && extra.length) belt.push(extra.pop()!);
    if (!sequential(f.id)) belt = shuffle(belt, r);
    if (!bothSides(f, t, belt) || separation(f, t, belt).lucky.length) continue;
    return { belt, need: c.length };
  }
  return null;
}
/** Wrong behaviours that the belt catches on one catch only: the rules that nearly pass. */
export function nearMisses(f: Frame, t: Rule, belt: readonly number[]): number {
  const want = routes(f, t, belt), sig = signature(f, t), seen = new Set<string>();
  let n = 0;
  for (const x of space(f)) { if (x.sig === sig || seen.has(x.sig)) continue; seen.add(x.sig); const got = routes(f, x.rule, belt); if (got.reduce<number>((k, s, i) => k + (s === want[i] ? 0 : 1), 0) === 1) n++; }
  return n;
}
/** Whether the matching dumb player fails this belt. */
export function botFails(row: Pick<Row, 'frame' | 'kind' | 'target' | 'belt'>): boolean {
  const f = FRAMES[row.frame], want = routes(f, row.target, row.belt);
  if (row.kind === 'trace') return !sameRoutes(noCarryBot(f, row.target, row.belt), want);
  if (row.kind === 'find') return !sameRoutes(oneClueBot(f, row.belt, want), want);
  const guess = keywordBot(f, goalSentence(f, row.target) ?? '');
  return !guess || !sameRoutes(routes(f, guess, row.belt), want);
}
function score(f: Frame, kind: Kind, t: Rule, belt: readonly number[], need: number): number {
  const fail = botFails({ frame: f.id, kind, target: [...t], belt: [...belt] }) ? 100 : 0;
  if (kind === 'trace') { const g = gateTrace(f, t, belt), flips = g.filter(x => x.flips).length; return fail + flips * 10 + belt.length + (termHolds(f.slots[0].options[t[0]], belt[0]) ? 3 : 0) + t[1] * 2; }
  return fail + need * 10 + nearMisses(f, t, belt) * 2 + belt.length;
}
/** School Level 5's trace question: a catch where the target and its most tempting wrong rule part ways. */
export function traceCatch(f: Frame, t: Rule, belt: readonly number[]): number {
  const want = routes(f, t, belt), sig = signature(f, t);
  let best: { agree: number; at: number; dist: number } | null = null;
  for (const x of space(f)) {
    if (x.sig === sig) continue;
    const got = routes(f, x.rule, belt), agree = got.reduce<number>((k, s, i) => k + (s === want[i] ? 1 : 0), 0), at = got.findIndex((s, i) => s !== want[i]), dist = x.rule.reduce((k, o, i) => k + (o === t[i] ? 0 : 1), 0);
    if (!best || agree > best.agree || agree === best.agree && dist < best.dist) best = { agree, at, dist };
  }
  return best!.at;
}
type Band = { frame: FrameId; kind: Kind | Kind[]; count: number; length: [number, number]; seed: number };
export const canonicalBelt = (f: FrameId, belt: readonly number[]) => (sequential(f) ? [...belt] : [...belt].sort((a, b) => a - b)).join(',');
/** What makes two belts the same puzzle: the kind of task, the behaviour asked for and the belt (in order when order matters). */
export const semanticKey = (row: Pick<Row, 'frame' | 'kind' | 'target' | 'belt'>) => `${row.kind}|${sequential(row.frame) ? row.frame : 'plain'}|${signature(FRAMES[row.frame], row.target)}|${canonicalBelt(row.frame, row.belt)}`;
function band(b: Band, seen: Set<string>): Row[] {
  const f = FRAMES[b.frame], r = rng(b.seed), kinds = Array.isArray(b.kind) ? b.kind : [b.kind];
  const pool = shuffle(targets(f), r), byFamily = new Map<string, number[][]>();
  for (const kind of kinds) for (const t of pool) { const k = `${kind}\u0000${familyOf(f, t, kind)}`; byFamily.set(k, [...(byFamily.get(k) ?? []), t]); }
  const fams = shuffle([...byFamily.keys()], r).sort((x, y) => kinds.indexOf(x.split('\u0000')[0] as Kind) - kinds.indexOf(y.split('\u0000')[0] as Kind));
  const cap = Math.floor(b.count / 4), out: Row[] = [], used = new Map<string, number>();
  // Round-robin over families (and kinds, alternately) keeps every family at or under a quarter of the band.
  for (let round = 0; out.length < b.count && round < 64; round++) for (const key of fams) {
    if (out.length >= b.count) break;
    const kind = key.split('\u0000')[0] as Kind, list = byFamily.get(key)!, fam = key.split('\u0000')[1];
    if ((used.get(fam) ?? 0) >= cap || kinds.length > 1 && out.filter(x => x.kind === kind).length >= b.count / kinds.length) continue;
    const t = list[round % list.length];
    const made = beltFor(f, t, b.length, r);
    if (!made) continue;
    const row: Row = { frame: b.frame, kind, target: t, belt: made.belt, need: made.need, family: fam, score: score(f, kind, t, made.belt, made.need) };
    const key2 = semanticKey(row);
    if (seen.has(key2)) continue;
    seen.add(key2); used.set(fam, (used.get(fam) ?? 0) + 1); out.push(row);
  }
  if (out.length < b.count) throw new Error(`Band ${b.frame} made ${out.length} of ${b.count}.`);
  return out.sort((x, y) => x.score - y.score || x.belt.length - y.belt.length);
}
/** School rows rank easiest first; a round takes one from each quarter. */
const SCHOOL: Band[] = [
  { frame: 'color', kind: 'write', count: 40, length: [4, 5], seed: 101 },
  { frame: 'size', kind: 'write', count: 40, length: [4, 5], seed: 102 },
  { frame: 'two6', kind: 'write', count: 40, length: [5, 7], seed: 103 },
  { frame: 'bell', kind: 'write', count: 40, length: [5, 7], seed: 104 },
  { frame: 'two7', kind: 'write', count: 40, length: [6, 8], seed: 105 },
];
/** Endless Tide: one bank per tier. */
export const ENDLESS: (Band & { name: string })[] = [
  { name: 'Two clues', frame: 'two6', kind: 'write', count: 10, length: [5, 7], seed: 201 },
  { name: 'Bell first', frame: 'bell', kind: 'write', count: 10, length: [6, 8], seed: 202 },
  { name: 'Bell clues', frame: 'two7', kind: 'write', count: 10, length: [6, 8], seed: 203 },
  { name: 'Not', frame: 'not', kind: 'write', count: 10, length: [6, 8], seed: 204 },
  { name: 'Three clues', frame: 'three', kind: 'write', count: 10, length: [6, 9], seed: 205 },
  { name: 'Find it', frame: 'not', kind: 'find', count: 10, length: [6, 9], seed: 206 },
];
/** Deep Water: four steps of twelve rungs, two per tier. Find the rule climbs frames, so it is three bands. */
export const DEEP: { name: string; bands: Band[] }[] = [
  { name: 'Not', bands: [{ frame: 'not', kind: 'write', count: 12, length: [5, 8], seed: 301 }] },
  { name: 'Three clues', bands: [{ frame: 'three', kind: 'write', count: 12, length: [6, 9], seed: 302 }] },
  { name: 'Flip gate', bands: [{ frame: 'flip', kind: ['trace', 'find'], count: 12, length: [5, 8], seed: 303 }] },
  { name: 'Find the rule', bands: [{ frame: 'two7', kind: 'find', count: 4, length: [6, 8], seed: 304 }, { frame: 'not', kind: 'find', count: 4, length: [6, 9], seed: 305 }, { frame: 'three', kind: 'find', count: 4, length: [7, 10], seed: 306 }] },
];
export function generateContent() {
  const seen = new Set<string>();
  const school = SCHOOL.map(b => band(b, seen).map(row => b.frame === 'two7' ? { ...row, trace: traceCatch(FRAMES[row.frame], row.target, row.belt) } : row));
  const endless = ENDLESS.map(b => band(b, seen));
  const deep = DEEP.map(step => step.bands.flatMap(b => band(b, seen)).sort((x, y) => step.bands.length > 1 ? 0 : x.score - y.score));
  return { school, endless, deep };
}
export { LITERALS, TERMS };
export type { Side };
