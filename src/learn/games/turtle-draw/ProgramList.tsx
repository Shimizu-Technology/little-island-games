import React from 'react';
import { View } from 'react-native';
import { C, Copy } from '../../../components/ui';
import type { Block } from './engine';
import { blockLabel } from './labels';
/** A program to read, not to edit: one row per block, a Repeat's blocks indented inside it. */
export function ProgramList({ blocks, label, testID }: { blocks: readonly Block[]; label: string; testID?: string }) {
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
