/**
 * C4 Tide Logic rules (SC-05). One pure engine for School version 3 rounds, Endless Tide and Deep Water:
 * the belt, the rule a child writes, where each catch goes, the separation proof and every hint.
 *
 * A catch is a number 0-15: bit 0 coral (else blue), bit 1 small (else big), bit 2 shell (else fish), bit 3 a bell.
 * A rule is one option index per slot of its frame, or -1 for a slot not filled yet.
 */
export type Side = 0 | 1;
export const LEFT: Side = 0, RIGHT: Side = 1;
export const TERMS = ['blue', 'coral', 'big', 'small', 'fish', 'shell', 'bell'] as const;
export type Term = (typeof TERMS)[number];
/** Literal 0-6 is a term; 7-13 is the same term with Not. */
export const LITERALS = [...TERMS, ...TERMS.map(t => `not ${t}`)];
const T6 = TERMS.slice(0, 6) as unknown as string[], T7 = [...TERMS] as string[];
export type SlotKind = 'clue' | 'join' | 'side' | 'when' | 'start';
export type Slot = { name: string; kind: SlotKind; options: string[] };
export type FrameId = 'color' | 'size' | 'two6' | 'bell' | 'two7' | 'not' | 'three' | 'flip';
export type Frame = { id: FrameId; slots: Slot[] };
const clue = (name: string, options: string[]): Slot => ({ name, kind: 'clue', options });
const join = (name: string): Slot => ({ name, kind: 'join', options: ['and', 'or'] });
const side: Slot = { name: 'side', kind: 'side', options: ['left', 'right'] };
export const FRAMES: Record<FrameId, Frame> = {
  color: { id: 'color', slots: [clue('clue', ['blue', 'coral']), side] },
  size: { id: 'size', slots: [clue('clue', ['big', 'small']), side] },
  two6: { id: 'two6', slots: [clue('first', T6), join('join'), clue('second', T6), side] },
  /** The real bell: "on" tests the bell on this catch, "after" the bell on the catch before it. */
  bell: { id: 'bell', slots: [{ name: 'when', kind: 'when', options: ['on', 'after'] }, clue('clue', T6), side] },
  two7: { id: 'two7', slots: [clue('first', T7), join('join'), clue('second', T7), side] },
  not: { id: 'not', slots: [clue('first', LITERALS), join('join'), clue('second', LITERALS), side] },
  /** first JOIN (second JOIN third): the bracket is drawn on the board. */
  three: { id: 'three', slots: [clue('first', T7), join('join'), clue('second', T7), join('join2'), clue('third', T7), side] },
  /** The flip gate starts on one side; every catch that matches the trigger flips it as the catch arrives. */
  flip: { id: 'flip', slots: [clue('trigger', LITERALS), { name: 'start', kind: 'start', options: ['left', 'right'] }] },
};
export type Rule = readonly number[];

