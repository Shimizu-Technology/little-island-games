import type { HintCue, PublicHintRules } from '../../../puzzles/hints';
import { accepts, answerOf, attrOf, clueText, complete, emptySeating, mostUseful, nameOf, oneImpossible, place, SHORE, type CanoePuzzle, type Seating } from './rules';

/**
 * Everything on a Canoe Seats board is public: the seats, the cast and every clue card. The answer
 * follows from the cards, so help works it out from them and never from a stored solution.
 * `whole` is Check-at-the-end play, where help may not judge the seats a child has filled.
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
/** The placements that bring an item to the seat the clues give it. Only these are searched. */
function toward(p: CanoePuzzle, pos: Seating): HelpMove[] {
  const answer = answerOf(p);
  if (!answer) return [];
  return answer.flatMap((seat, i) => (pos[i] === seat ? [] : [moveOf(i, seat)]));
}
/**
 * Shared four-step help. Look points at the card that tells the most on its own. Think crosses out
 * one seat that card rules out. One step seats one friend; Show me seats the rest. With lights off,
 * One step waits while seats are filled and Show me shows an example, so help never judges a seat.
 */
export function canoeHelpRules(puzzle: CanoePuzzle, whole: boolean, keepers = false): PublicHintRules<CanoeView, HelpMove> {
  const first = mostUseful(puzzle), impossible = oneImpossible(puzzle);
  // Clue keepers hide some cards from whoever holds the device, so help points at a card without saying it.
  const say = (clue: number) => (keepers ? 'Whoever holds that card can say it out loud.' : clueText(puzzle, puzzle.clues[clue]));
  const look = (): HintCue => ({ text: `Look at this clue first. ${say(first)}`, focus: [`clue:${first}`] });
  const think = (): HintCue => impossible
    ? { text: `Think: ${the(puzzle, impossible.item)} cannot sit in seat ${impossible.seat + 1}. ${say(impossible.clue)}`, focus: [`clue:${impossible.clue}`, `cross:${impossible.item}-${impossible.seat}`] }
    : look();
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
    draft: whole ? draft : null,
    look, think,
    problem: start => ({
      start, nodeBudget: 20_000,
      key: v => v.pos.join(),
      goal: v => accepts(v.puzzle, v.pos),
      moves: v => toward(v.puzzle, v.pos),
      apply: (v, a) => { const { item, seat } = decode(a), pos = place(v.puzzle, v.pos, item, seat); return pos === v.pos ? v : { ...v, pos }; },
      // Each placement fixes at most two items (a swap), so half the misplaced items never overestimates.
      heuristic: v => { const answer = answerOf(v.puzzle); return answer ? Math.ceil(answer.filter((s, i) => v.pos[i] !== s).length / 2) : 0; },
    }),
    preserves: () => true,
    unavailable: 'These clues have no answer from here. Undo or Reset, and nothing is lost.',
  };
}
