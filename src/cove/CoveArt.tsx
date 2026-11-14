import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { C, Copy, PressableScale, font } from '../components/ui';
import { Text } from '../components/Text';
import { GameIcon, hasGameArt } from '../components/GameIcon';
import { CHROME_MAX, atLarge, wordFitMultiplier } from '../components/wordFit';
import { Landmark } from '../hub/Landmarks';
import type { ShelfId } from '../learn/home';
import type { RowName } from './catalog';

/** Each puzzle family keeps one of the hub's quiet tile colours (the School subject surfaces). */
export const familySurface: Record<RowName, string> = { Words: '#E8EFF9', Numbers: '#F7EBD0', Logic: '#FBE6DC', Cards: '#DDEFF5', 'Island originals': '#E3E9F7' };
/** Challenge ids that differ from the shelf game whose picture they share. */
const shelfPicture: Record<string, string> = { 'drop-puzzles': 'coconut-drop' };
/** The shelf picture a puzzle family already has, or null when it has none (the Cove's own cottage then stands in). */
export const motifFor = (game: string): ShelfId | null => { const id = shelfPicture[game] ?? game; return hasGameArt(id) ? id as ShelfId : null; };
export const TILE_PADDING = 14, MOTIF_SIZE = 56;
/** A puzzle family's small picture: its own shelf art, or the Cove cottage from the map. Decorative: the tile names the puzzle. */
export function CoveMotif({ game, size = MOTIF_SIZE }: { game: string; size?: number }) {
  const id = motifFor(game);
  return <View testID="cove-motif" accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: id ? size : size * 1.27, height: size, alignItems: 'center', justifyContent: 'center' }}>{id ? <GameIcon id={id} size={size}/> : <Landmark id="cove"/>}</View>;
}
/** A Today card in the hub's tile style: the family's picture over its name and the puzzle's title. */
export function TodayTile({ name, detail, game, row, width, onPress }: { name: string; detail: string; game: string; row: RowName; width: number; onPress: () => void }) {
  const inner = width - 2 * TILE_PADDING - 2;
  const { fontScale } = useWindowDimensions();
  const nameMax = atLarge(fontScale, wordFitMultiplier(name, 16, inner, CHROME_MAX)), detailMax = atLarge(fontScale, wordFitMultiplier(detail, 14, inner, CHROME_MAX));
  return <PressableScale accessibilityRole="button" accessibilityLabel={`Open ${name}. ${detail}`} onPress={onPress} style={{ width, minHeight: 118, padding: TILE_PADDING, gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 26, backgroundColor: familySurface[row], borderColor: '#C7CFBA', borderWidth: 1, boxShadow: '0px 4px 0px rgba(68,89,62,.12)' }}>
    <CoveMotif game={game}/>
    <Text maxFontSizeMultiplier={nameMax} style={{ fontFamily: font, fontSize: 16, fontWeight: '700', color: C.ink, textAlign: 'center' }}>{name}</Text>
    <Copy maxFontSizeMultiplier={detailMax} style={{ fontSize: 14, lineHeight: 20, textAlign: 'center' }}>{detail}</Copy>
  </PressableScale>;
}