export const coral = (c: number) => (c & 1) === 1, small = (c: number) => (c & 2) === 2, shell = (c: number) => (c & 4) === 4, bell = (c: number) => (c & 8) === 8;
export const CATCHES = Array.from({ length: 16 }, (_, i) => i);
export const catchWords = (c: number) => `${small(c) ? 'small' : 'big'} ${coral(c) ? 'coral' : 'blue'} ${shell(c) ? 'shell' : 'fish'}${bell(c) ? ' with a bell' : ''}`;
export function termHolds(term: string, c: number): boolean {
  if (term.startsWith('not ')) return !termHolds(term.slice(4), c);
  switch (term) {
    case 'blue': return !coral(c); case 'coral': return coral(c);
    case 'big': return !small(c); case 'small': return small(c);
    case 'fish': return !shell(c); case 'shell': return shell(c);
    case 'bell': return bell(c);
  }
  throw new Error(`Unknown term ${term}`);
}
const word = (f: Frame, r: Rule, i: number) => f.slots[i].options[r[i]];
const joined = (j: string, a: boolean, b: boolean) => j === 'and' ? a && b : a || b;
/** Whether the rule's condition holds for one catch, given the catch before it. Not used by the flip gate. */
function holds(f: Frame, r: Rule, c: number, prev: number | null): boolean {
  switch (f.id) {
    case 'color': case 'size': return termHolds(word(f, r, 0), c);
    case 'two6': case 'two7': case 'not': return joined(word(f, r, 1), termHolds(word(f, r, 0), c), termHolds(word(f, r, 2), c));
    case 'three': return joined(word(f, r, 1), termHolds(word(f, r, 0), c), joined(word(f, r, 3), termHolds(word(f, r, 2), c), termHolds(word(f, r, 4), c)));
    case 'bell': return (word(f, r, 0) === 'on' ? bell(c) : prev !== null && bell(prev)) && termHolds(word(f, r, 1), c);
    case 'flip': throw new Error('The flip gate keeps its own state.');
  }
}
export const complete = (f: Frame, r: Rule) => r.length === f.slots.length && r.every((o, i) => Number.isInteger(o) && o >= 0 && o < f.slots[i].options.length);
/** Where every catch on the belt goes, in order. */
export function routes(f: Frame, r: Rule, belt: readonly number[]): Side[] {
  if (!complete(f, r)) throw new Error('Incomplete rule.');
  if (f.id === 'flip') {
    let gate = r[1] as Side;
    return belt.map(c => { if (termHolds(word(f, r, 0), c)) gate = (1 - gate) as Side; return gate; });
  }
  const yes = r[f.slots.length - 1] as Side;
  return belt.map((c, i) => holds(f, r, c, i ? belt[i - 1] : null) ? yes : (1 - yes) as Side);
}
/** Gate side as each catch arrives, before and after its own flip (for tracing the flip gate). */
export function gateTrace(f: Frame, r: Rule, belt: readonly number[]): { before: Side; flips: boolean; after: Side }[] {
  let gate = r[1] as Side;
  return belt.map(c => { const before = gate, flips = termHolds(word(f, r, 0), c); if (flips) gate = (1 - gate) as Side; return { before, flips, after: gate }; });
}
/**
 * A rule's whole behaviour, so two rules are the same rule exactly when their signatures match. Plain frames: every
 * catch. The bell frame: every catch after every possible catch before it (or none). The flip gate: which catches flip it and where it starts.
 */
export function signature(f: Frame, r: Rule): string {
  if (f.id === 'flip') return `${CATCHES.map(c => +termHolds(word(f, r, 0), c)).join('')}:${r[1]}`;
  if (f.id === 'bell') return [null, ...CATCHES].map(prev => CATCHES.map(c => routes(f, r, prev === null ? [c] : [prev, c]).at(-1)).join('')).join('|');
  return CATCHES.map(c => routes(f, r, [c])[0]).join('');
}
/** Every rule a child can build in a frame (the builder offers exactly these). */
export function ruleSpace(f: Frame): number[][] {
  let out: number[][] = [[]];
  for (const s of f.slots) out = out.flatMap(prefix => s.options.map((_, o) => [...prefix, o]));
  return out;
}
const spaces = new Map<FrameId, { rule: number[]; sig: string }[]>();
export function space(f: Frame) {
  let s = spaces.get(f.id);
  if (!s) { s = ruleSpace(f).map(rule => ({ rule, sig: signature(f, rule) })); spaces.set(f.id, s); }
  return s;
}
export const sameRoutes = (a: readonly Side[], b: readonly Side[]) => a.length === b.length && a.every((x, i) => x === b[i]);
/** The separation proof: every rule in the frame that sorts this belt like the target is the target's own behaviour. */
export function separation(f: Frame, target: Rule, belt: readonly number[]): { rules: number; behaviours: number; lucky: number[][] } {
  const want = routes(f, target, belt), sig = signature(f, target), all = space(f);
  const lucky = all.filter(x => x.sig !== sig && sameRoutes(routes(f, x.rule, belt), want)).map(x => x.rule);
  return { rules: all.length, behaviours: new Set(all.map(x => x.sig)).size, lucky };
}
/** A rule sorts the belt exactly like the target. With a proven belt this means it is the target's behaviour. */
export const sorts = (f: Frame, r: Rule, target: Rule, belt: readonly number[]) => complete(f, r) && sameRoutes(routes(f, r, belt), routes(f, target, belt));
/** The first catch the rule sends the wrong way: the concrete counterexample a miss shows. */
export function firstMiss(f: Frame, r: Rule, target: Rule, belt: readonly number[]): number | null {
  if (!complete(f, r)) return null;
  const got = routes(f, r, belt), want = routes(f, target, belt), i = got.findIndex((x, k) => x !== want[k]);
  return i < 0 ? null : i;
}
const differs = (a: Rule, b: Rule) => a.reduce((n, x, i) => n + (x === b[i] ? 0 : 1), 0);
/** The rule with the target's behaviour that is fewest blocks from the child's (ties: the target itself, then the first). */
export function nearestAnswer(f: Frame, r: Rule, target: Rule): number[] {
  const sig = signature(f, target), same = space(f).filter(x => x.sig === sig).map(x => x.rule);
  return same.reduce((best, x) => differs(x, r) < differs(best, r) ? x : best, [...target]);
}
/** One step: the first block of the child's rule that differs from the nearest right rule, set right. Null when it already sorts. */
export function oneStep(f: Frame, r: Rule, target: Rule, belt: readonly number[]): number[] | null {
  if (sorts(f, r, target, belt)) return null;
  const goal = nearestAnswer(f, r, target), i = goal.findIndex((x, k) => x !== r[k]);
  if (i < 0) return null;
  const next = [...r]; next[i] = goal[i]; return next;
}

