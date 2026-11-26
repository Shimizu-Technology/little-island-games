import React, { useEffect, useEffectEvent } from 'react';
import { View } from 'react-native';
import Animated, { Easing, ReduceMotion, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { IllustratedArt, puzzleArt } from '../art/illustrated';
import { feel } from '../components/feel';
import { useReducedMotion } from '../components/motion';
import { GameIcon, hasGameArt } from '../components/GameIcon';
import { Landmark } from '../hub/Landmarks';
import type { ShelfId } from '../learn/home';
import type { GridFeelValue } from '../puzzles/grid/preferences';
import { Icon, glyphs, theme } from '../ui';

/** Challenge ids that differ from the shelf game whose picture they share. */
const shelfPicture: Record<string, string> = { 'drop-puzzles': 'coconut-drop' };
/** The shelf picture a puzzle family already has, or null when it has none (the Cove's own cottage then stands in). */
export const motifFor = (game: string): ShelfId | null => { const id = shelfPicture[game] ?? game; return hasGameArt(id) ? id as ShelfId : null; };
/** True when the game has its approved storybook illustration. */
export const hasTileArt = (game: string) => !!puzzleArt(game);
export const MOTIF_SIZE = 56;
/**
 * A puzzle family's picture: its storybook illustration, else its own shelf art, else the Cove door from the map.
 * Decorative: the tile names the puzzle.
 */
export function CoveMotif({ game, size = MOTIF_SIZE }: { game: string; size?: number }) {
  const art = puzzleArt(game), id = art ? null : motifFor(game);
  return <View testID="cove-motif" accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: art || id ? size : size * 1.27, height: size, alignItems: 'center', justifyContent: 'center' }}>
    {art ? <IllustratedArt source={art} size={size}/> : id ? <GameIcon id={id} size={size}/> : <Landmark id="cove"/>}
  </View>;
}
/** Today's picture: a sun. */
export function TodayArt({ size = MOTIF_SIZE }: { size?: number }) {
  return <View testID="cove-today-art" accessible={false} importantForAccessibility="no-hide-descendants"><Icon glyph={glyphs.Sun} weight="fill" size={size} tone="ink"/></View>;
}
/** The art a tile holds, sized to the tile: an illustration fills most of it, vector art keeps its smaller size. */
export const tileArt = (game: string, width: number) => <CoveMotif game={game} size={hasTileArt(game) ? Math.round(width * 0.72) : Math.max(40, Math.min(96, Math.round(width * 0.5)))}/>;
export const SECTION_ICON = { numbers: glyphs.Hash, words: glyphs.TextAa, logic: glyphs.PuzzlePiece, cards: glyphs.Cards, originals: glyphs.Sparkle, favorites: glyphs.Star } as const;
export const surfaceFor = (pastel: keyof typeof theme.pastels) => theme.pastels[pastel];

const GOLD = '#E8B958';
/** Under Reduce Motion each run jumps to its end, where these marks are invisible. */
const once = (value: SharedValue<number>, duration: number) => { value.set(0); value.set(withTiming(1, { duration, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System })); };
/**
 * Runs `once` on each `run` change unless Reduce Motion is on, read live: turning it on mid-run stops the run at its
 * invisible end, and the caller draws nothing while it stays on.
 */
function useOnce(t: SharedValue<number>, duration: number, run: unknown) {
  const reduced = useReducedMotion();
  const play = useEffectEvent(() => { if (!reduced) once(t, duration); });
  useEffect(() => { play(); }, [run]);
  useEffect(() => { if (reduced) { cancelAnimation(t); t.set(1); } }, [reduced, t]);
  return reduced;
}

/** A quick golden ring that swells and fades over a just-placed cell. */
function PlacePop({ left, top, size, nonce }: { left: number; top: number; size: number; nonce: number }) {
  const t = useSharedValue(1), reduced = useOnce(t, 260, nonce);
  const style = useAnimatedStyle(() => ({ opacity: 0.9 * (1 - t.get()), transform: [{ scale: 0.86 + 0.26 * t.get() }] }));
  return reduced ? null : <Animated.View pointerEvents="none" accessible={false} style={[{ position: 'absolute', left, top, width: size, height: size, borderRadius: 6, borderWidth: 3, borderColor: GOLD }, style]}/>;
}
/** Puzzles rounds' board feel: the placement pop and a selection tick (a no-op on web). */
export const BOARD_FEEL: GridFeelValue = { Pop: PlacePop, select: () => feel('select') };

const SPARKS = Array.from({ length: 10 }, (_, i) => ({ angle: (i / 10) * 2 * Math.PI - Math.PI / 2, reach: i % 2 ? 58 : 74, size: i % 2 ? 8 : 11, color: i % 3 === 1 ? theme.colors.coral : GOLD }));
function Spark({ angle, reach, size, color, t }: typeof SPARKS[number] & { t: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const p = t.get(), d = 16 + reach * p;
    return { opacity: p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85, transform: [{ translateX: Math.cos(angle) * d }, { translateY: Math.sin(angle) * d }, { rotate: '45deg' }, { scale: 0.5 + 0.7 * Math.sin(Math.PI * p) }] };
  });
  return <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: 2, backgroundColor: color }, style]}/>;
}
/** One golden and coral burst behind a fresh finish's picture. Decorative, never input. */
export function FinishBurst() {
  const t = useSharedValue(1), reduced = useOnce(t, 900, t);
  return <View testID="cove-finish-burst" pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
    {!reduced && SPARKS.map((spark, i) => <Spark key={i} {...spark} t={t}/>)}
  </View>;
}
