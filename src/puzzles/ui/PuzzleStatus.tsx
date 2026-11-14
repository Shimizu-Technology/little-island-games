import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Copy } from '../../components/ui';
import { Text } from '../../components/Text';
import { LARGE_TEXT, atLarge } from '../../components/wordFit';

/** The largest a puzzle's status words and buttons grow, so the board and its keys can share a screen. */
export const STATUS_MAX = 1.3;
/** The cap for the buttons and cue words around a board: `STATUS_MAX` at accessibility sizes, none below them (text is drawn exactly as before). */
export function useStatusMax() { const { fontScale } = useWindowDimensions(); return atLarge(fontScale, STATUS_MAX); }
/**
 * The line above a grid board: the puzzle's name, the skill it teaches, how many squares are filled, and the Help and Hint
 * buttons. At accessibility sizes the three facts become one wrapping line at `STATUS_MAX` (still one spoken sentence with
 * the full count), and the buttons follow on their own row (beside it where the window is wide). At every other size it is the row it always was.
 */
export function PuzzleStatus({ title, skill, count, countLabel, children }: { title: string; skill?: string; count: string; countLabel: string; children: React.ReactNode }) {
  const { width, fontScale } = useWindowDimensions(), large = fontScale >= LARGE_TEXT;
  return <View testID="puzzle-status" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, rowGap: 6 }}>
    {large ? <Copy testID="puzzle-status-line" maxFontSizeMultiplier={STATUS_MAX} accessibilityLabel={`${title}.${skill ? ` Skill: ${skill}.` : ''} ${countLabel}`} style={width < 600 ? { width: '100%' } : { flexShrink: 1 }}><Text style={{ fontWeight: '700' }}>{title}</Text>{`${skill ? ` · skill: ${skill}` : ''} · ${count}`}</Copy> : <>
      <Copy style={{ flexShrink: 1, fontWeight: '700' }}>{title}</Copy>
      {!!skill && <Copy style={{ flexShrink: 1 }}>{`· skill: ${skill}`}</Copy>}
      <Copy accessibilityLabel={countLabel}>{`· ${count}`}</Copy>
    </>}
    {children}
  </View>;
}
