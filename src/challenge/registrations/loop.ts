import facts from '../../puzzles/edges/packs.generated.json';
import type { MarkEvent, MarksPayload } from '../../puzzles/edges/marks';
import { defineEdgeGame, type BankFacts, type EdgeView } from '../../puzzles/edges/registration';
import { lineAdapter } from '../../puzzles/lines/adapter';
import type { LinePuzzle } from '../../puzzles/lines/core';
import { LazyLineBoard } from '../../puzzles/lines/LazyBoard';
import { loopRungs } from '../../puzzles/lines/rungs';
import { lineRules } from '../../puzzles/lines/teach';
import type { PuzzleAdapter } from '../../puzzles/types';

/** G5 Loop: six packed rungs from 5×5 to grown-up 10×10 (iPad), banks 67 onward. */
export const registration = defineEdgeGame<LinePuzzle>({
  game: 'loop', codec: 'edges-loop-1', context: 'loop', family: 'loop', banks: (facts as Record<string, BankFacts[]>)['loop'] ?? [],
  rungs: loopRungs.map(r => ({ id: r.id, tier: r.tier, title: r.title, summary: r.summary, size: `${r.cols}×${r.rows}` })),
  adapter: lineAdapter('loop') as PuzzleAdapter<LinePuzzle, unknown, unknown>, rules: lineRules, Board: LazyLineBoard,
  finished: { together: 'You closed the loop together.', helped: 'The loop is closed, with a hint along the way.', independent: 'The loop is closed by your own reasoning.' },
});
export type Payload = MarksPayload;
export type Action = MarkEvent;
export type State = EdgeView<LinePuzzle>;
