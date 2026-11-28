import { PanResponder, type PanResponderCallbacks, type ViewStyle, type ViewProps } from 'react-native';
import type { ReactElement } from 'react';

export type DragRegion = { left: number; top: number; width: number; height: number; radius?: number };
export function createBoardPan(callbacks: PanResponderCallbacks) { return PanResponder.create(callbacks); }
export const boardPanResponder = { create: createBoardPan };
export type BoardPan = ReturnType<typeof createBoardPan>;
export type BoardPanProps = { pan: BoardPan; enabled?: boolean; nativeRegions?: readonly DragRegion[]; axis?: 'horizontal'; children: ReactElement<ViewProps> };
export type BoardTouchProps = { enabled?: boolean; multiTouch?: boolean; children: ReactElement<ViewProps> };

/** A transparent boundary on web/Node. Adapter props never reach the host View,
 * and its original props, ref, callbacks and render tree stay byte-for-byte equivalent. */
export function BoardPanView({ children }: BoardPanProps) { return children; }
export function BoardTouchView({ children }: BoardTouchProps) { return children; }
export const nativeBoardPan = false;
export const boardTouchStyle = { touchAction: 'none' } as ViewStyle;
export const boardHorizontalTouchStyle = { touchAction: 'pan-y' } as ViewStyle;
