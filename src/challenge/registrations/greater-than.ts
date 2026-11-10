import facts from '../../puzzles/latin/banks.generated.json';
import { LazyLatinBoard } from '../../puzzles/latin/LazyBoard';
import { defineLatinGame, type BankFacts, type LatinEvent, type LatinPayload, type LatinView } from '../../puzzles/latin/registration';

/** G3 Greater-Than Grid: Latin rows and columns with smaller-than marks. */
export const registration = defineLatinGame({ kind: 'greater-than', codec: 'latin-greater-than-1', context: 'greater-than', family: 'greater-than', banks: (facts as Record<string, BankFacts[]>)['greater-than'] ?? [], Board: LazyLatinBoard });
export type Payload = LatinPayload;
export type Action = LatinEvent;
export type State = LatinView;
