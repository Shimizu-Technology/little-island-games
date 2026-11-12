import React from 'react';
import type { BridgesPuzzle } from './core';
import type { EdgeBoardProps } from './registration';

let board: typeof import('./BridgesBoard').BridgesBoard | undefined;
/** Registrations stay importable from Node; the native board loads on first render. */
export function LazyBridgesBoard(props: EdgeBoardProps<BridgesPuzzle>) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  board ??= (require('./BridgesBoard') as typeof import('./BridgesBoard')).BridgesBoard;
  const Board = board;
  return <Board {...props}/>;
}
