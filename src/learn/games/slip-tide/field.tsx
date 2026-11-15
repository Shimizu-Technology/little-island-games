import { useBoardGeometry } from '../../BoardSpace';
import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { useReducedMotion } from '../../../components/motion';
import { LARGE_TEXT } from '../../../components/wordFit';
import { Button, C, Copy, PressableScale } from '../../../components/ui';
import type { HintCue } from '../../../puzzles/hints';
import { GridInteraction } from '../../../puzzles/grid/preferences';
import { CoachSpot, Hand } from '../../Coach';
import { Arrow, CrabSprite, HomeEyes, LagoonArt, PoolBadge } from './art';
import { describeBoard, focusOf, slipView } from './help';
import { HOME, type Crabs, type Dir, type SlipPuzzle } from './rules';

const names_ = ['up', 'right', 'down', 'left'];
const SLIDE_MS = 62, SLIDE_MIN = 130, SLIDE_MAX = 460;
const easeSlide = Easing.bezier(0.3, 0.7, 0.3, 1);
const cellXY = (cell: number, n: number, c: number) => ({ x: (cell % n) * c, y: Math.floor(cell / n) * c });

/** One crab token: only its transform animates, so a slide costs a few native properties per frame. */
function CrabToken({ puzzle, index, cell: crab, size, reduced, glow }: { puzzle: SlipPuzzle; index: number; cell: number; size: number; reduced: boolean; glow: boolean }) {
  const start = crab === HOME ? puzzle.pools[index] : crab, xy0 = cellXY(start, puzzle.size, size);
  const x = useSharedValue(xy0.x), y = useSharedValue(xy0.y), scale = useSharedValue(crab === HOME ? 0 : 1), squash = useSharedValue(0), ripple = useSharedValue(0), halo = useSharedValue(0);
  const prev = useRef(crab), prevSize = useRef(size);
  const parked = crab !== HOME && puzzle.pools.includes(crab);
  const seat = useSharedValue(parked ? 0.82 : 1), ringX = useSharedValue(xy0.x), ringY = useSharedValue(xy0.y), ringBig = useSharedValue(0);
  useEffect(() => {
    const was = prev.current, resized = prevSize.current !== size;
    prev.current = crab; prevSize.current = size;
    const end = crab === HOME ? puzzle.pools[index] : crab, xy = cellXY(end, puzzle.size, size);
    if (resized) {
      // New board geometry (rotation, split view, text size): every token jumps to its cell. Only real moves animate.
      [x, y, scale, squash, ripple, seat].forEach(v => cancelAnimation(v));
      x.value = xy.x; y.value = xy.y; scale.value = crab === HOME ? 0 : 1; squash.value = 0; ripple.value = 0; seat.value = parked ? 0.82 : 1;
      ringX.set(xy.x); ringY.set(xy.y);
      return;
    }
    if (was === crab) return;
    seat.set(withTiming(parked ? 0.82 : 1, { duration: 140 }));
    const dist = Math.max(Math.abs(xy.x - x.value), Math.abs(xy.y - y.value)) / size, ms = Math.min(SLIDE_MAX, Math.max(SLIDE_MIN, SLIDE_MS * dist + 90));
    if (reduced) { x.value = xy.x; y.value = xy.y; scale.value = crab === HOME ? 0 : 1; return; }
    if (was === HOME && crab !== HOME) { x.value = xy.x; y.value = xy.y; scale.value = withSpring(1, { damping: 12, stiffness: 180 }); return; }
    x.value = withTiming(xy.x, { duration: ms, easing: easeSlide });
    y.value = withTiming(xy.y, { duration: ms, easing: easeSlide });
    if (crab === HOME) {
      scale.value = withSequence(withTiming(1, { duration: ms * 0.7 }), withTiming(0, { duration: 170, easing: Easing.in(Easing.quad) }));
      ringX.set(xy.x); ringY.set(xy.y); ringBig.set(1);
      ripple.value = withSequence(withTiming(0, { duration: ms * 0.7 }), withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 0 }));
    } else {
      squash.value = withSequence(withTiming(0, { duration: ms * 0.9 }), withTiming(1, { duration: 80 }), withSpring(0, { damping: 8, stiffness: 300 }));
      ringX.set(xy.x); ringY.set(xy.y); ringBig.set(0);
      ripple.value = withSequence(withTiming(0, { duration: ms * 0.9 }), withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 0 }));
    }
    // Shared values are stable; a new cell slides, a new cell size only repositions.
  }, [crab, index, parked, puzzle, reduced, seat, size, ringBig, ringX, ringY, ripple, scale, squash, x, y]);
  useEffect(() => {
    if (glow && !reduced) halo.value = withRepeat(withTiming(1, { duration: 620, easing: Easing.inOut(Easing.quad) }), -1, true);
    else halo.value = glow ? 0.7 : 0;
  }, [glow, halo, reduced]);
  const rippleXY = cellXY(puzzle.pools[index], puzzle.size, size);
  const eyes = useAnimatedStyle(() => ({ opacity: 1 - scale.value, transform: [{ translateX: rippleXY.x }, { translateY: rippleXY.y }, { scale: 0.7 + (1 - scale.value) * 0.3 }] }));
  const body = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scaleX: 1 + squash.value * 0.24 }, { scaleY: 1 - squash.value * 0.2 }, { scale: scale.value * seat.get() }],
  }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: halo.value, transform: [{ translateX: x.value }, { translateY: y.value }, { scale: 0.86 + halo.value * 0.18 }] }));
  const rippleStyle = useAnimatedStyle(() => ({ opacity: ripple.value ? (1 - ripple.value) * (ringBig.get() ? 1 : 0.65) : 0, transform: [{ translateX: ringX.get() }, { translateY: ringY.get() }, { scale: (ringBig.get() ? 0.3 : 0.45) + ripple.value * (ringBig.get() ? 1.35 : 0.85) }] }));
  return <>
    {crab === HOME && <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size }, eyes]}><HomeEyes index={index} size={size} /></Animated.View>}
    {glow && <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size, borderRadius: size / 2, borderWidth: Math.max(4, size * 0.09), borderColor: '#FFF2A8', backgroundColor: 'rgba(255,240,150,.26)' }, haloStyle]} />}
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: '#F4FFFB' }, rippleStyle]} />
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size, padding: size * 0.04 }, body]}>
      <CrabSprite index={index} size={size * 0.92} />
    </Animated.View>
  </>;
}
const boardPad = 6;
/** The one sizing rule: a square board that leaves the arrows and help reachable, and 44-point cells at 7x7 on a phone. */
export function boardCell(width: number, height: number, n: number, together: boolean) {
  const byWidth = (Math.min(width, 620) - boardPad * 2) / n, byHeight = ((together ? 300 : Math.max(320, Math.min(height, 900) - 440)) - boardPad * 2) / n;
  return Math.floor(Math.min(byWidth, byHeight, width >= 700 ? 92 : 62));
}
/** Shows a child who cannot read yet what to do: a hand sweeping across the water. */
function SwipeDemo({ size, reduced }: { size: number; reduced: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => { if (!reduced) t.set(withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 450 }), withTiming(0, { duration: 0 })), -1)); }, [reduced, t]);
  const style = useAnimatedStyle(() => ({ opacity: t.get() > 0.92 ? 0 : 1, transform: [{ translateX: size * 0.14 + t.get() * size * 0.52 }, { translateY: size * 0.5 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0 }, style]}><Hand size={Math.min(64, size * 0.2)} /></Animated.View>;
}
/** Sparks inside the board, so the win never moves the controls. Only transforms animate. */
function HomeBurst({ size }: { size: number }) {
  const t = useSharedValue(0);
  useEffect(() => { t.set(withTiming(1, { duration: 1250, easing: Easing.out(Easing.quad) })); }, [t]);
  return <View pointerEvents="none" style={{ position: 'absolute', left: size / 2, top: size / 2 }}>{Array.from({ length: 10 }, (_, i) => <Spark key={i} t={t} angle={(i / 10) * Math.PI * 2} reach={size * (i % 2 ? 0.46 : 0.34)} color={sparkColors[i % sparkColors.length]} />)}</View>;
}
const sparkColors = ['#FFC93C', '#FF8A5C', '#FFF3B0', '#4FD1A5'];
function Spark({ t, angle, reach, color }: { t: SharedValue<number>; angle: number; reach: number; color: string }) {
  const style = useAnimatedStyle(() => ({ opacity: t.get() < 0.6 ? 1 : 1 - (t.get() - 0.6) / 0.4, transform: [{ translateX: Math.cos(angle) * reach * t.get() }, { translateY: Math.sin(angle) * reach * t.get() }, { scale: 0.5 + t.get() * 0.8 }, { rotate: `${t.get() * 200}deg` }] }));
  return <Animated.View style={[{ position: 'absolute', left: -12, top: -12, width: 24, height: 24, borderRadius: 7, backgroundColor: color }, style]} />;
}
export type PlayfieldProps = {
  puzzle: SlipPuzzle;
  crabs: Crabs;
  title: string;
  steps: number;
  active: boolean;
  width: number;
  height: number;
  together?: boolean;
  names?: readonly [string, string];
  coach?: { active: boolean; done: () => void };
  canUndo: boolean;
  canReset: boolean;
  /** Returns false when the swipe cannot move anything; the board nudges instead. */
  onMove: (d: Dir) => boolean;
  onUndo: () => void;
  onReset: () => void;
  onAnother?: () => void;
  notice?: string;
  /** Shown instead of the controls when the board is finished. */
  finished?: React.ReactNode;
  /** The shared four-step help (`PuzzleHelp`), under the arrows. It owns every hint and help record. */
  help?: React.ReactNode;
  /** The public cue that help is showing: the board draws its crab, where it stops, and what stops it. */
  cue?: HintCue | null;
};
export function Playfield({ puzzle, crabs, title, steps, active, width, height, together = false, names, coach, canUndo, canReset, onMove, onUndo, onReset, onAnother, notice, finished, help, cue = null }: PlayfieldProps) {
  const reduced = useReducedMotion(), large = useWindowDimensions().fontScale >= LARGE_TEXT;
  const n = puzzle.size, solved = !!finished;
  // A landscape phone (about 400 pt tall) cannot show the board and the arrows stacked, so the arrows, the caption and
  // help sit beside the board, with the arrows as an up / left-right / down pad.
  const side = width >= 520 && height < 500, sideColumn = 236;
  const naturalCell = boardCell(side ? width - sideColumn : width, height, n, together);
  const geometry = useBoardGeometry('slip-tide', naturalCell * n + boardPad * 2, Math.min(naturalCell, 24) * n + boardPad * 2);
  const cell = geometry.measured ? Math.min(naturalCell, Math.floor((geometry.height - boardPad * 2) / n)) : naturalCell;
  const apply = useCallback((d: Dir) => {
    if (!active) return false;
    const moved = onMove(d);
    if (moved) coach?.done();
    return moved;
  }, [active, coach, onMove]);
  const fired = useSharedValue(false), nudgeX = useSharedValue(0), nudgeY = useSharedValue(0);
  const nudged = useAnimatedStyle(() => ({ transform: [{ translateX: nudgeX.get() }, { translateY: nudgeY.get() }] }));
  const nudge = useCallback((d: Dir) => {
    if (reduced) return;
    const [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][d];
    nudgeX.set(withSequence(withTiming(dx * 7, { duration: 55 }), withSpring(0, { damping: 8, stiffness: 320 })));
    nudgeY.set(withSequence(withTiming(dy * 7, { duration: 55 }), withSpring(0, { damping: 8, stiffness: 320 })));
  }, [nudgeX, nudgeY, reduced]);
  const swipe = useCallback((d: Dir) => { if (!solved && !apply(d)) nudge(d); }, [apply, nudge, solved]);
  // As a Cove grid does, the board owns the page scroll from touch-down to release, so a drag that starts on the
  // water is a swipe only: the page never scrolls under it, and a page scroll never moves the crabs.
  const hold = useContext(GridInteraction);
  useEffect(() => () => hold(false), [hold]);
  useEffect(() => { if (together) hold(false); }, [hold, together]);
  const pan = useMemo(() => Gesture.Pan().enabled(!together).maxPointers(1).minDistance(3)
    .onBegin(() => { 'worklet'; runOnJS(hold)(true); })
    .onUpdate(e => {
      'worklet';
      if (fired.get()) return;
      const ax = Math.abs(e.translationX), ay = Math.abs(e.translationY);
      if (Math.max(ax, ay) < 16 || Math.max(ax, ay) < Math.min(ax, ay) * 1.25) return;
      fired.set(true);
      runOnJS(swipe)(ax > ay ? (e.translationX > 0 ? 1 : 3) : e.translationY > 0 ? 2 : 0);
    })
    .onFinalize(() => { 'worklet'; fired.set(false); runOnJS(hold)(false); }), [fired, hold, swipe, together]);
  // Help draws only what its saved cue names, and nothing once the board is finished.
  const focus = solved ? { crab: null, stop: null, blocker: null } : focusOf(cue);
  const atXY = (c: number) => cellXY(c, n, cell);
  const nameA = names?.[0] ?? 'Player 1', nameB = names?.[1] ?? 'Player 2';
  const arrowSize = Math.min(72, Math.floor((Math.min(side ? sideColumn - 16 : width, 440) - 24) / (side ? 2 : 4)));
  const arrowsFor = (group: Dir[], label?: string) => <View key={group.join()} style={{ alignItems: 'center', gap: 4 }}>
    {label && <Copy style={{ fontSize: 13, fontWeight: '800', color: C.ink }}>{label}</Copy>}
    <View style={{ flexDirection: 'row', gap: 8 }}>{group.map(d => <PressableScale key={d} accessibilityRole="button" accessibilityLabel={`Slide all crabs ${names_[d]}`} disabled={!active || solved} onPress={() => { if (!apply(d)) nudge(d); }} style={{ width: arrowSize, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: together ? (d % 2 === 0 ? '#CFEDE6' : '#FAD9C7') : '#E8F2DF', borderWidth: together ? 3 : 2, borderColor: together ? (d % 2 === 0 ? '#2F8C7C' : '#D2693F') : '#7C9C75', opacity: solved ? 0.45 : 1 }}><Arrow dir={d} size={32} color={together ? (d % 2 === 0 ? '#3D9B8C' : '#DE7F5A') : '#3D7F73'} /></PressableScale>)}</View>
  </View>;
  const boardSize = cell * n + boardPad * 2;
  const caption = coach?.active && !steps ? (together ? 'Each person has two arrows. Talk it through.' : 'Swipe the water to slide every crab.') : notice || title;
  const header = <>
    {/* At accessibility text sizes the caption gets the full width over its own line of Undo and Reset, and this
        compact board chrome stops at 1.5x, so no word is squeezed onto a line of its own beside the buttons. */}
    <View testID="board-header" style={large ? { alignSelf: 'stretch', gap: 8, paddingHorizontal: 2 } : { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', alignSelf: 'stretch', gap: 8, paddingHorizontal: 2, minHeight: 46 }}>
      <View style={large ? undefined : { flexGrow: 1, flexShrink: 1, flexBasis: 150, minWidth: 150 }}>
        <Copy numberOfLines={large ? undefined : 2} maxFontSizeMultiplier={1.5} style={{ fontWeight: '900', color: C.ink, fontSize: 15, lineHeight: large ? undefined : 19 }}>{caption}</Copy>
        <Copy maxFontSizeMultiplier={1.5} accessibilityLabel={steps === 1 ? '1 swipe so far' : `${steps} swipes so far`} style={{ color: C.ink, fontSize: 13, lineHeight: large ? undefined : 17 }}>{steps === 1 ? '1 swipe' : `${steps} swipes`}</Copy>
      </View>
      {!finished && (() => {
        const actions = <>
          <Button quiet compact maxFontSizeMultiplier={1.5} disabled={!active || !canUndo} onPress={onUndo}>Undo</Button>
          <Button compact maxFontSizeMultiplier={1.5} disabled={!active || !canReset} onPress={onReset}>Reset</Button>
        </>;
        // Large text groups Undo and Reset on their own line; standard sizes keep them as wrapping row items, as before.
        return large ? <View testID="board-actions" style={{ flexDirection: 'row', gap: 8 }}>{actions}</View> : actions;
      })()}
    </View>
  </>;
  const board = <View testID={geometry.testID} onLayout={geometry.onLayout}>
    <CoachSpot active={!!coach?.active} handAt="none" style={{ borderRadius: 26 }}>
      <GestureDetector gesture={pan}>
        <View accessible accessibilityRole="image" accessibilityLabel={describeBoard(slipView(puzzle, crabs))} style={{ width: boardSize, height: boardSize, padding: boardPad, borderRadius: 24, backgroundColor: '#F2DFA9', borderWidth: 2, borderColor: '#A98F58', overflow: 'hidden' }}>
          <View style={{ width: cell * n, height: cell * n, borderRadius: 16, overflow: 'hidden' }}>
            <LagoonArt puzzle={puzzle} cell={cell} />
            {focus.stop !== null && <View testID="hint-stop" pointerEvents="none" style={{ position: 'absolute', left: atXY(focus.stop).x + 4, top: atXY(focus.stop).y + 4, width: cell - 8, height: cell - 8, borderRadius: (cell - 8) / 2, borderWidth: 3, borderStyle: 'dashed', borderColor: '#FFF2A8' }} />}
            {focus.blocker !== null && <View testID="hint-blocker" pointerEvents="none" style={{ position: 'absolute', left: atXY(focus.blocker).x + 2, top: atXY(focus.blocker).y + 2, width: cell - 4, height: cell - 4, borderRadius: 16, borderWidth: 3, borderColor: '#FFD36B' }} />}
            <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }, nudged]}>
              {crabs.map((c, i) => <CrabToken key={i} puzzle={puzzle} index={i} cell={c} size={cell} reduced={reduced} glow={focus.crab === i} />)}
            </Animated.View>
            {crabs.map((c, i) => {
              const under = c === HOME ? -1 : puzzle.pools.indexOf(c);
              if (under < 0 || under === i) return null;
              const badge = Math.max(16, cell * 0.36), at = atXY(c);
              return <View key={`badge-${i}`} pointerEvents="none" style={{ position: 'absolute', left: at.x + cell * 0.04, top: at.y + cell - badge * 0.98 }}><PoolBadge index={under} size={badge} /></View>;
            })}
            {solved && !reduced && <HomeBurst size={cell * n} />}
            {!!coach?.active && !steps && !together && <SwipeDemo size={cell * n} reduced={reduced} />}
          </View>
        </View>
      </GestureDetector>
    </CoachSpot>
  </View>;
  const controls = finished ?? <>
      <View testID="slip-arrows" style={side ? { alignItems: 'center', gap: 12 } : { flexDirection: 'row', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
        {together ? <>{arrowsFor([0, 2], `${nameA}: up and down`)}{arrowsFor([3, 1], `${nameB}: left and right`)}</> : side ? <View style={{ alignItems: 'center', gap: 8 }}>{arrowsFor([0])}{arrowsFor([3, 1])}{arrowsFor([2])}</View> : arrowsFor([3, 0, 2, 1])}
      </View>
      {help && <View style={{ alignSelf: 'stretch' }}>{help}</View>}
      {onAnother && <Button quiet compact disabled={!active} onPress={onAnother}>Try another</Button>}
    </>;
  if (side) return <View testID="slip-side" style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start', justifyContent: 'center' }}>
    {board}
    <View style={{ flex: 1, maxWidth: 360, gap: 12, alignItems: 'center' }}>{header}{controls}</View>
  </View>;
  return <View style={{ gap: 12, alignItems: 'center' }}>{header}{board}{controls}</View>;
}
