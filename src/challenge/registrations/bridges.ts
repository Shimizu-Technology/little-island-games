import facts from '../../puzzles/edges/packs.generated.json';
import { bridgesAdapter } from '../../puzzles/edges/adapter';
import type { BridgesPuzzle } from '../../puzzles/edges/core';
import { LazyBridgesBoard } from '../../puzzles/edges/LazyBoard';
import type { MarkEvent, MarksPayload } from '../../puzzles/edges/marks';
import { defineEdgeGame, type BankFacts, type EdgeView } from '../../puzzles/edges/registration';
import { bridgesRungs } from '../../puzzles/edges/rungs';
import { bridgesRules } from '../../puzzles/edges/teach';
import type { PuzzleAdapter } from '../../puzzles/types';

/** G5 Bridges: seven packed rungs from 5×5 to grown-up 10×12, banks 60 onward. */
export const registration = defineEdgeGame<BridgesPuzzle>({
  game: 'bridges', codec: 'edges-bridges-1', context: 'bridges', family: 'bridges', banks: (facts as Record<string, BankFacts[]>).bridges ?? [],
  rungs: bridgesRungs.map(r => ({ id: r.id, tier: r.tier, title: r.title, summary: r.summary, size: `${r.width}×${r.height}` })),
  adapter: bridgesAdapter() as PuzzleAdapter<BridgesPuzzle, unknown, unknown>, rules: bridgesRules, Board: LazyBridgesBoard,
  finished: { together: 'You joined every island together.', helped: 'Every island joined, with a hint along the way.', independent: 'Every island joined by your own reasoning.' },
});
export type Payload = MarksPayload;
export type Action = MarkEvent;
export type State = EdgeView<BridgesPuzzle>;
