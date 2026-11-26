import React from 'react';
import { View } from 'react-native';
import { GameIcon, hasGameArt } from '../components/GameIcon';
import { Landmark } from '../hub/Landmarks';
import type { ShelfId } from '../learn/home';
import { Icon, glyphs, theme } from '../ui';

/** Challenge ids that differ from the shelf game whose picture they share. */
const shelfPicture: Record<string, string> = { 'drop-puzzles': 'coconut-drop' };
/** The shelf picture a puzzle family already has, or null when it has none (the Cove's own cottage then stands in). */
export const motifFor = (game: string): ShelfId | null => { const id = shelfPicture[game] ?? game; return hasGameArt(id) ? id as ShelfId : null; };
export const MOTIF_SIZE = 56;
/** A puzzle family's picture: its own shelf art, or the Cove cottage from the map. Decorative: the tile names the puzzle. */
export function CoveMotif({ game, size = MOTIF_SIZE }: { game: string; size?: number }) {
  const id = motifFor(game);
  return <View testID="cove-motif" accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: id ? size : size * 1.27, height: size, alignItems: 'center', justifyContent: 'center' }}>{id ? <GameIcon id={id} size={size}/> : <Landmark id="cove"/>}</View>;
}
/** Today's picture: a sun. */
export function TodayArt({ size = MOTIF_SIZE }: { size?: number }) {
  return <View testID="cove-today-art" accessible={false} importantForAccessibility="no-hide-descendants"><Icon glyph={glyphs.Sun} weight="fill" size={size} tone="ink"/></View>;
}
/** The art a tile holds, sized to the tile. */
export const tileArt = (game: string, width: number) => <CoveMotif game={game} size={Math.max(40, Math.min(96, Math.round(width * 0.5)))}/>;
export const SECTION_ICON = { numbers: glyphs.Hash, words: glyphs.TextAa, logic: glyphs.PuzzlePiece, cards: glyphs.Cards, originals: glyphs.Sparkle, favorites: glyphs.Star } as const;
export const surfaceFor = (pastel: keyof typeof theme.pastels) => theme.pastels[pastel];
