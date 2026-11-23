/** Dumb players (C4). Each stands for a shortcut a child might try; the top rungs are graded so these shortcuts fail. */
import { FRAMES, LITERALS, routes, termHolds, type Frame, type Rule, type Side } from './rules';

const WORDS: Record<string, string> = { blue: 'blue', coral: 'coral', big: 'big', small: 'small', fish: 'fish', shell: 'shell', shells: 'shell', bell: 'bell' };
const attr = (t: string) => t === 'blue' || t === 'coral' ? 'color' : t === 'big' || t === 'small' ? 'size' : t === 'bell' ? 'bell' : 'kind';
/** Copies the clue words of the goal sentence in order, joins them all with AND, and ignores "without" and "right after". */
export function keywordBot(f: Frame, sentence: string): number[] | null {
  const terms: string[] = [];
  for (const w of sentence.toLowerCase().match(/[a-z]+/g) ?? []) { const t = WORDS[w]; if (t && !terms.some(x => attr(x) === attr(t))) terms.push(t); }
  const side = /\b(?:go|goes|catches)\s+(left|right)\b/i.exec(sentence)?.[1] ?? /\b(left|right)\b/i.exec(sentence)?.[1];
  if (!side) return null;
  const s = side === 'left' ? 0 : 1, idx = (slot: number, t: string | undefined) => t === undefined ? -1 : f.slots[slot].options.indexOf(t);
  let rule: number[];
  switch (f.id) {
    case 'color': case 'size': rule = [idx(0, terms[0]), s]; break;
    case 'two6': case 'two7': case 'not': rule = [idx(0, terms[0]), 0, idx(2, terms[1]), s]; break;
    case 'three': rule = [idx(0, terms[0]), 0, idx(2, terms[1]), 0, idx(4, terms[2]), s]; break;
    case 'bell': rule = [0, idx(1, terms.find(t => t !== 'bell')), s]; break;
    case 'flip': return null;
  }
  return rule.every(x => x >= 0) ? rule : null;
}
/** Find the rule by one clue: the single clue (or, at the flip gate, the plain bell) that agrees with the most catches. */
export function oneClueBot(f: Frame, belt: readonly number[], want: readonly Side[]): Side[] {
  const tries: Side[][] = f.id === 'flip'
    ? [0, 1].map(start => routes(FRAMES.flip, [LITERALS.indexOf('bell'), start], belt))
    : LITERALS.flatMap(l => ([0, 1] as Side[]).map(yes => belt.map(c => termHolds(l, c) ? yes : (1 - yes) as Side)));
  const agree = (r: Side[]) => r.reduce<number>((n, s, i) => n + (s === want[i] ? 1 : 0), 0);
  return tries.reduce((a, b) => agree(b) > agree(a) ? b : a);
}
/** Traces the flip gate without carrying it: only the catch that flips goes the other way. */
export function noCarryBot(f: Frame, t: Rule, belt: readonly number[]): Side[] {
  const trigger = f.slots[0].options[t[0]], start = t[1] as Side;
  return belt.map(c => termHolds(trigger, c) ? (1 - start) as Side : start);
}
