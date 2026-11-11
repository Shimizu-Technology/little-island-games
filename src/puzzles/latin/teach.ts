import { boxOf, colOf, rowOf, type Group, type LatinPuzzle } from './core';
import type { ClashRule, HintPlan, Step, Technique } from './solver';

/**
 * Short, plain names for the named techniques, as a person would say them. Internal ids such as
 * `naked-pair` are never shown: the person sees "A matching pair".
 */
export const techniqueNames: Record<Technique, string> = {
  single: 'One number left', 'hidden-single': 'Only one place', inequality: 'Greater and smaller', 'cage-sum': 'Cage totals', 'skyline-line': 'Counting roofs',
  'locked-candidates': 'Pointing and claiming', 'naked-pair': 'A matching pair', 'hidden-pair': 'A hidden pair', 'naked-triple': 'A matching triple', 'hidden-triple': 'A hidden triple',
  'x-wing': 'X-Wing', swordfish: 'Swordfish', 'xy-wing': 'XY-Wing', 'simple-coloring': 'Colour chain',
};
/** The displayed name of a technique id, or nothing for an id this version does not know. */
export const techniqueName = (id: string): string => (techniqueNames as Record<string, string>)[id] ?? '';
/** How the two colours of a chain are marked on the board, so they never rely on colour alone. */
export const chainMarks = ['●', '○'] as const;
const boxNames = (p: Pick<LatinPuzzle, 'size' | 'box'>) => {
  const across = p.box ? p.size / (p.size / p.box) : 0, down = p.box ? p.size / p.box : 0;
  return (b: number) => {
    const r = Math.floor(b / across), c = b % across;
    const v = down === 1 ? '' : r === 0 ? 'top' : r === down - 1 ? 'bottom' : 'middle', h = across === 1 ? '' : c === 0 ? 'left' : c === across - 1 ? 'right' : 'middle';
    return v === 'middle' && h === 'middle' ? 'the centre box' : `the ${[v, h].filter(Boolean).join('-')} box`;
  };
};
export const cellName = (p: LatinPuzzle, i: number) => `row ${rowOf(p, i) + 1}, column ${colOf(p, i) + 1}`;
export function groupName(p: LatinPuzzle, g: Group): string {
  if (g.kind === 'row') return `row ${g.index + 1}`;
  if (g.kind === 'column') return `column ${g.index + 1}`;
  if (g.kind === 'box') return boxNames(p)(g.index);
  if (g.kind === 'cage') return `the cage of ${p.cages[g.index].target}`;
  return `the run of ${p.cages[g.index].target}`;
}
const list = (xs: readonly (string | number)[]) => xs.length < 2 ? String(xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`;
/** The cells a person should look at for one step, and the sentence that explains it. */
export function explainStep(p: LatinPuzzle, s: Step): { look: string; think: string } {
  const [g, h] = s.groups, v = s.digits[0];
  switch (s.technique) {
    case 'single': return { look: `Look at ${cellName(p, s.focus[0])}.`, think: p.box ? 'This square can only be one number. Check its row, its column and its box.' : 'This square can only be one number. Check its row and its column.' };
    case 'hidden-single': return { look: `Look for ${v} in ${groupName(p, g)}.`, think: `${groupName(p, g)[0].toUpperCase()}${groupName(p, g).slice(1)} needs a ${v}, and only one square can take it.` };
    case 'inequality': return { look: 'Look at the arrow between the shaded cells.', think: 'The arrow points at the smaller number. Some numbers are too big or too small to fit.' };
    case 'cage-sum': return g && p.cages[g.index]?.cells.length === 1 ? { look: `Look at the one-square cage of ${s.digits[0]}.`, think: `A cage with one square just holds its number: ${s.digits[0]}.` } : { look: `Look at ${g ? groupName(p, g) : 'the shaded cage'}.`, think: `Only some numbers can make ${s.digits[0]} together here. The others cannot fit.` };
    case 'skyline-line': return { look: 'Look along the shaded line from its clue.', think: `From that edge exactly ${v} roofs can be seen. A taller roof hides every shorter roof behind it.` };
    case 'locked-candidates': return { look: `Look for ${v} in ${groupName(p, g)}.`, think: `In ${groupName(p, g)}, ${v} can only be where it meets ${groupName(p, h)}. So the rest of ${groupName(p, h)} cannot have ${v}.` };
    case 'naked-pair': case 'naked-triple': return { look: `Look at the shaded cells in ${groupName(p, g)}.`, think: `These ${s.focus.length} cells can only hold ${list(s.digits)}. They use those numbers up, so no other cell in ${groupName(p, g)} can.` };
    case 'hidden-pair': case 'hidden-triple': return { look: `Look for ${list(s.digits)} in ${groupName(p, g)}.`, think: `${list(s.digits)} only fit in these ${s.focus.length} cells of ${groupName(p, g)}. So these cells hold nothing else.` };
    case 'x-wing': case 'swordfish': {
      const lines = s.groups.filter(x => x.kind === s.groups[0].kind), crossing = s.groups.filter(x => x.kind !== s.groups[0].kind);
      return { look: `Look for ${v} in ${list(lines.map(x => groupName(p, x)))}.`, think: `In those lines ${v} only fits in ${list(crossing.map(x => groupName(p, x)))}. Each of those takes its ${v} from them, so ${v} leaves the rest of ${crossing.length === 2 ? 'both' : 'those'}.` };
    }
    case 'xy-wing': return { look: `Look at the three shaded cells, each with two numbers.`, think: `Whichever number the middle cell takes, one of the other two becomes ${s.digits[2]}. A cell that sees both of them cannot be ${s.digits[2]}.` };
    case 'simple-coloring': {
      const look = `Follow the chain of ${v}s marked with dots ${chainMarks[0]} and rings ${chainMarks[1]}. In each linked pair, one square is ${v} and the other is not.`;
      // `wrap`: two dots see each other, so every dot is false. `trap`: an outside square sees both marks.
      if (s.chain?.kind === 'wrap') return { look, think: `Dots and rings take turns along the chain, so either every dot is ${v} or every ring is. Two dots see each other and cannot both be ${v}, so no dot is ${v}. The ${v}s go on the rings.` };
      return { look, think: `Dots and rings take turns along the chain, so either every dot is ${v} or every ring is. A square that sees both a dot and a ring cannot be ${v}.` };
    }
  }
}
/**
 * `target` is the square the move changes, so the person can be taken there to try it. `marks` are a
 * colour chain's two colours, drawn with `chainMarks`.
 */
export type Cue = { look: string; think: string; show: string; focus: number[]; target?: number; technique: Technique | 'clash' | 'mistake' | null; marks?: [number[], number[]] };
const opWords: Record<string, (t: number) => string> = { '+': t => `add up to ${t}`, '-': t => `have a difference of ${t}`, '*': t => `multiply to ${t}`, '/': t => `have one ${t} times the other`, '=': t => `be ${t}` };
/** What a clash breaks, in words that fit the rule. The squares named are the gold ones on the board. */
export function clashWords(p: LatinPuzzle, rule: ClashRule): string {
  if (rule.kind === 'repeat') return `${rule.value} is in ${groupName(p, rule.group)} twice. Each number goes once in a ${rule.group.kind === 'cage' ? 'cage' : rule.group.kind}.`;
  if (rule.kind === 'cage') { const c = p.cages[rule.cage]; return `The numbers in this cage must ${opWords[c.op](c.target)}, and they do not.`; }
  if (rule.kind === 'less') return 'The arrow points at the smaller number, but the number it points at is bigger.';
  return `From that edge exactly ${rule.clue} ${rule.clue === 1 ? 'roof' : 'roofs'} should be seen, and this line shows a different number.`;
}
/** Three rungs of help for one board: where to look, why, then the move itself. */
export function cueFor(p: LatinPuzzle, plan: HintPlan): Cue {
  // The gold hint focus shows these squares whether or not clashes are shown in red.
  if (plan.kind === 'clash') return { look: 'Look at the gold squares.', think: clashWords(p, plan.rule), show: `Clear ${cellName(p, plan.erase)} and look again.`, focus: plan.cells, target: plan.erase, technique: 'clash' };
  if (plan.kind === 'mistake') return { look: `Look at ${cellName(p, plan.cell)}.`, think: 'Following the starting numbers, this number cannot stay here. Nothing breaks yet, but it will.', show: `Clear ${cellName(p, plan.cell)} and look again.`, focus: [plan.cell], target: plan.cell, technique: 'mistake' };
  if (plan.kind === 'none') return { look: 'Every number is in place.', think: '', show: '', focus: [], technique: null };
  const key = plan.steps.at(-1);
  const named = key ? explainStep(p, key) : explainStep(p, { technique: 'single', focus: [plan.cell], groups: [], digits: [plan.value], remove: [] });
  const focus = key ? [...new Set([...key.focus, plan.cell])] : [plan.cell];
  const lead = plan.steps.length > 1 ? ' That leaves one place.' : '';
  return { look: named.look, think: `${named.think}${lead}`, show: `${plan.value} goes in ${cellName(p, plan.cell)}.`, focus, target: plan.cell, technique: plan.technique, ...(key?.chain ? { marks: key.chain.colours } : {}) };
}
export const boxLabel = (p: LatinPuzzle, i: number) => boxNames(p)(boxOf(p, i));
