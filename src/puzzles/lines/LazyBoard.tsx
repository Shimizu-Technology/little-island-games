import React from 'react';
import type { LinePuzzle } from './core';
import type { EdgeBoardProps } from '../edges/registration';

let board: typeof import('./LineBoard').LineBoard | undefined;
/** Registrations stay importable from Node; the native board loads on first render. */
export function LazyLineBoard(props: EdgeBoardProps<LinePuzzle>) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  board ??= (require('./LineBoard') as typeof import('./LineBoard')).LineBoard;
  const Board = board;
  return <Board {...props}/>;
}
