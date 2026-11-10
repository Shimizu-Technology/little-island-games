import facts from '../../puzzles/latin/packs.generated.json';
import { LazyLatinBoard } from '../../puzzles/latin/LazyBoard';
import { defineLatinGame, type BankFacts, type LatinEvent, type LatinPayload, type LatinView } from '../../puzzles/latin/registration';

/** G3 Sudoku: eight packed rungs from 4×4 to grown-up 9×9, banks 40 onward. */
export const registration = defineLatinGame({ kind: 'sudoku', codec: 'latin-sudoku-1', context: 'sudoku', family: 'sudoku', banks: (facts as Record<string, BankFacts[]>).sudoku ?? [], Board: LazyLatinBoard });
export type Payload = LatinPayload;
export type Action = LatinEvent;
export type State = LatinView;
