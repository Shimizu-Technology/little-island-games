import React, { memo } from 'react';
import { Image, type ImageSourcePropType, type ImageStyle, type StyleProp } from 'react-native';

/**
 * Art Batch 1 (approved 26 Nov 2026): transparent 512×512 storybook WebPs, about 448 KB in all. Every source is a
 * static `require` so Metro bundles each file on iOS, Android and web; a door or game missing here keeps its vector art.
 */
export type MapDoor = 'home' | 'learn' | 'arcade' | 'puzzles' | 'game-hall' | 'library';
export const MAP_DOOR_ART: Record<MapDoor, ImageSourcePropType> = {
  home: require('../../assets/art/map/home.webp'),
  learn: require('../../assets/art/map/learn.webp'),
  arcade: require('../../assets/art/map/arcade.webp'),
  puzzles: require('../../assets/art/map/puzzles.webp'),
  'game-hall': require('../../assets/art/map/game-hall.webp'),
  library: require('../../assets/art/map/library.webp'),
};
/** By registered Puzzles game id. `killer` is Cage Sudoku. */
export const PUZZLE_TILE_ART: Readonly<Partial<Record<string, ImageSourcePropType>>> = {
  sudoku: require('../../assets/art/puzzles/sudoku.webp'),
  killer: require('../../assets/art/puzzles/cage-sudoku.webp'),
  bridges: require('../../assets/art/puzzles/bridges.webp'),
  loop: require('../../assets/art/puzzles/loop.webp'),
  solitaire: require('../../assets/art/puzzles/solitaire.webp'),
  'reef-sweep': require('../../assets/art/puzzles/reef-sweep.webp'),
  'word-search': require('../../assets/art/puzzles/word-search.webp'),
  'picture-grid': require('../../assets/art/puzzles/picture-grid.webp'),
  crossword: require('../../assets/art/puzzles/crossword.webp'),
  'slip-tide': require('../../assets/art/puzzles/slip-tide.webp'),
  'canoe-seats': require('../../assets/art/puzzles/canoe-seats.webp'),
  'gate-crab': require('../../assets/art/puzzles/gate-crab.webp'),
  'shell-scale': require('../../assets/art/puzzles/shell-scale.webp'),
};
export const puzzleArt = (game: string) => PUZZLE_TILE_ART[game];

/** One illustration, square at `size` or filling `style`. Decorative: whatever holds it names it. */
export const IllustratedArt = memo(function IllustratedArt({ source, size, style }: { source: ImageSourcePropType; size?: number; style?: StyleProp<ImageStyle> }) {
  return <Image testID="illustrated-art" source={source} resizeMode="contain" fadeDuration={0} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[size === undefined ? { width: '100%', height: '100%' } : { width: size, height: size }, style]}/>;
});
