import type { HintCue, PublicHintRules } from '../../../puzzles/hints';
import { crabNames, dirs, gridOf, HOME, hintFocus, homeAll, crabsKey, slideOn, storedRouteFrom, type Crabs, type Dir, type SlipPuzzle } from './rules';

/** Everything on a Slip Tide board is public: bounds, rocks, crabs and pools. The view carries no route. */
export type SlipView = { size: number; rocks: readonly number[]; pools: readonly number[]; crabs: Crabs };
export const slipView = (p: SlipPuzzle, crabs: Crabs): SlipView => ({ size: p.size, rocks: p.rocks, pools: p.pools, crabs });
const board = (v: SlipView): SlipPuzzle => ({ size: v.size, rocks: v.rocks, crabs: v.crabs, pools: v.pools, route: '' });

export const where = (cell: number, size: number) => `row ${Math.floor(cell / size) + 1}, column ${(cell % size) + 1}`;
const list = (items: string[]) => items.length < 2 ? items.join('') : `${items.slice(0, -1).join('; ')}; and ${items.at(-1)}`;
/** The accessible board: its bounds, every rock, then each crab and its pool, so a VoiceOver player can plan a swipe. */
export function describeBoard(v: SlipView): string {
  const rocks = [...v.rocks].sort((a, b) => a - b).map(c => where(c, v.size));
  const crabs = v.crabs.map((cell, i) => cell === HOME ? `the ${crabNames[i]} is home` : `the ${crabNames[i]} is at ${where(cell, v.size)}, its pool at ${where(v.pools[i], v.size)}`);
  return [
    `Lagoon board, ${v.size} rows by ${v.size} columns. The edges stop every crab`,
    rocks.length ? `${rocks.length === 1 ? 'A rock' : 'Rocks'} at ${list(rocks)}` : 'No rocks',
    ...crabs.map(c => c[0].toUpperCase() + c.slice(1)),
  ].join('. ') + '.';
}

/** Focus ids the board draws: the crab to look at, where it stops next, and what stops it. */
export type SlipFocus = { crab: number | null; stop: number | null; blocker: number | null };
export function focusOf(cue: HintCue | null): SlipFocus {
  const read = (kind: string) => { const id = cue?.focus.find(f => f.startsWith(`${kind}:`)); return id ? Number(id.slice(kind.length + 1)) : null; };
  return { crab: read('crab'), stop: read('stop'), blocker: read('blocker') };
}

/**
 * Shared four-step help for one board. Look and Think point at the first crab the next route brings
 * home and where the next swipe leaves it, without naming a direction. The stored route is only a
 * shortcut while the child is exactly on it; anywhere else the same slide rule is searched exactly.
 */
export function slipHelpRules(puzzle: SlipPuzzle): PublicHintRules<SlipView, Dir> {
  return {
    draft: null,
    look: () => ({ text: 'Every crab is home.', focus: [] }),
    think: () => ({ text: 'Every crab is home.', focus: [] }),
    problem: start => {
      const grid = gridOf(board(start));
      return {
        start, nodeBudget: 200_000, key: v => crabsKey(v.crabs), goal: v => homeAll(v.crabs),
        moves: v => dirs.filter(d => slideOn(grid, v.crabs, d) !== v.crabs),
        apply: (v, d) => { const crabs = slideOn(grid, v.crabs, d); return crabs === v.crabs ? v : { ...v, crabs }; },
      };
    },
    preserves: () => true,
    known: v => v.size === puzzle.size && v.crabs.length === puzzle.crabs.length ? storedRouteFrom(puzzle, v.crabs) : null,
    routeCue: (v, step, route) => {
      const f = hintFocus(board(v), v.crabs, route as Dir[]);
      if (!f) return { text: 'Every crab is home.', focus: [] };
      const name = crabNames[f.crab];
      if (step === 'look') return { text: `Look at the ${name}, at ${where(v.crabs[f.crab], v.size)}. Its pool is at ${where(f.pool, v.size)}.`, focus: [`crab:${f.crab}`] };
      const next = slideOn(gridOf(board(v)), v.crabs, route[0]), other = f.blocker ? crabNames[next.indexOf(f.blocker.cell)] : undefined;
      const stopper = !f.blocker ? 'The edge stops it there.' : f.blocker.kind === 'rock' ? 'A rock stops it there.' : `The ${other ?? 'other crab'} stops it there.`;
      const text = next[f.crab] === HOME ? `Think: the ${name} can slide right into its pool.`
        : f.stop === v.crabs[f.crab] ? `Think: the ${name} stays where it is for now, while another crab moves. ${stopper}`
        : `Think: the ${name} can slide to ${where(f.stop, v.size)}. ${stopper}`;
      return { text, focus: [`crab:${f.crab}`, `stop:${f.stop}`, ...(f.blocker ? [`blocker:${f.blocker.cell}`] : [])] };
    },
    unavailable: 'These crabs cannot get home from here. Undo or Reset, and nothing is lost.',
  };
}
