import React from 'react';
import type {SolitaireBoardProps} from './SolitaireBoard';
let board:typeof import('./SolitaireBoard').SolitaireBoard|undefined;
export function LazySolitaireBoard(props:SolitaireBoardProps){
 // eslint-disable-next-line @typescript-eslint/no-require-imports
 board??=(require('./SolitaireBoard') as typeof import('./SolitaireBoard')).SolitaireBoard;
 const Board=board;return <Board key={`${props.view.deal.mode}:${props.view.deal.cards}:${props.active}`} {...props}/>;
}
