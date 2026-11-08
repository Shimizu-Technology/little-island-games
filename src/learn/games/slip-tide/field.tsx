import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useReducedMotion } from '../../../components/motion';
import { Button, C, Copy, PressableScale } from '../../../components/ui';
import { CoachSpot } from '../../Coach';
import { Arrow, CrabSprite, LagoonArt, crabLooks } from './art';
import { HOME, hintFocus, routeSearch, storedRouteFrom, type Crabs, type Dir, type HintFocus, type SlipPuzzle } from './rules';

const names_ = ['up', 'right', 'down', 'left'];
const ladder: [string, number][] = [['Look', 1], ['Think', 2], ['One step', 3], ['Show me', 4]];
const SLIDE_MS = 62, SLIDE_MIN = 130, SLIDE_MAX = 460;
const easeSlide = Easing.bezier(0.3, 0.7, 0.3, 1);
const cellXY = (cell: number, n: number, c: number) => ({ x: (cell % n) * c, y: Math.floor(cell / n) * c });
const describe = (p: SlipPuzzle, crabs: Crabs) => crabs.map((cell, i) => {
  if (cell === HOME) return `${crabLooks[i].name} is home`;
  const where = (c: number) => `row ${Math.floor(c / p.size) + 1}, column ${(c % p.size) + 1}`;
  return `${crabLooks[i].name} at ${where(cell)}, its pool at ${where(p.pools[i])}`;
}).join('. ');

