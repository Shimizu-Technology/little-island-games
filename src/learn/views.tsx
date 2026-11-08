import type { ComponentType } from 'react';
import type { BoardProps } from './types';
export type LearnView = { Board: ComponentType<BoardProps<unknown>>; Art: ComponentType<{ size: number }> };
export { registeredViews as views } from './generated/views';
