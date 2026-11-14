import facts from '../../puzzles/words/packs.generated.json';
import { defineWordSearch, type SearchBank } from '../../puzzles/words/registration';
/** No published content until the real W1 family sample and both scans pass. */
export const registration = defineWordSearch(facts as SearchBank[]);
export type Payload = import('../types').ReplayPayload<import('../../puzzles/words/game').Initial, import('../../puzzles/words/game').Action>;
export type { Action, State } from '../../puzzles/words/game';
