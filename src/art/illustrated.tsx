import React, { memo } from 'react';
import { Image, type ImageSourcePropType, type ImageStyle, type StyleProp } from 'react-native';
import type { ArcadeId } from '../arcade/types';

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
  'cage-math': require('../../assets/art/puzzles/cage-math.webp'),
  'greater-than': require('../../assets/art/puzzles/greater-than.webp'),
  bridges: require('../../assets/art/puzzles/bridges.webp'),
  loop: require('../../assets/art/puzzles/loop.webp'),
  'pearl-loop': require('../../assets/art/puzzles/pearl-loop.webp'),
  skyline: require('../../assets/art/puzzles/skyline.webp'),
  solitaire: require('../../assets/art/puzzles/solitaire.webp'),
  freecell: require('../../assets/art/puzzles/freecell.webp'),
  'reef-sweep': require('../../assets/art/puzzles/reef-sweep.webp'),
  'word-search': require('../../assets/art/puzzles/word-search.webp'),
  'picture-grid': require('../../assets/art/puzzles/picture-grid.webp'),
  crossword: require('../../assets/art/puzzles/crossword.webp'),
  'slip-tide': require('../../assets/art/puzzles/slip-tide.webp'),
  'canoe-seats': require('../../assets/art/puzzles/canoe-seats.webp'),
  'gate-crab': require('../../assets/art/puzzles/gate-crab.webp'),
  'shell-scale': require('../../assets/art/puzzles/shell-scale.webp'),
};
export const WORD_TILE_ART: Readonly<Record<'word-hunt' | 'anagrams', ImageSourcePropType>> = {
  'word-hunt': require('../../assets/art/tiles/word-hunt.webp'),
  anagrams: require('../../assets/art/tiles/anagrams.webp'),
};
export const hasWordArt = (id: string): id is keyof typeof WORD_TILE_ART => Object.hasOwn(WORD_TILE_ART, id);
export function WordGameArt({ id, size }: { id: keyof typeof WORD_TILE_ART; size?: number }) {
  return <IllustratedArt source={WORD_TILE_ART[id]} size={size}/>;
}
export const puzzleArt = (game: string) => PUZZLE_TILE_ART[game];

const arcadeArtSources: Readonly<Record<ArcadeId, ImageSourcePropType>> = {
  'fruit-bat-flight': require('../../assets/art/arcade/fruit-bat-flight.webp'),
  'lagoon-run': require('../../assets/art/arcade/lagoon-run.webp'),
  'crab-crossing': require('../../assets/art/arcade/crab-crossing.webp'),
  'palm-patrol': require('../../assets/art/arcade/palm-patrol.webp'),
  'beach-ball': require('../../assets/art/arcade/beach-ball.webp'),
  'rail-parade': require('../../assets/art/arcade/rail-parade.webp'),
  'reef-builder': require('../../assets/art/arcade/reef-builder.webp'),
  'canoe-cargo': require('../../assets/art/arcade/canoe-cargo.webp'),
  'shell-song': require('../../assets/art/arcade/shell-song.webp'),
};
export const hasArcadeArt = (id: string): id is ArcadeId => Object.hasOwn(arcadeArtSources, id);

export function ArcadeArt({ id, size }: { id: ArcadeId; size?: number }) {
  return <IllustratedArt source={arcadeArtSources[id]} size={size}/>;
}

export type LearnSubjectId = 'reading' | 'numbers' | 'science' | 'thinking' | 'coding' | 'chamoru';

const learnSubjectSources: Readonly<Record<LearnSubjectId, () => ImageSourcePropType>> = {
  reading: () => require('../../assets/art/learn/reading.webp'),
  numbers: () => require('../../assets/art/learn/numbers.webp'),
  science: () => require('../../assets/art/learn/science.webp'),
  thinking: () => require('../../assets/art/learn/thinking.webp'),
  coding: () => require('../../assets/art/learn/coding.webp'),
  chamoru: () => require('../../assets/art/learn/chamoru.webp'),
};
export const hasLearnSubjectArt = (id: string): id is LearnSubjectId => Object.hasOwn(learnSubjectSources, id);

export function LearnSubjectArt({ id, size }: { id: LearnSubjectId; size?: number }) {
  return <IllustratedArt source={learnSubjectSources[id]()} size={size}/>;
}

export type GameHallArtId =
  | 'coconut-drop'
  | 'fishing-nets'
  | 'hidden-canoes'
  | 'shell-pits'
  | 'tic-tac-toe'
  | 'checkers'
  | 'memory'
  | 'maze'
  | 'word-rescue'
  | 'numbers'
  | 'go-fish'
  | 'crazy-eights'
  | 'racer'
  | 'island-mystery'
  | 'word-imposter';

export const GAME_HALL_TILE_ART: Readonly<Record<GameHallArtId, ImageSourcePropType>> = {
  'coconut-drop': require('../../assets/art/game-hall/coconut-drop.webp'),
  'fishing-nets': require('../../assets/art/game-hall/fishing-nets.webp'),
  'hidden-canoes': require('../../assets/art/game-hall/hidden-canoes.webp'),
  'shell-pits': require('../../assets/art/game-hall/shell-pits.webp'),
  'tic-tac-toe': require('../../assets/art/game-hall/tic-tac-toe.webp'),
  checkers: require('../../assets/art/game-hall/checkers.webp'),
  memory: require('../../assets/art/game-hall/memory.webp'),
  maze: require('../../assets/art/game-hall/maze.webp'),
  'word-rescue': require('../../assets/art/game-hall/word-rescue.webp'),
  numbers: require('../../assets/art/game-hall/numbers.webp'),
  'go-fish': require('../../assets/art/game-hall/go-fish.webp'),
  'crazy-eights': require('../../assets/art/game-hall/crazy-eights.webp'),
  racer: require('../../assets/art/game-hall/racer.webp'),
  'island-mystery': require('../../assets/art/game-hall/island-mystery.webp'),
  'word-imposter': require('../../assets/art/game-hall/word-imposter.webp'),
};
export const hasGameHallArt = (id: string): id is GameHallArtId => Object.hasOwn(GAME_HALL_TILE_ART, id);

export function GameHallArt({ id, size }: { id: GameHallArtId; size?: number }) {
  return <IllustratedArt source={GAME_HALL_TILE_ART[id]} size={size}/>;
}

/** One illustration, square at `size` or filling `style`. Decorative: whatever holds it names it. */
export const IllustratedArt = memo(function IllustratedArt({ source, size, style }: { source: ImageSourcePropType; size?: number; style?: StyleProp<ImageStyle> }) {
  return <Image testID="illustrated-art" source={source} resizeMode="contain" fadeDuration={0} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[size === undefined ? { width: '100%', height: '100%' } : { width: size, height: size }, style]}/>;
});
