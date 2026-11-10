import facts from '../../puzzles/latin/banks.generated.json';
import { LazyLatinBoard } from '../../puzzles/latin/LazyBoard';
import { defineLatinGame, type BankFacts, type LatinEvent, type LatinPayload, type LatinView } from '../../puzzles/latin/registration';

/** G3 Cage Sudoku: Sudoku boxes plus sum cages with no repeats. */
export const registration = defineLatinGame({ kind: 'killer', codec: 'latin-killer-1', context: 'killer', family: 'killer', banks: (facts as Record<string, BankFacts[]>)['killer'] ?? [], Board: LazyLatinBoard });
export type Payload = LatinPayload;
export type Action = LatinEvent;
export type State = LatinView;