/** One crab token: only its transform animates, so a slide costs a few native properties per frame. */
function CrabToken({ puzzle, index, cell: crab, size, reduced, glow }: { puzzle: SlipPuzzle; index: number; cell: number; size: number; reduced: boolean; glow: boolean }) {
  const start = crab === HOME ? puzzle.pools[index] : crab, xy0 = cellXY(start, puzzle.size, size);
  const x = useSharedValue(xy0.x), y = useSharedValue(xy0.y), scale = useSharedValue(crab === HOME ? 0 : 1), squash = useSharedValue(0), ripple = useSharedValue(0), halo = useSharedValue(0);
  const prev = useRef(crab);
  useEffect(() => {
    const was = prev.current;
    prev.current = crab;
    if (was === crab) return;
    const end = crab === HOME ? puzzle.pools[index] : crab, xy = cellXY(end, puzzle.size, size);
    const dist = Math.max(Math.abs(xy.x - x.value), Math.abs(xy.y - y.value)) / size, ms = Math.min(SLIDE_MAX, Math.max(SLIDE_MIN, SLIDE_MS * dist + 90));
    if (reduced) { x.value = xy.x; y.value = xy.y; scale.value = crab === HOME ? 0 : 1; return; }
    if (was === HOME && crab !== HOME) { x.value = xy.x; y.value = xy.y; scale.value = withSpring(1, { damping: 12, stiffness: 180 }); return; }
    x.value = withTiming(xy.x, { duration: ms, easing: easeSlide });
    y.value = withTiming(xy.y, { duration: ms, easing: easeSlide });
    if (crab === HOME) {
      scale.value = withSequence(withTiming(1, { duration: ms * 0.7 }), withTiming(0, { duration: 170, easing: Easing.in(Easing.quad) }));
      ripple.value = withSequence(withTiming(0, { duration: ms * 0.7 }), withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 0 }));
    } else {
      squash.value = withSequence(withTiming(0, { duration: ms * 0.92 }), withTiming(1, { duration: 70 }), withSpring(0, { damping: 9, stiffness: 340 }));
    }
    // Shared values are stable; only the crab's cell starts a slide.
  }, [crab, index, puzzle, reduced, size, ripple, scale, squash, x, y]);
  useEffect(() => {
    if (glow && !reduced) halo.value = withRepeat(withTiming(1, { duration: 620, easing: Easing.inOut(Easing.quad) }), -1, true);
    else halo.value = glow ? 0.7 : 0;
  }, [glow, halo, reduced]);
  const body = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scaleX: 1 + squash.value * 0.16 }, { scaleY: 1 - squash.value * 0.13 }, { scale: scale.value }],
  }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: halo.value, transform: [{ translateX: x.value }, { translateY: y.value }, { scale: 0.86 + halo.value * 0.18 }] }));
  const rippleXY = cellXY(puzzle.pools[index], puzzle.size, size);
  const rippleStyle = useAnimatedStyle(() => ({ opacity: ripple.value ? 1 - ripple.value : 0, transform: [{ translateX: rippleXY.x }, { translateY: rippleXY.y }, { scale: 0.3 + ripple.value * 1.3 }] }));
  const look = crabLooks[index % crabLooks.length];
  return <>
    {glow && <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size, borderRadius: size / 2, borderWidth: Math.max(4, size * 0.09), borderColor: '#FFF2A8', backgroundColor: 'rgba(255,240,150,.26)' }, haloStyle]} />}
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: look.fill }, rippleStyle]} />
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size, padding: size * 0.04 }, body]}>
      <CrabSprite index={index} size={size * 0.92} />
    </Animated.View>
  </>;
}
type Plan = { status: 'looking' } | { status: 'ready'; route: Dir[] } | { status: 'stuck' };
const HINT_SLICE = 300;
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
  /** Returns false when the swipe moved nothing. */
  onMove: (d: Dir) => boolean;
  onHelp: () => void;
  onUndo: () => void;
  onReset: () => void;
  onAnother?: () => void;
  /** Called after Show me has played the route out. */
  onShown?: () => void;
  notice?: string;
  /** Shown instead of the controls when the board is finished. */
  finished?: React.ReactNode;
};
export function Playfield({ puzzle, crabs, title, steps, active, width, height, together = false, names, coach, canUndo, canReset, onMove, onHelp, onUndo, onReset, onAnother, onShown, notice, finished }: PlayfieldProps) {
  const reduced = useReducedMotion();
  const latestCrabs = useRef(crabs);
  useEffect(() => { latestCrabs.current = crabs; }, [crabs]);
  const [plan, setPlan] = useState<Plan | null>(null), [hintStep, setHintStep] = useState(0), [showing, setShowing] = useState(false), [note, setNote] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null), searchCancel = useRef<(() => void) | null>(null);
  const stopHelp = useCallback(() => { if (timer.current) clearTimeout(timer.current); timer.current = null; searchCancel.current?.(); searchCancel.current = null; }, []);
  useEffect(() => stopHelp, [stopHelp]);
  const n = puzzle.size, boardPad = 6, solved = !!finished;
  const cell = Math.floor(Math.min((Math.min(width, 620) - boardPad * 2) / n, (Math.max(280, Math.min(height, 900) - 380) - boardPad * 2) / n, width >= 700 ? 92 : 62));
  const clearHints = () => { setPlan(null); setHintStep(0); setNote(''); };
  const apply = useCallback((d: Dir, hinted = false) => {
    if (!active) return false;
    const moved = onMove(d);
    if (moved) {
      coach?.done();
      if (!hinted) { setPlan(null); setHintStep(0); setNote(''); }
    }
    return moved;
  }, [active, coach, onMove]);
  const swipe = useCallback((d: Dir) => { if (!showing && !solved) apply(d); }, [apply, showing, solved]);
  const fired = useSharedValue(false);
  const pan = useMemo(() => Gesture.Pan().enabled(!together).maxPointers(1).minDistance(3)
    .onUpdate(e => {
      'worklet';
      if (fired.get()) return;
      const ax = Math.abs(e.translationX), ay = Math.abs(e.translationY);
      if (Math.max(ax, ay) < 16 || Math.max(ax, ay) < Math.min(ax, ay) * 1.25) return;
      fired.set(true);
      runOnJS(swipe)(ax > ay ? (e.translationX > 0 ? 1 : 3) : e.translationY > 0 ? 2 : 0);
    })
    .onFinalize(() => { 'worklet'; fired.set(false); }), [fired, swipe, together]);
  function findPlan(then: (p: Plan) => void) {
    const stored = storedRouteFrom(puzzle, latestCrabs.current);
    if (stored) { const p: Plan = { status: 'ready', route: stored }; setPlan(p); then(p); return; }
    // Off the stored route: search in slices so a tap never stalls a frame.
    const search = routeSearch(puzzle, latestCrabs.current, 200_000);
    setPlan({ status: 'looking' });
    let cancelled = false;
    searchCancel.current = () => { cancelled = true; };
    const slice = () => {
      if (cancelled) return;
      const r = search.run(HINT_SLICE);
      if (r.status === 'running') { timer.current = setTimeout(slice, 0); return; }
      searchCancel.current = null;
      if (r.status === 'solved') { const p: Plan = { status: 'ready', route: r.witness }; setPlan(p); then(p); }
      else { setPlan({ status: 'stuck' }); setNote('These crabs cannot get home from here. Undo or Reset, and nothing is lost.'); }
    };
    slice();
  }
  function ask(step: number) {
    if (showing) return;
    onHelp();
    setHintStep(Math.max(hintStep, step));
    findPlan(p => {
      if (p.status !== 'ready') return;
      if (step === 3) { apply(p.route[0], true); setHintStep(0); setPlan(null); }
      if (step === 4) playRoute(p.route);
    });
  }
  function playRoute(route: Dir[]) {
    setShowing(true);
    let i = 0;
    const next = () => {
      if (i >= route.length) { timer.current = setTimeout(() => { setShowing(false); onShown?.(); }, 700); return; }
      apply(route[i++], true);
      timer.current = setTimeout(next, reduced ? 260 : 620);
    };
    next();
  }
  const focus: HintFocus | null = plan?.status === 'ready' && !solved && hintStep ? hintFocus(puzzle, crabs, plan.route) : null;
  const atXY = (c: number) => cellXY(c, n, cell);
  const nameA = names?.[0] ?? 'Player 1', nameB = names?.[1] ?? 'Player 2';
  const arrowSize = Math.min(72, Math.floor((Math.min(width, 440) - 24) / 4));
  const arrowsFor = (group: Dir[], label?: string) => <View key={group.join()} style={{ alignItems: 'center', gap: 4 }}>
    {label && <Copy style={{ fontSize: 13, fontWeight: '800', color: C.ink }}>{label}</Copy>}
    <View style={{ flexDirection: 'row', gap: 8 }}>{group.map(d => <PressableScale key={d} accessibilityRole="button" accessibilityLabel={`Slide all crabs ${names_[d]}`} disabled={!active || solved || showing} onPress={() => apply(d)} style={{ width: arrowSize, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: together ? (d % 2 === 0 ? '#CFEDE6' : '#FAD9C7') : '#E8F2DF', borderWidth: 2, borderColor: '#7C9C75', opacity: solved ? 0.45 : 1 }}><Arrow dir={d} size={32} color={together ? (d % 2 === 0 ? '#3D9B8C' : '#DE7F5A') : '#3D7F73'} /></PressableScale>)}</View>
  </View>;
  const boardSize = cell * n + boardPad * 2;
  const clear = () => clearHints();
  return <View style={{ gap: 12, alignItems: 'center' }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', paddingHorizontal: 4 }}>
      <Copy style={{ fontWeight: '900', color: C.ink, fontSize: 17 }}>{title}</Copy>
      <Copy accessibilityLabel={`${steps} swipes so far`} style={{ color: C.ink, fontSize: 17 }}>Swipes {steps}</Copy>
    </View>
    <CoachSpot active={!!coach?.active} handAt="none" style={{ borderRadius: 26 }}>
      <GestureDetector gesture={pan}>
        <View accessible accessibilityRole="image" accessibilityLabel={`Lagoon board. ${describe(puzzle, crabs)}.`} style={{ width: boardSize, height: boardSize, padding: boardPad, borderRadius: 24, backgroundColor: '#F2DFA9', borderWidth: 2, borderColor: '#A98F58', overflow: 'hidden' }}>
          <View style={{ width: cell * n, height: cell * n, borderRadius: 16, overflow: 'hidden' }}>
            <LagoonArt puzzle={puzzle} cell={cell} />
            {focus && hintStep >= 2 && <View pointerEvents="none" style={{ position: 'absolute', left: atXY(focus.stop).x + 4, top: atXY(focus.stop).y + 4, width: cell - 8, height: cell - 8, borderRadius: (cell - 8) / 2, borderWidth: 3, borderStyle: 'dashed', borderColor: '#FFF2A8' }} />}
            {focus?.blocker && hintStep >= 2 && <View pointerEvents="none" style={{ position: 'absolute', left: atXY(focus.blocker.cell).x + 2, top: atXY(focus.blocker.cell).y + 2, width: cell - 4, height: cell - 4, borderRadius: 16, borderWidth: 3, borderColor: '#FFD36B' }} />}
            {crabs.map((c, i) => <CrabToken key={i} puzzle={puzzle} index={i} cell={c} size={cell} reduced={reduced} glow={hintStep > 0 && focus?.crab === i} />)}
          </View>
        </View>
      </GestureDetector>
    </CoachSpot>
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
      {together ? <>{arrowsFor([0, 2], `${nameA}: up and down`)}{arrowsFor([3, 1], `${nameB}: left and right`)}</> : arrowsFor([3, 0, 2, 1])}
    </View>
    {finished ?? <>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button quiet compact disabled={!canUndo || showing} onPress={() => { clear(); onUndo(); }}>Undo</Button>
        <Button compact disabled={!canReset || showing} onPress={() => { clear(); onReset(); }}>Reset</Button>
        {onAnother && <Button quiet compact disabled={showing} onPress={() => { stopHelp(); onAnother(); }}>Try another</Button>}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }} accessibilityRole="toolbar" accessibilityLabel="Help steps">
        {ladder.map(([label, step]) => <Button key={step} quiet compact disabled={showing || (step !== 4 && step > hintStep + 1)} selected={hintStep === step} onPress={() => ask(step)}>{label}</Button>)}
      </View>
      {(!!note || !!notice) && <View accessibilityLiveRegion="polite"><Copy style={{ color: C.ink, textAlign: 'center', fontSize: 16 }}>{note || notice}</Copy></View>}
      {hintStep === 1 && focus && <Copy style={{ color: C.ink, textAlign: 'center', fontSize: 16 }}>Look at this crab. It gets home first on the best route.</Copy>}
      {hintStep >= 2 && focus && <Copy style={{ color: C.ink, textAlign: 'center', fontSize: 16 }}>{focus.blocker ? 'See what stops it, right there.' : 'It can slide all the way to that spot.'}</Copy>}
      {plan?.status === 'looking' && <Copy style={{ color: C.ink, textAlign: 'center', fontSize: 16 }}>Thinking…</Copy>}
      {together && <Copy style={{ color: C.ink, textAlign: 'center', fontSize: 15 }}>Each person has two arrows. Talk it through.</Copy>}
    </>}
  </View>;
}
