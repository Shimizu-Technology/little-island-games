import React from 'react';
import { View } from 'react-native';
import { C, Copy } from '../../../components/ui';
import type { Block } from './engine';
import { blockLabel } from './labels';
/** A program to read, not to edit: one row per block, a Repeat's blocks indented inside it. */
/** The program on one wrapped line, `Repeat ×5 [ Turn 72°, Forward 60 ]`, for a narrow screen at the largest text size. */
const tight = (b: Block) => blockLabel(b).replace(/ /g, '\u00A0');
export const programText = (blocks: readonly Block[]): string => blocks.map(b => b.kind === 'repeat' ? `${tight(b)} [ ${programText(b.body)} ]` : tight(b)).join(', ');
export function ProgramList({ blocks, label, testID, compact = false }: { blocks: readonly Block[]; label: string; testID?: string; compact?: boolean }) {
  if (compact) return <View testID={testID} accessible accessibilityLabel={`${label}: ${programText(blocks)}`} style={{ padding: 8, borderRadius: 10, backgroundColor: '#F5D398' }}><Copy maxFontSizeMultiplier={1.5} style={{ fontWeight: '700', color: C.ink }}>{programText(blocks)}</Copy></View>;
  const rows = (list: readonly Block[], path: number[]): React.ReactNode => list.map((b, i) => {
    const at = [...path, i];
    return <View key={at.join('.')} accessible accessibilityLabel={`Block ${at.map(n => n + 1).join('.')}: ${blockLabel(b)}${b.kind === 'repeat' ? `, holds ${b.body.length} ${b.body.length === 1 ? 'block' : 'blocks'}` : ''}`}
      style={{ padding: 6, gap: 4, borderRadius: 10, backgroundColor: b.kind === 'repeat' ? '#F5D398' : '#DCE9E3', borderLeftWidth: path.length ? 3 : 0, borderColor: '#648B80' }}>
      <Copy maxFontSizeMultiplier={1.5} style={{ fontWeight: b.kind === 'repeat' ? '800' : '600', color: C.ink }}>{b.kind === 'repeat' ? `↻ ${blockLabel(b)}` : blockLabel(b)}</Copy>
      {b.kind === 'repeat' && <View style={{ gap: 4 }}>{rows(b.body, at)}</View>}
    </View>;
  });
  return <View testID={testID} accessibilityLabel={label} style={{ gap: 4 }}>{rows(blocks, [])}</View>;
}
