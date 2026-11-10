import type { Change, MarkRules } from '../edges/marks';
import { BLACK, CROSS, EMPTY, LINE, latticeOf, solved, type LinePuzzle } from './core';
import { planHint, type Plan, type Technique } from './solver';

export const techniqueNames: Record<Technique, string> = {
  count: 'Count the sides', pearl: 'Read the pearls', loop: 'No small loops', corner: 'Corner dots', sides: 'Inside and outside', 'what-if': 'What if', chain: 'Follow it through',
};
export type Cue = { technique: Technique | 'clash' | 'mistake'; cells: number[]; dots: number[]; edges: number[]; look: string; think: string; show: string };
const plural = (n: number, one: string, many: string) => n === 1 ? `one ${one}` : `${n} ${many}`;
/** What Show me did, in words. */
function shown(set: readonly (readonly [number, number])[]) {
  const lines = set.filter(([, v]) => v === LINE).length, crosses = set.filter(([, v]) => v === CROSS).length;
  const parts = [lines ? `${plural(lines, 'line', 'lines')} drawn` : '', crosses ? `${plural(crosses, 'cross', 'crosses')} placed` : ''].filter(Boolean);
  const text = parts.join(', ');
  return text ? `${text[0].toUpperCase()}${text.slice(1)}.` : '';
}

/** Plain words for the next hint. The plan comes from the same engine that grades the bank. */
export function cueFor(p: LinePuzzle, marks: readonly number[], plan: Plan = planHint(p, marks)): Cue | null {
  const l = latticeOf(p), pearl = p.kind === 'pearl-loop';
  if (plan.kind === 'solved') return null;
  if (plan.kind === 'clash') {
    const dot = plan.dots[0], branch = dot !== undefined && l.around[dot].filter(e => marks[e] === LINE).length > 2;
    const look = branch ? (pearl ? 'Look at this cell: three lines meet here.' : 'Look at this dot: three lines meet here.') : pearl ? 'Look at this pearl.' : `Look at this ${p.kind === 'loop' ? p.clues[plan.cells[0]] : ''}.`;
    const think = branch ? 'The loop never branches. Only two lines can meet at one place.' : pearl ? (p.pearls[dot] === BLACK ? 'A black pearl must turn, and go straight through the next cell on both sides.' : 'A white pearl must go straight through, and the line must turn just before or just after it.') : 'Its lines and crosses don’t fit the number any more.';
    return { technique: 'clash', cells: plan.cells, dots: plan.dots, edges: plan.edges, look, think, show: plan.edges.length ? 'A mark that broke the rule taken away.' : '' };
  }
  if (plan.kind === 'mistake') {
    const [a, b] = l.edges[plan.edge];
    return { technique: 'mistake', cells: [], dots: [a, b], edges: [plan.edge], look: 'Check this mark.', think: 'The clues can’t all be kept with this mark here. Taking it away keeps the rest of your work.', show: 'That mark taken away.' };
  }
  const base = { technique: plan.technique, cells: plan.cells, dots: plan.dots, edges: plan.set.map(([e]) => e), show: shown(plan.set) };
  const allLines = plan.set.every(([, v]) => v === LINE), allCrosses = plan.set.every(([, v]) => v === CROSS);
  switch (plan.technique) {
    case 'count': {
      if (p.kind === 'loop' && plan.cells.length) {
        const cell = plan.cells[0], n = p.clues[cell];
        return { ...base, look: `Look at this ${n}.`, think: n === 0 ? 'A 0 has no lines around it, so every side gets a cross.' : allCrosses ? `This ${n} already has its ${plural(n, 'line', 'lines')}, so the other sides get crosses.` : `This ${n} needs every side that is still open, so they are all lines.` };
      }
      return { ...base, look: 'Look at this dot.', think: allCrosses ? 'A dot has no lines or exactly two. That decides the rest of its sides.' : 'A line never just stops. This dot has one line and only one way to go on.' };
    }
    case 'pearl': {
      const v = plan.dots[0], kind = p.kind === 'pearl-loop' ? p.pearls[v] : 0;
      if (kind === BLACK) return { ...base, look: 'Look at this black pearl.', think: 'The loop turns on a black pearl, then goes straight through the next cell on both sides. Only some directions leave room for that.' };
      if (kind) return { ...base, look: 'Look at this white pearl.', think: 'The loop goes straight through a white pearl, and turns just before or just after it. Only one way fits here.' };
      return { ...base, look: 'Look at this cell.', think: allLines ? 'The loop passes through every pearl, and a line never just stops. Here it can only go one way.' : 'A cell has no lines or exactly two. That decides the rest of its sides.' };
    }
    case 'loop': return { ...base, look: 'Look at these two line ends.', think: 'Joining them now would close a small loop while other lines are still apart. One loop must hold every line, so this gap stays open.' };
    case 'corner': return { ...base, look: 'Look at this number and the dots at its corners.', think: 'Try its sides every way that keeps the number and gives each corner dot no lines or two. Every way that works agrees here.' };
    case 'sides': return { ...base, look: 'Look at these two cells.', think: 'Every cell is inside the loop or outside it; the edge of the board is outside. A cross keeps two cells on the same side and a line switches sides. Follow them and you know whether a line goes between these two.' };
    case 'what-if': return { ...base, look: 'Look at the highlighted edge.', think: `Imagine the other choice here, then read ${pearl ? 'the pearls' : 'the numbers'} and dots. A rule breaks, so it must be this.` };
    default: return { ...base, look: 'Look at the highlighted edge.', think: 'Imagine the other choice here and follow it step by step, using every idea you know. Before long a rule breaks, so it must be this.' };
  }
}

/** Loop and Pearl Loop on the shared mark board: one place per edge, empty, line or cross. */
export const lineRules: MarkRules<LinePuzzle> = {
  places: p => latticeOf(p).edges.length,
  max: 2,
  // Any edge may hold a line or a cross; a branching or a broken clue shows as a mistake instead.
  allowed: () => true,
  legal: () => true,
  solved: (p, marks) => solved(p, marks.map(m => m === CROSS ? EMPTY : m)),
  hintMove: (p, marks): Change[] | null => {
    const plan = planHint(p, marks);
    if (plan.kind === 'place') return plan.set.map(([e, v]) => [e, v] as const);
    if (plan.kind === 'mistake') return [[plan.edge, EMPTY]];
    if (plan.kind === 'clash' && plan.edges.length) return plan.edges.map(e => [e, EMPTY] as const);
    return null;
  },
  answer: marks => marks.map(m => m === LINE ? 1 : 0).join(''),
};
