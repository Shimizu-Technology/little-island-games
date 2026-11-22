import React from 'react';
import { useWindowDimensions } from 'react-native';
import { TextFit } from '../../../components/Text';
import { LARGE_TEXT } from '../../../components/wordFit';
import type { GridShellProps } from '../../../puzzles/grid/GridShell';

export function NativeGrid(props: GridShellProps) {
  const { fontScale } = useWindowDimensions();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Grid = (require('../../../puzzles/grid/GridShell') as typeof import('../../../puzzles/grid/GridShell')).GridShell;
  // Keep the selected-notes caption in this teacher's compact board region.
  return <TextFit.Provider value={fontScale >= LARGE_TEXT ? { width: props.width, ceiling: 1.3 } : null}><Grid {...props}/></TextFit.Provider>;
}
