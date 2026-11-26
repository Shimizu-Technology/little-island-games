import React, { useState } from 'react';
import { Board, type PictureBoardProps } from './Board';
import { DrawBoard } from './DrawBoard';

export function PlayScreen(props: PictureBoardProps) {
  const [drawing, setDrawing] = useState(false);
  return drawing
    ? <DrawBoard width={props.width} active={props.active || !!props.onNext} onBack={() => setDrawing(false)} />
    : <Board {...props} onDraw={() => setDrawing(true)} />;
}
