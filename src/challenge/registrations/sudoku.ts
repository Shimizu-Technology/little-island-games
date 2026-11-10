import facts from '../../puzzles/latin/banks.generated.json';
import { LatinBoard } from '../../puzzles/latin/LatinBoard';
import { defineLatinGame, type BankFacts, type LatinEvent, type LatinPayload, type LatinView } from '../../puzzles/latin/registration';

/** G3 Sudoku: eight packed rungs from 4×4 to grown-up 9×9, banks 40 onward. */
export const registration = defineLatinGame({ kind: 'sudoku', codec: 'latin-sudoku-1', context: 'sudoku', family: 'sudoku', banks: (facts as Record<string, BankFacts[]>).sudoku ?? [], Board: LatinBoard });
export type Payload = LatinPayload;
export type Action = LatinEvent;
export type State = LatinView;
