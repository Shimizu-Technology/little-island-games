import facts from '../../puzzles/latin/banks.generated.json';
import { LazyLatinBoard } from '../../puzzles/latin/LazyBoard';
import { defineLatinGame, type BankFacts, type LatinEvent, type LatinPayload, type LatinView } from '../../puzzles/latin/registration';

/** G3 Skyline: Latin rows and columns with rooftop counts at the edges. */
export const registration = defineLatinGame({ kind: 'skyline', codec: 'latin-skyline-1', context: 'skyline', family: 'skyline', banks: (facts as Record<string, BankFacts[]>)['skyline'] ?? [], Board: LazyLatinBoard });
export type Payload = LatinPayload;
export type Action = LatinEvent;
export type State = LatinView;
