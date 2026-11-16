import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { BoardPrimary, useBoardGeometry, useBoardSpace } from '../../BoardSpace';
import { CoachSpot } from '../../Coach';
import { useReducedMotion } from '../../../components/motion';
import { LARGE_TEXT } from '../../../components/wordFit';
import { Button, C, Copy, PressableScale } from '../../../components/ui';
import type { HintCue } from '../../../puzzles/hints';
import { CluePicture, Fruit, Friend, Hat, Hull, ItemArt, ink } from './art';
import { describeCanoe, focusOf, seatWords } from './help';
import { canoeHeight, canoeWidth, clueCardHeight, clueColumns, CLUE_PAGE_PHONE, cluePages, HULL_PAD, seatFloor, seatForHeight, seatForWidth, tokenSize } from './layout';
import { attrOf, clueText, itemsOf, lit, nameOf, SHORE, type CanoePuzzle, type Kind, type Seating } from './rules';

export type Keepers = { names: readonly [string, string]; keeper: 0 | 1; cover: boolean; owner: (clue: number) => 0 | 1; onPass: () => void; onReveal: () => void };
export type CanoeBoardProps = {
  puzzle: CanoePuzzle;
  pos: Seating;
  used: number;
  /** Lights on: cards light up as they come true. Off: Check at the end. */
  lights: boolean;
  won: boolean;
  /** The seating shown was checked and missed. */
  missed: boolean;
  canCheck: boolean;
  active: boolean;
  width: number;
  title: string;
  /** Sound on and narration available: a clue tap plays its line. Otherwise its words show as a caption. */
  hear: (clue: number) => boolean;
  onPlace: (item: number, seat: number) => boolean;
  onToggleUsed: (clue: number) => void;
  onCheck?: () => void;
  onUndo: () => void;
  onReset: () => void;
  canUndo: boolean;
  canReset: boolean;
  onLights?: (on: boolean) => void;
  keepers?: Keepers;
  /** A teaching board: cards of this new kind wear a "New" ribbon until tapped. */
  teach?: Kind | null;
  coach?: { active: boolean; done: () => void };
  cue?: HintCue | null;
  notice?: string;
  help?: React.ReactNode;
  finished?: React.ReactNode;
  footer?: React.ReactNode;
  header?: React.ReactNode;
};

const the = (p: CanoePuzzle, i: number) => `the ${nameOf(p, i)}`;
/** One seated item, springing in when it arrives. Only transforms animate. */
function Seated({ children, reduced, flag }: { children: React.ReactNode; reduced: boolean; flag: string }) {
  const scale = useSharedValue(1), first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!reduced) scale.set(withSequence(withTiming(0.82, { duration: 70 }), withSpring(1, { damping: 9, stiffness: 260 })));
  }, [flag, reduced, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return <Animated.View pointerEvents="none" style={style}>{children}</Animated.View>;
}
/** A gentle pulse for the card or token help points at. */
function Pulse({ on, reduced, radius, color = '#FFD24A' }: { on: boolean; reduced: boolean; radius: number; color?: string }) {
  const t = useSharedValue(0);
  useEffect(() => { t.set(on && !reduced ? withRepeat(withTiming(1, { duration: 640, easing: Easing.inOut(Easing.quad) }), -1, true) : on ? 0.8 : 0); }, [on, reduced, t]);
  const style = useAnimatedStyle(() => ({ opacity: t.get() }));
  if (!on) return null;
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -4, top: -4, right: -4, bottom: -4, borderRadius: radius + 4, borderWidth: 4, borderColor: color }, style]} />;
}
/** Sparks inside the canoe, so the win never moves the controls. */
function Burst({ width, height }: { width: number; height: number }) {
  const t = useSharedValue(0);
  useEffect(() => { t.set(withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) })); }, [t]);
  return <View pointerEvents="none" style={{ position: 'absolute', left: width / 2, top: height / 2 }}>{Array.from({ length: 12 }, (_, i) => <Spark key={i} t={t} angle={(i / 12) * Math.PI * 2} reach={Math.min(width, height * 2) * (i % 2 ? 0.46 : 0.32)} color={['#FFC93C', '#FF8A5C', '#FFF3B0', '#4FD1A5'][i % 4]} />)}</View>;
}
function Spark({ t, angle, reach, color }: { t: ReturnType<typeof useSharedValue<number>>; angle: number; reach: number; color: string }) {
  const style = useAnimatedStyle(() => ({ opacity: t.get() < 0.6 ? 1 : 1 - (t.get() - 0.6) / 0.4, transform: [{ translateX: Math.cos(angle) * reach * t.get() }, { translateY: Math.sin(angle) * reach * t.get() * 0.5 }, { scale: 0.5 + t.get() * 0.8 }, { rotate: `${t.get() * 200}deg` }] }));
  return <Animated.View style={[{ position: 'absolute', left: -10, top: -10, width: 20, height: 20, borderRadius: 6, backgroundColor: color }, style]} />;
}

