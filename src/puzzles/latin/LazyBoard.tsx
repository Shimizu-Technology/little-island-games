import React from 'react';
import type { LatinBoardProps } from './registration';

let board: typeof import('./LatinBoard').LatinBoard | undefined;
/** Registrations stay importable from Node; the native board loads on first render. */
export function LazyLatinBoard(props: LatinBoardProps) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  board ??= (require('./LatinBoard') as typeof import('./LatinBoard')).LatinBoard;
  const Board = board;
  return <Board {...props}/>;
}
