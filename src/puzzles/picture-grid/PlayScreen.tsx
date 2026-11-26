import React, { useState } from 'react';
import { BoardHud } from '../../cove/boardHud';
import { Board, type PictureBoardProps } from './Board';
import { DrawBoard } from './DrawBoard';

export function PlayScreen(props: PictureBoardProps) {
  const [drawing, setDrawing] = useState(false);
  return drawing
    // Local drawing never writes to the saved Cove attempt, so it stays interactive even from a solved finish
    // and keeps its own standalone controls rather than inheriting CoveRound's saved-board HUD.
    ? <BoardHud.Provider value={null}><DrawBoard width={props.width} active onBack={() => setDrawing(false)} /></BoardHud.Provider>
    : <Board {...props} onDraw={() => setDrawing(true)} />;
}
