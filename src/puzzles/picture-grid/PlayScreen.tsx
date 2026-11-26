import React, { useState } from 'react';
import { Board, type PictureBoardProps } from './Board';
import { DrawBoard } from './DrawBoard';

export function PlayScreen(props: PictureBoardProps) {
  const [drawing, setDrawing] = useState(false);
  return drawing
    // Local drawing never writes to the saved Cove attempt, so it stays interactive even from a solved finish
    // while keeping Cove's single hosted HUD instead of mounting a second More button in the family solver.
    ? <DrawBoard width={props.width} active onBack={() => setDrawing(false)} />
    : <Board {...props} onDraw={() => setDrawing(true)} />;
}
