import React from 'react';
import type { BoardProps } from '../../types';
import { ShelfArt } from './art';
import type { GateCrabState } from './engine';

export function Art({ size }: { size: number }) {
  return <ShelfArt size={size} />;
}

// Shelves and save catalog load this file in Node tests; load native UI lazily.
let board: typeof import('./schoolBoard').SchoolBoard | undefined;
export function Board(props: BoardProps<GateCrabState>) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  board ??= (require('./schoolBoard') as typeof import('./schoolBoard')).SchoolBoard;
  return React.createElement(board, props);
}
