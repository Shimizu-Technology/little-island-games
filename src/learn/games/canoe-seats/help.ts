import type { HintCue, PublicHintRules } from '../../../puzzles/hints';
import { accepts, answerOf, attrOf, clueText, complete, emptySeating, itemsOf, mostUseful, nameOf, oneImpossible, place, SHORE, type CanoePuzzle, type Seating } from './rules';

/**
 * Everything on a Canoe Seats board is public: the seats, the cast and every visible clue card.
 * The answer follows from those cards, so help works it out from them and never from a stored
 * solution or another keeper's hidden cards. `whole` is Check-at-the-end play, where help may not
 * judge the seats a child has filled.
 */
export type CanoeView = { puzzle: CanoePuzzle; pos: Seating; whole: boolean };
export const canoeView = (puzzle: CanoePuzzle, pos: Seating, whole: boolean): CanoeView => ({ puzzle, pos, whole });
/** One help action: seat an item (`item * 8 + seat + 1`), the same encoding as play. */
export type HelpMove = number;
const decode = (a: number) => ({ item: Math.floor(a / 8), seat: (a % 8) - 1 });

const the = (p: CanoePuzzle, i: number) => `the ${nameOf(p, i)}`;
export function seatWords(p: CanoePuzzle, pos: Seating, seat: number): string {
  const here = pos.map((s, i) => (s === seat ? i : -1)).filter(i => i >= 0).sort((a, b) => attrOf(p, a) - attrOf(p, b));
  if (!here.length) return 'empty';
  const [first, ...rest] = here;
  return [the(p, first), ...rest.map(i => (attrOf(p, i) === 1 ? `wearing ${the(p, i)}` : `with ${the(p, i)}`))].join(', ');
}
/** The accessible canoe: each seat from the front, and who is still on the shore. */
export function describeCanoe(p: CanoePuzzle, pos: Seating): string {
  const seats = Array.from({ length: p.n }, (_, s) => `Seat ${s + 1}${s === 0 ? ', at the front' : s === p.n - 1 ? ', at the back' : ''}: ${seatWords(p, pos, s)}`);
  const shore = pos.map((s, i) => (s === SHORE ? the(p, i) : '')).filter(Boolean);
  return `Canoe with ${p.n} seats. ${seats.join('. ')}. ${shore.length ? `On the shore: ${shore.join(', ')}.` : 'Everyone is in the canoe.'}`;
}

/** Focus ids the board draws: a clue card to look at, and a seat an item cannot take. */
export type CanoeFocus = { clue: number | null; cross: { item: number; seat: number } | null };
export function focusOf(cue: HintCue | null): CanoeFocus {
  const clue = cue?.focus.find(f => f.startsWith('clue:')), cross = cue?.focus.find(f => f.startsWith('cross:'));
  const [item, seat] = cross ? cross.slice(6).split('-').map(Number) : [];
  return { clue: clue ? Number(clue.slice(5)) : null, cross: cross ? { item, seat } : null };
}
const moveOf = (item: number, seat: number) => item * 8 + seat + 1;
/**
 * One canonical placement toward the clue-derived answer: prefer a shore item going to an empty
 * seat, then a seated item going to an empty seat, then breaking a cycle. Fixing a canonical order
 * avoids searching equivalent permutations (2^15 subsets on Rung H) and always finishes in <= items(p) moves.
 */
function stepToward(p: CanoePuzzle, pos: Seating, answer: Seating | null): HelpMove[] {
  if (!answer) return [];
  const wrong = answer.map((_, i) => i).filter(i => pos[i] !== answer[i]);
  if (!wrong.length) return [];
  const free = (i: number) => !itemsOf(p, attrOf(p, i)).some(j => j !== i && pos[j] === answer[i]);
  const pick = wrong.find(i => pos[i] === SHORE && free(i)) ?? wrong.find(free) ?? wrong[0];
  return [moveOf(pick, answer[pick])];
}
/**
 * Shared four-step help. Look points at the visible card that tells the most on its own. Think
 * crosses out one seat that card rules out. One step seats one friend; Show me seats the rest.
 * With lights off, One step waits while seats are filled and Show me shows an example, so help
 * never judges a seat. When `visibleClues` is supplied (Together keepers mode), every deduction,
 * placement and reveal is derived strictly from those visible cards alone.
 */
