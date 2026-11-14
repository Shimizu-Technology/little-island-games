import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Copy } from '../../components/ui';
import { Text } from '../../components/Text';
import { LARGE_TEXT, atLarge } from '../../components/wordFit';

/** The largest a puzzle's status words and buttons grow, so the board and its keys can share a screen. */
export const STATUS_MAX = 1.3;
/** The cap for the buttons and cue words around a board: `STATUS_MAX` at accessibility sizes, none below them (text is drawn exactly as before). */
export function useStatusMax() { const { fontScale } = useWindowDimensions(); return atLarge(fontScale, STATUS_MAX); }
/** The one sentence the status line reads as at accessibility sizes; the height budget measures the same words. */
export const statusSentence = (title: string, skill: string | undefined, count: string) => `${title}${skill ? ` · skill: ${skill}` : ''} · ${count}`;
/**
 * The line above a grid board: the puzzle's name, the skill it teaches, how many squares are filled, and the Help and Hint
 * buttons. At accessibility sizes the three facts become one wrapping line at `STATUS_MAX` (still one spoken sentence with
 * the full count), and the buttons follow on their own row (where the window is wide they keep a column of their own and the sentence wraps in the width that is left). At every other size it is the row it always was.
 */
export function PuzzleStatus({ title, skill, count, countLabel, children }: { title: string; skill?: string; count: string; countLabel: string; children: React.ReactNode }) {
  const { width, fontScale } = useWindowDimensions(), large = fontScale >= LARGE_TEXT, wide = width >= 600;
  const sentence = <Copy testID="puzzle-status-line" maxFontSizeMultiplier={STATUS_MAX} accessibilityLabel={`${title}.${skill ? ` Skill: ${skill}.` : ''} ${countLabel}`} style={wide ? { flex: 1, minWidth: 0 } : { width: '100%' }}><Text style={{ fontWeight: '700' }}>{title}</Text>{`${skill ? ` · skill: ${skill}` : ''} · ${count}`}</Copy>;
  // A wide window keeps a fixed column for the buttons, so the sentence wraps inside what is left and the row's height is the sentence's.
  if (large && wide) return <View testID="puzzle-status" style={{ flexDirection: 'row', alignItems: 'center', columnGap: 6 }}>{sentence}<View testID="puzzle-status-buttons" style={{ flexDirection: 'row', alignItems: 'center', columnGap: 6, flexShrink: 0 }}>{children}</View></View>;
  return <View testID="puzzle-status" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, rowGap: 6 }}>
    {large ? sentence : <>
      <Copy style={{ flexShrink: 1, fontWeight: '700' }}>{title}</Copy>
      {!!skill && <Copy style={{ flexShrink: 1 }}>{`· skill: ${skill}`}</Copy>}
      <Copy accessibilityLabel={countLabel}>{`· ${count}`}</Copy>
    </>}
    {children}
  </View>;
}
