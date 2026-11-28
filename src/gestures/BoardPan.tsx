import { PanResponder, View, type PanResponderCallbacks, type ViewStyle, type ViewProps } from 'react-native';
import type { ComponentType, Ref } from 'react';

/** Browser and Node tooling use the existing responder path. Metro selects .native.tsx
 * on installed devices; no native modules are initialized by catalog/test imports. */
export function createBoardPan(callbacks: PanResponderCallbacks) { return PanResponder.create(callbacks); }
export type BoardPan = ReturnType<typeof createBoardPan>;
export const BoardPanView = View as unknown as ComponentType<ViewProps & { pan: BoardPan; enabled?: boolean; ref?: Ref<View> }>;
export const BoardTouchView = View as unknown as ComponentType<ViewProps & { enabled?: boolean; multiTouch?: boolean; ref?: Ref<View> }>;

export const nativeBoardPan = false;

export const boardTouchStyle = { touchAction: 'none' } as ViewStyle;
