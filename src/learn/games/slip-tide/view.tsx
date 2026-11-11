import React from 'react';
import type { BoardProps } from '../../types';
import { ShelfArt } from './art';
import type { SlipState } from './engine';

export function Art({ size }: { size: number }) { return <ShelfArt size={size} />; }

// Shelves and the save catalog load this file in plain Node tests; only a live screen needs the native board.
let board: typeof import('./schoolBoard').SchoolBoard | undefined;
export function Board(props: BoardProps<SlipState>) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  board ??= (require('./schoolBoard') as typeof import('./schoolBoard')).SchoolBoard;
  return React.createElement(board, props);
}