// Words. A goal sentence never uses the rule words (if, and, or, not, then, else); the builder does.
const RULE_WORDS = /\b(if|and|or|not|then|else)\b/i;
export const usesRuleWords = (text: string) => RULE_WORDS.test(text);
type Lit = { term: Term; not: boolean };
const lit = (s: string): Lit => s.startsWith('not ') ? { term: s.slice(4) as Term, not: true } : { term: s as Term, not: false };
/** Positive form: on these two-valued clues "not blue" is coral. Only the bell has no opposite word. */
const positive = (l: Lit): Lit => !l.not || l.term === 'bell' ? l : { term: ({ blue: 'coral', coral: 'blue', big: 'small', small: 'big', fish: 'shell', shell: 'fish' } as Record<string, Term>)[l.term], not: false };
const attr = (t: Term) => t === 'blue' || t === 'coral' ? 'color' : t === 'big' || t === 'small' ? 'size' : t === 'fish' || t === 'shell' ? 'kind' : 'bell';
/** "big blue fish", "shells with a bell", "catches without a bell". Null for a contradiction such as blue coral. */
function nounPhrase(parts: readonly Lit[]): string | null {
  const ls = parts.map(positive), by = new Map<string, Lit>();
  for (const l of ls) { const a = attr(l.term), had = by.get(a); if (had && (had.term !== l.term || had.not !== l.not)) return null; by.set(a, l); }
  const size = by.get('size')?.term, color = by.get('color')?.term, kind = by.get('kind')?.term, b = by.get('bell');
  const noun = kind === 'fish' ? 'fish' : kind === 'shell' ? 'shells' : 'catches';
  return [size, color, noun].filter(Boolean).join(' ') + (b ? b.not ? ' without a bell' : ' with a bell' : '');
}
const sideWord = (s: Side) => s === LEFT ? 'left' : 'right';
const capital = (s: string) => s[0].toUpperCase() + s.slice(1);
const goes = (phrase: string, s: Side, too = false) => `${capital(phrase)} go ${sideWord(s)}${too ? ' too' : ''}.`;
const orElse = (s: Side) => `The rest go ${sideWord((1 - s) as Side)}.`;
/** The goal in everyday words, or null when the rule is a contradiction or says nothing. */
export function goalSentence(f: Frame, r: Rule): string | null {
  const w = (i: number) => word(f, r, i), s = r[f.slots.length - 1] as Side;
  switch (f.id) {
    case 'color': case 'size': return `Send ${w(0)} catches ${sideWord(s)}. ${orElse(s)}`;
    case 'two6': case 'two7': case 'not': {
      const a = lit(w(0)), b = lit(w(2));
      if (w(1) === 'and') { const p = nounPhrase([a, b]); return p && `${goes(p, s)} ${orElse(s)}`; }
      const p = nounPhrase([a]), q = nounPhrase([b]);
      return p && q && `${goes(p, s)} ${goes(q, s, true)} ${orElse(s)}`;
    }
    case 'three': {
      const [a, b, c] = [lit(w(0)), lit(w(2)), lit(w(4))];
      const groups = w(1) === 'and' ? (w(3) === 'and' ? [[a, b, c]] : [[a, b], [a, c]]) : (w(3) === 'and' ? [[a], [b, c]] : [[a], [b], [c]]);
      const phrases = groups.map(nounPhrase);
      return phrases.every(Boolean) ? `${phrases.map((p, i) => goes(p!, s, i > 0)).join(' ')} ${orElse(s)}` : null;
    }
    case 'bell': {
      const p = nounPhrase([lit(w(1))]);
      return p && (w(0) === 'on' ? `${goes(nounPhrase([lit(w(1)), { term: 'bell', not: false }])!, s)} ${orElse(s)}` : `${capital(p)} that come right after a bell go ${sideWord(s)}. ${orElse(s)}`);
    }
    case 'flip': {
      const t = positive(lit(w(0)));
      const trigger = t.term === 'bell' ? (t.not ? 'catch without a bell' : 'bell') : `${t.term === 'fish' || t.term === 'shell' ? t.term : `${t.term} catch`}`;
      return `The gate starts ${sideWord(r[1] as Side)}. Every ${trigger} flips it as it arrives. Each catch goes where the gate points.`;
    }
  }
}
/** The same rule in rule words, as the builder shows it. */
export function ruleWords(f: Frame, r: Rule): string {
  const w = (i: number) => r[i] < 0 ? '___' : word(f, r, i).toUpperCase();
  switch (f.id) {
    case 'color': case 'size': return `IF ${w(0)} → ${w(1)} · ELSE → the other side`;
    case 'two6': case 'two7': case 'not': return `IF ${w(0)} ${w(1)} ${w(2)} → ${w(3)}`;
    case 'three': return `IF ${w(0)} ${w(1)} (${w(2)} ${w(3)} ${w(4)}) → ${w(5)}`;
    case 'bell': return `IF the bell rings ${r[0] === 1 ? 'ON THE CATCH BEFORE' : r[0] === 0 ? 'ON THIS CATCH' : '___'} AND ${w(1)} → ${w(2)}`;
    case 'flip': return `GATE STARTS ${w(1)} · EVERY ${w(0)} FLIPS IT`;
  }
}
/** Help's first rung for an unfinished rule: how the rule is built, never which clues. */
export function shapeHint(f: Frame, target: Rule): string {
  const w = (i: number) => word(f, target, i);
  switch (f.id) {
    case 'color': return 'One colour decides. Pick the colour, then the bucket it goes to.';
    case 'size': return 'One size decides. Pick big or small, then the bucket.';
    case 'two6': case 'two7': case 'not': return `${w(1) === 'and' ? 'A catch needs both clues at once' : 'Either clue is enough on its own'}.${f.id === 'not' && (target[0] >= 7 || target[2] >= 7) ? ' One clue is something a catch must NOT have.' : ''}`;
    case 'three': return `Read the bracket first. ${w(1) === 'and' ? 'The first clue is always needed' : 'The first clue is enough on its own'}, and inside the bracket ${w(3) === 'and' ? 'both' : 'either'} will do.`;
    case 'bell': return w(0) === 'on' ? 'The bell matters on the catch itself.' : 'The bell changes the catch right after it, not the catch that rings.';
    case 'flip': return 'Find the catches that flip the gate. Then find where the gate starts.';
  }
}
/** Look: a pair of catches on the belt that differ in one way and land in different buckets. */
export function deciderPair(f: Frame, target: Rule, belt: readonly number[]): [number, number, string] | null {
  if (f.id === 'flip' || f.id === 'bell') return null;
  const want = routes(f, target, belt), names = ['colour', 'size', 'kind', 'bell'];
  for (let i = 0; i < belt.length; i++) for (let j = i + 1; j < belt.length; j++) {
    const x = belt[i] ^ belt[j];
    if (want[i] !== want[j] && x && (x & (x - 1)) === 0) return [i, j, names[Math.log2(x)]];
  }
  return null;
}
/** The words Look shows. Pure: the same text for the same draft. */
export function lookText(f: Frame, r: Rule, target: Rule, belt: readonly number[]): { text: string; focus: number[] } {
  const miss = firstMiss(f, r, target, belt);
  if (complete(f, r) && miss === null) return { text: 'Your rule sorts every catch. Press Run.', focus: [] };
  if (miss !== null) {
    const got = routes(f, r, belt)[miss];
    return { text: `Look at catch ${miss + 1}, the ${catchWords(belt[miss])}. Your rule sends it ${sideWord(got).toUpperCase()}, but it belongs ${sideWord((1 - got) as Side).toUpperCase()}.`, focus: [miss] };
  }
  const pair = deciderPair(f, target, belt);
  return pair ? { text: `${shapeHint(f, target)} Catches ${pair[0] + 1} and ${pair[1] + 1} differ only in ${pair[2]}, and they land in different buckets.`, focus: [pair[0], pair[1]] } : { text: shapeHint(f, target), focus: [] };
}
