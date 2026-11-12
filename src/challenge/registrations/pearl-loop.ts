import facts from '../../puzzles/edges/packs.generated.json';
import type { MarkEvent, MarksPayload } from '../../puzzles/edges/marks';
import { defineEdgeGame, type BankFacts, type EdgeView } from '../../puzzles/edges/registration';
import { lineAdapter } from '../../puzzles/lines/adapter';
import type { LinePuzzle } from '../../puzzles/lines/core';
import { LazyLineBoard } from '../../puzzles/lines/LazyBoard';
import { pearlRungs } from '../../puzzles/lines/rungs';
import { lineRules } from '../../puzzles/lines/teach';
import type { PuzzleAdapter } from '../../puzzles/types';

/** G5 Pearl Loop: a small pack of three rungs from 6×6 to 8×8, banks 74 onward. */
export const registration = defineEdgeGame<LinePuzzle>({
  game: 'pearl-loop', codec: 'edges-pearl-loop-1', context: 'pearl-loop', family: 'pearl-loop', banks: (facts as Record<string, BankFacts[]>)['pearl-loop'] ?? [],
  rungs: pearlRungs.map(r => ({ id: r.id, tier: r.tier, title: r.title, summary: r.summary, size: `${r.cols}×${r.rows}` })),
  adapter: lineAdapter('pearl-loop') as PuzzleAdapter<LinePuzzle, unknown, unknown>, rules: lineRules, Board: LazyLineBoard,
  finished: { together: 'You threaded every pearl together.', helped: 'Every pearl threaded, with a hint along the way.', independent: 'Every pearl threaded by your own reasoning.' },
});
export type Payload = MarksPayload;
export type Action = MarkEvent;
export type State = EdgeView<LinePuzzle>;