export function canoeHelpRules(puzzle: CanoePuzzle, whole: boolean, visibleClues?: readonly number[]): PublicHintRules<CanoeView, HelpMove> {
  const keepers = visibleClues !== undefined;
  const visible = keepers
    ? visibleClues.filter((i, idx, arr) => Number.isInteger(i) && i >= 0 && i < puzzle.clues.length && arr.indexOf(i) === idx)
    : puzzle.clues.map((_, i) => i);
  const publicPuzzle: CanoePuzzle = keepers ? { ...puzzle, clues: visible.map(i => puzzle.clues[i]) } : puzzle;
  const answer = visible.length > 0 ? answerOf(publicPuzzle) : null;
  const firstLocal = visible.length > 0 ? mostUseful(publicPuzzle) : -1;
  const first = firstLocal >= 0 ? visible[firstLocal] : -1;
  const imp = visible.length > 0 ? oneImpossible(publicPuzzle) : null;
  const impossible = imp ? { item: imp.item, seat: imp.seat, clue: visible[imp.clue] } : null;
  const partnerNeed = 'Ask your partner for a clue, or pass the device.';
  // Clue keepers hide cards from the other player, so help never reads a clue sentence aloud in keepers mode.
  const say = (clue: number) => (keepers ? 'Share this card with your partner.' : clueText(puzzle, puzzle.clues[clue]));
  const look = (): HintCue => (first >= 0
    ? { text: `Look at this clue first. ${say(first)}`, focus: [`clue:${first}`] }
    : { text: `Your partner holds the clues for this canoe. ${partnerNeed}`, focus: [] });
  const think = (): HintCue => (impossible
    ? { text: `Think: ${the(puzzle, impossible.item)} cannot sit in seat ${impossible.seat + 1}. ${say(impossible.clue)}`, focus: [`clue:${impossible.clue}`, `cross:${impossible.item}-${impossible.seat}`] }
    : keepers
      ? { text: `Your clues alone do not rule out a seat yet. ${partnerNeed}`, focus: [] }
      : look());
  const draft = {
    hasEntries: (v: CanoeView) => v.pos.some(s => s !== SHORE),
    complete: (v: CanoeView) => complete(v.puzzle, v.pos),
    opening: (v: CanoeView): CanoeView => ({ ...v, pos: emptySeating(v.puzzle) }),
    describe: (example: CanoeView): HintCue => {
      const order = Array.from({ length: puzzle.n }, (_, s) => seatWords(puzzle, example.pos, s));
      return { text: `Here is the answer, front to back: ${order.join('; ')}. Your seats are kept.`, focus: [] };
    },
  };
  return {
    draft: whole && (!keepers || answer !== null) ? draft : null,
    look, think,
    problem: start => ({
      start, nodeBudget: 20_000,
      key: v => v.pos.join(),
      goal: v => answer !== null && accepts(publicPuzzle, v.pos),
      moves: v => stepToward(v.puzzle, v.pos, answer),
      apply: (v, a) => { const { item, seat } = decode(a), pos = place(v.puzzle, v.pos, item, seat); return pos === v.pos ? v : { ...v, pos }; },
      // Each placement fixes at most two items (a swap), so half the misplaced items never overestimates.
      heuristic: v => (answer ? Math.ceil(answer.filter((s, i) => v.pos[i] !== s).length / 2) : 0),
    }),
    preserves: () => true,
    unavailable: keepers && answer === null
      ? `Your clues alone can fit more than one seating. ${partnerNeed}`
      : 'These clues have no answer from here. Undo or Reset, and nothing is lost.',
  };
}
