import { createBoardPan, BoardPanView, boardTouchStyle } from '../../gestures/BoardPan';
import { View } from 'react-native';
import React, { useLayoutEffect, useRef, useState } from 'react';

type Props = { children: React.ReactNode; disabled: boolean; start: () => void; move: (x: number, y: number) => void; drop: (x: number, y: number) => void; cancel: () => void; tap: () => void };
/** Own palette touches before the host ScrollView can claim them. Keep one responder for
 * the whole gesture, even while target highlighting rerenders the editor. Plan cards stay
 * ordinary pressables so their scroll pane remains scrollable. */
export function PaletteDrag(props: Props) {
  const latest = useRef(props);
  const [pressed,setPressed]=useState(false);
  useLayoutEffect(() => { latest.current = props; });
  // PanResponder.create stores handlers; these ref reads happen only when a touch arrives.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() => createBoardPan({
    onStartShouldSetPanResponderCapture: () => !latest.current.disabled,
    onPanResponderGrant: () => {setPressed(true);latest.current.start();},
    onPanResponderMove: (_, gesture) => latest.current.move(gesture.moveX, gesture.moveY),
    onPanResponderRelease: (_, gesture) => {
      setPressed(false);latest.current.cancel();
      if (Math.abs(gesture.dx) < 8 && Math.abs(gesture.dy) < 8) latest.current.tap();
      else latest.current.drop(gesture.moveX, gesture.moveY);
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: () => {setPressed(false);latest.current.cancel();},
  }));
  return <BoardPanView pan={responder} enabled={!props.disabled}><View style={{...boardTouchStyle,opacity:pressed?0.6:1,transform:[{scale:pressed?0.96:1}]}} testID="program-palette-drag" {...(!props.disabled ? responder.panHandlers : {})}>{props.children}</View></BoardPanView>;
}
