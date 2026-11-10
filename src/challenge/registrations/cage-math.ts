import facts from '../../puzzles/latin/packs.generated.json';
import { LazyLatinBoard } from '../../puzzles/latin/LazyBoard';
import { defineLatinGame, type BankFacts, type LatinEvent, type LatinPayload, type LatinView } from '../../puzzles/latin/registration';

/** G3 Cage Math: addition first, then subtraction, then times and divide, 4×4 to grown-up 9×9. */
export const registration = defineLatinGame({ kind: 'cage-math', codec: 'latin-cage-math-1', context: 'cage-math', family: 'cage-math', banks: (facts as Record<string, BankFacts[]>)['cage-math'] ?? [], Board: LazyLatinBoard });
export type Payload = LatinPayload;
export type Action = LatinEvent;
export type State = LatinView;
