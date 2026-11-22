import { latinAdapter } from '../latin/adapter';
import { decodePuzzle, validPuzzle, type LatinPuzzle } from '../latin/core';

/** T1 uses the Latin rules unchanged. The legacy logic-lagoon/rules-1 adapter stays published. */
export const lagoonLatinAdapter = {
  ...latinAdapter('sudoku'), engine: 'logic-lagoon', rules: 2,
  isPayload: (x: unknown): x is LatinPuzzle => validPuzzle(x) && x.size <= 6 && ['sudoku', 'killer', 'greater-than'].includes(x.kind),
  decodePayload: (x: unknown) => { const p = decodePuzzle(x); return p && lagoonLatinAdapter.isPayload(p) ? p : null; },
  semanticKey: (d: Parameters<ReturnType<typeof latinAdapter>['semanticKey']>[0]) => `${d.payload.kind}:${latinAdapter(d.payload.kind).semanticKey(d)}`,
};