export function CanoeBoard(props: CanoeBoardProps) {
  const { puzzle: p, pos, used, lights, won, missed, canCheck, active, width, title, hear, onPlace, onToggleUsed, onCheck, onUndo, onReset, canUndo, canReset, onLights, keepers, teach = null, coach, cue = null, notice, help, finished, footer, header } = props;
  const reduced = useReducedMotion(), window = useWindowDimensions(), large = window.fontScale >= LARGE_TEXT;
  const [held, setPicked] = useState<number | null>(null), [heard, setHeard] = useState<number | null>(null), [caption, setCaption] = useState(''), [page, setPage] = useState(0);
  const [met, setMet] = useState(false);
  const school = useBoardSpace();
  // Legibility first: the drawing never shrinks a seat picture below its floor; the page scrolls instead.
  const floor = seatFloor(window.width), natural = seatForWidth(width, p.n, window.width);
  const geometry = useBoardGeometry('canoe-seats', canoeHeight(natural, p.attrs), canoeHeight(floor, p.attrs));
  const seat = geometry.measured ? Math.min(natural, seatForHeight(geometry.height, p.attrs, window.width)) : natural;
  const hullW = canoeWidth(seat, p.n), hullH = canoeHeight(seat, p.attrs), pad = seat * HULL_PAD;
  const focus = won ? { clue: null, cross: null } : focusOf(cue);
  const covered = !!keepers?.cover;
  // Hosts key the board by puzzle, so a new board starts with nothing picked up. A win, a hand-over
  // or a pause puts down whatever was held.
  const live = !won && active && !covered, picked = live ? held : null;

  const drop = useCallback((item: number, seatIndex: number) => {
    if (!live) return;
    if (onPlace(item, seatIndex)) coach?.done();
    setPicked(null);
  }, [coach, live, onPlace]);
  /** With nothing picked up, a tap on a seat picks up what it touched: the hat up top, fruit low right, else the friend. */
  const tapSeat = useCallback((seatIndex: number, e?: GestureResponderEvent) => {
    if (!live) return;
    if (picked !== null) { drop(picked, seatIndex); return; }
    const here = pos.map((s, i) => (s === seatIndex ? i : -1)).filter(i => i >= 0);
    if (!here.length) return;
    const y = e?.nativeEvent.locationY ?? hullH / 2, x = e?.nativeEvent.locationX ?? seat / 2;
    const zone = y < hullH * 0.3 ? 1 : x > seat * 0.55 && y > hullH * 0.5 ? 2 : 0;
    setPicked(here.find(i => attrOf(p, i) === zone) ?? here[0]);
  }, [drop, hullH, live, p, picked, pos, seat]);
  const tapShore = useCallback((item: number) => {
    if (!live) return;
    if (picked !== null && pos[picked] !== SHORE && picked !== item) { drop(picked, SHORE); return; }
    setPicked(picked === item ? null : item);
  }, [drop, live, picked, pos]);
  const tapClue = useCallback((clue: number) => {
    if (won || covered) return;
    if (heard === clue || (used & (1 << clue))) { onToggleUsed(clue); setHeard(null); return; }
    setHeard(clue);
    if (p.clues[clue].k === teach) setMet(true);
    setCaption(hear(clue) ? '' : clueText(p, p.clues[clue]));
  }, [covered, hear, heard, onToggleUsed, p, teach, used, won]);

  // ---------- canoe ----------
  const seatViews = Array.from({ length: p.n }, (_, s) => {
    const here = pos.map((x, i) => (x === s ? i : -1)).filter(i => i >= 0);
    const friend = here.find(i => attrOf(p, i) === 0), hat = here.find(i => attrOf(p, i) === 1), fruit = here.find(i => attrOf(p, i) === 2);
    const crossed = focus.cross && focus.cross.seat === s ? focus.cross.item : null;
    const art = seat * 0.9, hatTop = p.attrs >= 2 ? seat * 0.34 : 0;
    const label = `Seat ${s + 1}${s === 0 ? ', at the front' : s === p.n - 1 ? ', at the back' : ''}: ${seatWords(p, pos, s)}`;
    const hint = picked !== null ? `Double-tap to seat ${the(p, picked)} here.` : here.length ? 'Double-tap to pick up who sits here.' : undefined;
    return <PressableScale key={s} testID={`canoe-seat-${s}`} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint} disabled={!live}
      onPress={e => tapSeat(s, e)} style={{ position: 'absolute', left: pad + s * seat, top: 0, width: seat, height: hullH - seat * 0.18, alignItems: 'center', borderRadius: 14,
        backgroundColor: picked !== null && live ? 'rgba(255,240,170,.45)' : 'transparent', borderWidth: picked !== null && live ? 2 : 0, borderColor: '#E1B251', borderStyle: 'dashed' }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: hatTop + seat * 0.02, left: (seat - art) / 2, width: art, height: art }}>
        {friend !== undefined && <Seated reduced={reduced} flag={`f${friend}`}><Friend pool={p.cast[friend]} size={art} /></Seated>}
      </View>
      {hat !== undefined && <View pointerEvents="none" style={{ position: 'absolute', top: friend !== undefined ? hatTop - seat * 0.06 : hatTop + seat * 0.3, left: seat * 0.14 }}><Seated reduced={reduced} flag={`h${hat}`}><Hat pool={p.cast[hat]} size={seat * 0.72} /></Seated></View>}
      {fruit !== undefined && <View pointerEvents="none" style={{ position: 'absolute', top: hatTop + seat * 0.62, right: -seat * 0.04 }}><Seated reduced={reduced} flag={`r${fruit}`}><Fruit pool={p.cast[fruit]} size={seat * 0.44} /></Seated></View>}
      {picked !== null && here.includes(picked) && <View pointerEvents="none" style={{ position: 'absolute', left: 2, top: 2, right: 2, bottom: 2, borderRadius: 12, borderWidth: 3, borderColor: C.teal }} />}
      {crossed !== null && <View testID="canoe-hint-cross" pointerEvents="none" style={{ position: 'absolute', top: hatTop, alignItems: 'center' }}>
        <View style={{ opacity: 0.55 }}><ItemArt attr={attrOf(p, crossed)} pool={p.cast[crossed]} size={seat * 0.7} /></View>
        <View style={{ position: 'absolute', top: seat * 0.1, width: seat * 0.6, height: seat * 0.6, borderRadius: seat, borderWidth: 4, borderColor: '#D24B3E' }} />
        <View style={{ position: 'absolute', top: seat * 0.38, width: seat * 0.66, height: 4, backgroundColor: '#D24B3E', transform: [{ rotate: '-40deg' }] }} />
      </View>}
    </PressableScale>;
  });
  const canoe = <View testID={geometry.testID} onLayout={geometry.onLayout} style={{ alignItems: 'center' }}>
    <View accessible={false} style={{ width: hullW, height: hullH }}>
      <View accessible accessibilityRole="image" accessibilityLabel={describeCanoe(p, pos)} style={{ position: 'absolute', left: 0, top: 0, width: hullW, height: hullH }}>
        <Hull width={hullW} height={hullH} seats={p.n} seat={seat} pad={pad} />
      </View>
      {seatViews}
      {won && !reduced && <Burst width={hullW} height={hullH} />}
    </View>
  </View>;

  // ---------- shore ----------
  const token = tokenSize(window.width);
  const shoreRows = Array.from({ length: p.attrs }, (_, a) => itemsOf(p, a).filter(i => pos[i] === SHORE));
  const shoreEmpty = shoreRows.every(r => !r.length);
  const pickedSeated = picked !== null && pos[picked] !== SHORE;
  const shore = <View testID="canoe-shore" style={{ alignSelf: 'stretch', backgroundColor: '#F4E2B8', borderRadius: 18, borderWidth: 2, borderColor: '#D9BF86', padding: 6, gap: 4, minHeight: token + 16 }}>
    {pickedSeated && <PressableScale accessibilityRole="button" accessibilityLabel={`Put ${the(p, picked!)} back on the shore`} onPress={() => drop(picked!, SHORE)} disabled={!live}
      style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: C.teal, backgroundColor: 'rgba(36,104,88,.08)', zIndex: 1 }} />}
    {shoreEmpty ? <Copy maxFontSizeMultiplier={1.5} style={{ textAlign: 'center', color: C.muted, paddingVertical: token * 0.28, fontSize: 14 }}>{won ? 'Everyone is in the canoe.' : 'The shore is empty.'}</Copy>
      : shoreRows.map((row, a) => row.length ? <View key={a} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
        {row.map((i, k) => {
          const chosen = picked === i;
          const tile = <PressableScale key={i} testID={`canoe-token-${i}`} accessibilityRole="button" accessibilityState={{ selected: chosen }} accessibilityLabel={`${the(p, i)}, on the shore`}
            accessibilityHint={chosen ? 'Picked up. Now tap a seat.' : 'Double-tap to pick up.'} disabled={!live} onPress={() => tapShore(i)}
            style={{ width: token, height: token, borderRadius: token / 3, alignItems: 'center', justifyContent: 'center', backgroundColor: chosen ? '#FFF6CF' : '#FFFBF0', borderWidth: chosen ? 3 : 1.5, borderColor: chosen ? C.teal : '#D9BF86', transform: [{ translateY: chosen ? -4 : 0 }] }}>
            <ItemArt attr={attrOf(p, i)} pool={p.cast[i]} size={token - 8} />
          </PressableScale>;
          return a === 0 && k === 0 && coach?.active ? <CoachSpot key={i} active handAt="bottom-right" style={{ borderRadius: token / 3 }}>{tile}</CoachSpot> : tile;
        })}
      </View> : null)}
  </View>;

  // ---------- clue cards ----------
  const cols = clueColumns(width), pages = cluePages(p.clues.length, width), perPage = pages > 1 ? CLUE_PAGE_PHONE : p.clues.length;
  const shownPage = Math.min(page, pages - 1), cardH = clueCardHeight(width), gap = 8, cardW = Math.floor((width - gap * (cols - 1)) / cols);
  const indices = p.clues.map((_, i) => i).slice(shownPage * perPage, shownPage * perPage + perPage);
  const cards = covered ? <View testID="canoe-cover" style={{ alignSelf: 'stretch', minHeight: cardH * 2 + gap, borderRadius: 20, backgroundColor: '#2F6F7A', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 10 }}>
    <Copy maxFontSizeMultiplier={1.5} style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 20, textAlign: 'center' }}>{`Pass to ${keepers!.names[keepers!.keeper]}`}</Copy>
    <Copy maxFontSizeMultiplier={1.5} style={{ color: '#E5F4F2', fontSize: 15, textAlign: 'center' }}>The clue cards are hidden. No peeking!</Copy>
    <Button compact maxFontSizeMultiplier={1.5} disabled={!active} onPress={keepers!.onReveal} label={`${keepers!.names[keepers!.keeper]} is ready: show my clues`} numberOfLines={2}>{`I'm ${keepers!.names[keepers!.keeper]}: show my clues`}</Button>
  </View> : <View testID="canoe-clues" style={{ flexDirection: 'row', flexWrap: 'wrap', gap, alignSelf: 'stretch' }}>
    {indices.map(i => {
      const c = p.clues[i], mine = !keepers || keepers.owner(i) === keepers.keeper;
      const isLit = lights && lit(p, c, pos), isUsed = !!(used & (1 << i)), item = (x: number) => ({ attr: attrOf(p, x), pool: p.cast[x] });
      if (!mine) return <View key={i} testID={`canoe-clue-hidden-${i}`} accessible accessibilityLabel={`${keepers!.names[keepers!.owner(i)]}'s clue, face down`} style={{ width: cardW, height: cardH, borderRadius: 16, backgroundColor: '#5B8E94', borderWidth: 2, borderColor: '#3F6F75', alignItems: 'center', justifyContent: 'center' }}>
        <Copy numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ color: '#EAF6F4', fontWeight: '800', fontSize: 13, paddingHorizontal: 6 }}>{keepers!.names[keepers!.owner(i)]}</Copy>
      </View>;
      const status = [isLit ? 'true now' : null, isUsed ? 'marked done' : null].filter(Boolean).join(', ');
      return <PressableScale key={i} testID={`canoe-clue-${i}`} accessibilityRole="button" accessibilityLabel={`Clue: ${clueText(p, c)}${status ? ` (${status})` : ''}`}
        accessibilityHint={isUsed ? 'Double-tap to mark it not done.' : heard === i ? 'Double-tap again to mark it done.' : 'Double-tap to hear it.'} accessibilityState={{ selected: isUsed }}
        disabled={won} onPress={() => tapClue(i)}
        style={{ width: cardW, height: cardH, borderRadius: 16, backgroundColor: isLit ? '#E6F6EC' : '#FFFFFF', borderWidth: isLit ? 3 : heard === i ? 3 : 2, borderColor: isLit ? '#2E9D6A' : heard === i ? C.blue : '#C9B79A', alignItems: 'center', justifyContent: 'center', opacity: isUsed ? 0.42 : 1 }}>
        <CluePicture kind={c.k} x={item(c.x)} y={c.y === undefined ? undefined : item(c.y)} seat={c.s} n={p.n} width={Math.min(cardW - 8, (cardH - 6) * 2.5)} height={Math.min(cardH - 6, (cardW - 8) / 2.5)} />
        {isLit && <View pointerEvents="none" style={{ position: 'absolute', right: 5, top: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: '#2E9D6A', alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 9, height: 5, borderLeftWidth: 2.6, borderBottomWidth: 2.6, borderColor: '#FFFFFF', transform: [{ rotate: '-45deg' }], marginTop: -2 }} /></View>}
        {isUsed && <View pointerEvents="none" style={{ position: 'absolute', left: 10, right: 10, top: cardH / 2 - 2, height: 4, borderRadius: 2, backgroundColor: ink, opacity: 0.7, transform: [{ rotate: '-8deg' }] }} />}
        {c.k === teach && !met && <View pointerEvents="none" style={{ position: 'absolute', left: 6, top: 5, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: '#E1B251' }}><Copy maxFontSizeMultiplier={1.3} style={{ fontSize: 12, fontWeight: '900', color: ink }}>New</Copy></View>}
        <Pulse on={focus.clue === i || c.k === teach && !met && focus.clue === null} reduced={reduced} radius={16} color={focus.clue === i ? '#FFD24A' : '#F3C969'} />
      </PressableScale>;
    })}
  </View>;
  const pager = pages > 1 && !covered ? <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
    <Button quiet compact maxFontSizeMultiplier={1.5} disabled={shownPage === 0} onPress={() => setPage(shownPage - 1)} label="Earlier clues">Back</Button>
    <Copy maxFontSizeMultiplier={1.5} accessibilityLabel={`Clue page ${shownPage + 1} of ${pages}`} style={{ color: C.ink, fontWeight: '800' }}>{`${shownPage + 1} / ${pages}`}</Copy>
    <Button quiet compact maxFontSizeMultiplier={1.5} disabled={shownPage === pages - 1} onPress={() => setPage(shownPage + 1)} label="More clues">More clues</Button>
  </View> : null;

  // ---------- header and controls ----------
  const caption0 = covered ? 'Hand over the device.' : coach?.active ? 'Pick up a friend, then tap a seat.' : notice || title;
  const head = <View testID="board-header" style={large ? { alignSelf: 'stretch', gap: 8 } : { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', alignSelf: 'stretch', gap: 8, minHeight: 46 }}>
    <View style={large ? undefined : { flexGrow: 1, flexShrink: 1, flexBasis: 150, minWidth: 150 }}>
      <Copy numberOfLines={large ? undefined : 2} maxFontSizeMultiplier={1.5} style={{ fontWeight: '900', color: C.ink, fontSize: 15, lineHeight: large ? undefined : 19 }}>{caption0}</Copy>
    </View>
    {!finished && <View testID="board-actions" style={{ flexDirection: 'row', gap: 8 }}>
      <Button quiet compact maxFontSizeMultiplier={1.5} disabled={!active || !canUndo || covered} onPress={onUndo}>Undo</Button>
      <Button compact maxFontSizeMultiplier={1.5} disabled={!active || !canReset || covered} onPress={onReset}>Reset</Button>
    </View>}
  </View>;
  const keeperBar = keepers && !covered && !won ? <View style={{ flexDirection: large ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'stretch' }}>
    <Copy numberOfLines={1} maxFontSizeMultiplier={1.5} accessibilityLabel={`${keepers.names[keepers.keeper]} is holding the clues`} style={{ color: C.ink, fontWeight: '800', flexShrink: 1 }}>{`${keepers.names[keepers.keeper]}'s clues`}</Copy>
    <Button quiet compact maxFontSizeMultiplier={1.5} disabled={!active} onPress={keepers.onPass} label={`Pass the clues to ${keepers.names[keepers.keeper === 0 ? 1 : 0]}`} numberOfLines={1}>{`Pass to ${keepers.names[keepers.keeper === 0 ? 1 : 0]}`}</Button>
  </View> : null;
  const lightsRow = onLights && !won && !covered ? <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
    <Button quiet compact selected={lights} maxFontSizeMultiplier={1.5} disabled={!active} onPress={() => onLights(true)}>Clue lights</Button>
    <Button quiet compact selected={!lights} maxFontSizeMultiplier={1.5} disabled={!active} onPress={() => onLights(false)}>Check at the end</Button>
  </View> : null;
  const check = !lights && !won && onCheck ? <View style={{ alignItems: 'center', gap: 6 }}>
    {missed && <Copy accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={{ color: C.ink, textAlign: 'center' }}>Not quite yet. Everyone is still in their seats.</Copy>}
    <Button maxFontSizeMultiplier={1.5} disabled={!active || !canCheck || covered} onPress={onCheck}>Check</Button>
  </View> : null;
  const captionView = caption && !covered ? <View accessibilityLiveRegion="polite" style={{ alignSelf: 'stretch', backgroundColor: '#FFF8E6', borderRadius: 14, borderWidth: 1.5, borderColor: '#E1B251', padding: 8 }}>
    <Copy maxFontSizeMultiplier={1.5} style={{ color: C.ink, fontSize: 15, textAlign: 'center' }}>{caption}</Copy>
  </View> : null;
  return <View style={{ gap: 10, alignItems: 'center', alignSelf: 'stretch' }}>
    {header}
    {head}
    {canoe}
    {finished ?? <>
      {shore}
      {keeperBar}
      {cards}
      {pager}
      {captionView}
      {check}
      {school && <BoardPrimary />}
      {lightsRow}
      {help && <View style={{ alignSelf: 'stretch' }}>{help}</View>}
    </>}
    {footer}
  </View>;
}
