import React, { useMemo, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { BoardPrimary, useBoardGeometry, useBoardSpace } from '../../BoardSpace';
import { CoachSpot } from '../../Coach';
import { useReducedMotion } from '../../../components/motion';
import { LARGE_TEXT } from '../../../components/wordFit';
import { Button, C, Chip, Copy, PressableScale } from '../../../components/ui';
import type { HintCue } from '../../../puzzles/hints';
import { PearlArt, ShellArt, ink, type PearlTone } from './art';
import { BalanceScale } from './scale';
import { describeScale, focusOf } from './help';
import { SCALE_FLOOR, pearlTokenSize, scaleHeight, shellTokenSize } from './layout';
import {
  analyzeOdd, analyzeSort, bitsOf, isPairKnown, itemFullName, itemName, panLabel, popcount, provenPar,
  type OddDir, type PublicBoard, type ScaleOutcome,
} from './rules';

/** Secret data shown ONLY to the Scale Holder when `phase === 'holder' && unlocked === true`. */
export type HolderSecret = {
  /** Human-readable secret order or odd pearl, shown ONLY on the unlocked Holder screen. */
  summary: string;
  /** Which pan pair the Guesser asked to weigh. */
  pendingLeft: number;
  pendingRight: number;
  /** True scale outcome for checking against accidental Holder mis-taps. */
  truth: ScaleOutcome;
};

export type ScaleHolderProps = {
  names: readonly [string, string];
  holder: 0 | 1;
  phase: 'guesser' | 'cover-to-holder' | 'holder' | 'cover-to-guesser';
  /** Local React lock — resets to false on mount, background, or role swap so secrets never leak on resume! */
  unlocked: boolean;
  /** Only populated when `phase === 'holder' && unlocked`; strictly null otherwise! */
  secret: HolderSecret | null;
  onUnlockHolder: () => void;
  onHolderAnswer: (outcome: ScaleOutcome) => boolean;
  onRevealGuesser: () => void;
  onSwapRoles: () => void;
  swapNeedsFresh: boolean;
};

export type ScaleBoardProps = {
  /** Strictly public board — ZERO hidden weight fields! */
  board: PublicBoard;
  order: readonly number[];
  oddPick: number | null;
  oddDir: OddDir | null;
  showLinks: boolean;
  won: boolean;
  missed: boolean;
  canCheck: boolean;
  active: boolean;
  width: number;
  title: string;
  onWeigh: (left: number, right: number) => boolean;
  onPlaceSort: (item: number, slot: number) => boolean;
  onPickOdd: (pearl: number, dir?: OddDir) => boolean;
  onSetOddDir: (dir: OddDir) => void;
  onCheck: () => void;
  onUndo: () => void;
  onReset: () => void;
  canUndo: boolean;
  canReset: boolean;
  onToggleLinks?: (on: boolean) => void;
  scaleHolder?: ScaleHolderProps;
  practiceControls?: React.ReactNode;
  coach?: { active: boolean; done: () => void };
  cue?: HintCue | null;
  notice?: string;
  help?: React.ReactNode;
  finished?: React.ReactNode;
  footer?: React.ReactNode;
  header?: React.ReactNode;
};

export function ScaleBoard(props: ScaleBoardProps) {
  const {
    board, order, oddPick, oddDir, showLinks, won, missed, canCheck, active, width, title,
    onWeigh, onPlaceSort, onPickOdd, onSetOddDir, onCheck, onUndo, onReset, canUndo, canReset,
    onToggleLinks, scaleHolder, practiceControls, coach, cue = null, notice, help, finished, footer, header,
  } = props;

  const reduced = useReducedMotion();
  const window = useWindowDimensions();
  const large = window.fontScale >= LARGE_TEXT;
  const school = useBoardSpace();

  // Local pan staging (public UI state only; committed only when tapping Weigh / Ask Holder).
  const [leftPan, setLeftPan] = useState(0);
  const [rightPan, setRightPan] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [pearlTool, setPearlTool] = useState<'left' | 'right' | 'pick'>('left');
  const [holderMistap, setHolderMistap] = useState('');

  // Reset staging cleanly when switching to a different puzzle or role handover.
  const boardId = `${board.kind}:${board.n}:${board.cast.join(',')}:${scaleHolder?.holder ?? 's'}:${scaleHolder?.phase ?? 'g'}`;
  const [syncId, setSyncId] = useState(boardId);
  if (syncId !== boardId) {
    setSyncId(boardId);
    setLeftPan(0);
    setRightPan(0);
    setPicked(null);
    setHolderMistap('');
  }

  const par = provenPar(board);
  const focus = won ? { greyKnown: false, highlightLeft: 0, highlightRight: 0 } : focusOf(cue);
  const sortInfo = useMemo(() => (board.kind === 'sort' ? analyzeSort(board.n, board.history) : null), [board.kind, board.n, board.history]);
  const oddInfo = useMemo(() => (board.kind !== 'sort' ? analyzeOdd(board.kind, board.n, board.history) : null), [board.kind, board.n, board.history]);

  // Measured School geometry: scale keeps a readable floor and yields room to primary controls first.
  const naturalScaleH = scaleHeight(window.width, large);
  const geometry = useBoardGeometry('shell-scale', naturalScaleH, SCALE_FLOOR);
  const scaleH = geometry.measured ? Math.max(SCALE_FLOOR, Math.min(naturalScaleH, geometry.height)) : naturalScaleH;
  const scaleW = Math.min(Math.max(width, 260), 460);

  // ---------- Scale-Holder privacy covers & secret screen (OR-05b) ----------
  if (scaleHolder && scaleHolder.phase !== 'guesser') {
    const holderName = scaleHolder.names[scaleHolder.holder];
    const guesserName = scaleHolder.names[scaleHolder.holder === 0 ? 1 : 0];
    if (scaleHolder.phase === 'cover-to-guesser') {
      return (
        <View style={{ alignSelf: 'stretch', gap: 14 }} testID="scale-cover-guesser">
          {header}
          <View style={{ borderRadius: 22, backgroundColor: '#24666E', padding: 20, gap: 12, alignItems: 'center' }}>
            <Copy maxFontSizeMultiplier={1.5} style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 22, textAlign: 'center' }}>
              {`Pass back to ${guesserName}`}
            </Copy>
            <Copy maxFontSizeMultiplier={1.5} style={{ color: '#E3F3F2', fontSize: 15, textAlign: 'center' }}>
              The secret weights are hidden. Ready to see how the scale tipped?
            </Copy>
            <Button
              compact
              maxFontSizeMultiplier={1.5}
              disabled={!active}
              onPress={scaleHolder.onRevealGuesser}
              label={`${guesserName} is ready: see how the scale tipped`}
            >
              {`I'm ${guesserName}: see the scale`}
            </Button>
          </View>
          {footer}
        </View>
      );
    }

    // Either 'cover-to-holder' OR 'holder' before local `unlocked` (protects force-close/background resume!)
    if (scaleHolder.phase === 'cover-to-holder' || !scaleHolder.unlocked || !scaleHolder.secret) {
      return (
        <View style={{ alignSelf: 'stretch', gap: 14 }} testID="scale-cover-holder">
          {header}
          <View style={{ borderRadius: 22, backgroundColor: '#2B5B72', padding: 20, gap: 12, alignItems: 'center' }}>
            <Copy maxFontSizeMultiplier={1.5} style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 22, textAlign: 'center' }}>
              {`Pass to ${holderName} (Scale Holder)`}
            </Copy>
            <Copy maxFontSizeMultiplier={1.5} style={{ color: '#E3F3F8', fontSize: 15, textAlign: 'center' }}>
              {`${guesserName} asked for a weighing. No peeking!`}
            </Copy>
            <Button
              compact
              maxFontSizeMultiplier={1.5}
              disabled={!active}
              onPress={scaleHolder.onUnlockHolder}
              label={`${holderName} is ready: show the scale secret`}
            >
              {`I'm ${holderName}: show secret`}
            </Button>
          </View>
          {footer}
        </View>
      );
    }

    // Unlocked Holder screen — ONLY place secret weights ever render!
    const sec = scaleHolder.secret;
    const answerTap = (choice: ScaleOutcome) => {
      if (!active) return;
      if (scaleHolder.onHolderAnswer(choice)) {
        setHolderMistap('');
      } else {
        const hintWord = sec.truth === 'L' ? 'Left is heavier' : sec.truth === 'R' ? 'Right is heavier' : 'Balanced';
        setHolderMistap(`Check the secret — ${hintWord}!`);
      }
    };
    return (
      <View style={{ alignSelf: 'stretch', gap: 14 }} testID="scale-holder-secret">
        {header}
        <View style={{ borderRadius: 20, backgroundColor: '#FFF5DD', borderWidth: 2, borderColor: '#D6A445', padding: 16, gap: 10 }}>
          <Copy maxFontSizeMultiplier={1.5} style={{ fontWeight: '900', fontSize: 18, color: ink }}>
            {`${holderName}'s secret scale`}
          </Copy>
          <Copy testID="scale-holder-secret-text" maxFontSizeMultiplier={1.5} style={{ fontSize: 16, color: ink, fontWeight: '700' }}>
            {sec.summary}
          </Copy>
          <View style={{ borderRadius: 14, backgroundColor: '#FFFFFF', padding: 12, gap: 4, borderWidth: 1.5, borderColor: '#DECBA3' }}>
            <Copy maxFontSizeMultiplier={1.5} style={{ fontSize: 14, color: C.muted, fontWeight: '700' }}>
              {`${guesserName} asks to weigh:`}
            </Copy>
            <Copy maxFontSizeMultiplier={1.5} style={{ fontSize: 16, color: ink, fontWeight: '800' }}>
              {`Left pan: ${panLabel(board, sec.pendingLeft)}`}
            </Copy>
            <Copy maxFontSizeMultiplier={1.5} style={{ fontSize: 16, color: ink, fontWeight: '800' }}>
              {`Right pan: ${panLabel(board, sec.pendingRight)}`}
            </Copy>
          </View>
          <Copy maxFontSizeMultiplier={1.5} style={{ fontSize: 14, color: ink }}>
            Tap how the scale answers:
          </Copy>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button compact maxFontSizeMultiplier={1.4} disabled={!active} onPress={() => answerTap('L')}>
              Left is heavier
            </Button>
            {board.kind !== 'sort' && (
              <Button compact maxFontSizeMultiplier={1.4} disabled={!active} onPress={() => answerTap('=')}>
                Balanced
              </Button>
            )}
            <Button compact maxFontSizeMultiplier={1.4} disabled={!active} onPress={() => answerTap('R')}>
              Right is heavier
            </Button>
          </View>
          {!!holderMistap && (
            <Copy accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={{ color: '#B54132', fontWeight: '700' }}>
              {holderMistap}
            </Copy>
          )}
        </View>
        {footer}
      </View>
    );
  }

  // ---------- Guesser / Solo public view (ZERO hidden weight fields!) ----------
  const live = !won && active;
  const lastWeigh = board.history.at(-1) ?? null;
  const shownLeft = leftPan || rightPan ? leftPan : (lastWeigh?.left ?? 0);
  const shownRight = leftPan || rightPan ? rightPan : (lastWeigh?.right ?? 0);
  const shownOutcome: ScaleOutcome | null = leftPan || rightPan ? null : (lastWeigh?.outcome ?? null);
  const leftCount = popcount(leftPan);
  const rightCount = popcount(rightPan);
  const canWeighNow = live && leftCount > 0 && leftCount === rightCount && (leftPan & rightPan) === 0 && (board.kind !== 'sort' || leftCount === 1);

  const toggleSortPan = (side: 'left' | 'right', item: number) => {
    const bit = 1 << item;
    if (side === 'left') {
      setLeftPan(cur => (cur === bit ? 0 : bit));
      setRightPan(cur => (cur === bit ? 0 : cur));
    } else {
      setRightPan(cur => (cur === bit ? 0 : bit));
      setLeftPan(cur => (cur === bit ? 0 : cur));
    }
    setPicked(null);
  };

  const tapSortPan = (side: 'left' | 'right') => {
    if (!live) return;
    if (picked !== null) {
      toggleSortPan(side, picked);
      coach?.done();
      return;
    }
    if (side === 'left' && leftPan) setLeftPan(0);
    if (side === 'right' && rightPan) setRightPan(0);
  };

  const tapShell = (item: number) => {
    if (!live) return;
    if (picked === item) {
      setPicked(null);
      return;
    }
    // Quick convenience: if one pan is empty and nothing is picked, still select so child can tap Left, Right, or an Order spot.
    setPicked(item);
    coach?.done();
  };

  const tapOrderSlot = (slot: number) => {
    if (!live) return;
    if (picked !== null) {
      onPlaceSort(picked, slot);
      setPicked(null);
      coach?.done();
      return;
    }
    const existing = order[slot];
    if (existing >= 0) onPlaceSort(existing, -1);
  };

  const tapPearl = (index: number) => {
    if (!live) return;
    coach?.done();
    const bit = 1 << index;
    if (pearlTool === 'pick') {
      onPickOdd(index, board.kind === 'odd-heavy' ? 'heavy' : (oddDir ?? 'heavy'));
      return;
    }
    if (pearlTool === 'left') {
      if (leftPan & bit) setLeftPan(leftPan & ~bit);
      else {
        setLeftPan(leftPan | bit);
        setRightPan(rightPan & ~bit);
      }
    } else {
      if (rightPan & bit) setRightPan(rightPan & ~bit);
      else {
        setRightPan(rightPan | bit);
        setLeftPan(leftPan & ~bit);
      }
    }
  };

  const doWeigh = () => {
    if (!canWeighNow) return;
    if (onWeigh(leftPan, rightPan)) {
      setLeftPan(0);
      setRightPan(0);
      setPicked(null);
      coach?.done();
    }
  };

  const renderPanItems = (mask: number) => {
    const items = bitsOf(mask, board.n);
    if (!items.length) {
      return (
        <Copy maxFontSizeMultiplier={1.2} style={{ fontSize: 12, color: C.muted, fontWeight: '700' }}>
          Empty
        </Copy>
      );
    }
    if (board.kind === 'sort') {
      const idx = items[0];
      return <ShellArt pool={board.cast[idx] ?? idx} size={42} />;
    }
    const pSize = items.length <= 2 ? 32 : items.length <= 4 ? 26 : 22;
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 2, maxWidth: 128 }}>
        {items.map(i => (
          <PearlArt key={i} number={i + 1} size={pSize} theme={board.cast[0] ?? 0} tone="normal" />
        ))}
      </View>
    );
  };

  // For sort Hint Step 1 greying: which anchor shell is active (on one pan, or currently picked)?
  const anchorShell = board.kind === 'sort'
    ? (leftPan ? bitsOf(leftPan, board.n)[0] : rightPan ? bitsOf(rightPan, board.n)[0] : picked)
    : null;

  const isShellGreyedByHint = (item: number): boolean => {
    if (!focus.greyKnown || !sortInfo || board.kind !== 'sort') return false;
    if (sortInfo.deducedOrder) return true;
    if (anchorShell !== null && anchorShell !== item) return isPairKnown(sortInfo.rel, anchorShell, item);
    // If no anchor chosen, grey out shells whose relation to EVERY other shell is already known!
    return sortInfo.unknownPairs.every(([a, b]) => a !== item && b !== item);
  };

  const sToken = shellTokenSize(width, board.n, large);
  const pToken = pearlTokenSize(width, board.n, large);

  const scaleView = (
    <View testID={geometry.testID} onLayout={geometry.onLayout} style={{ alignItems: 'center', gap: 6 }}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={describeScale({ ...board, order, oddPick, oddDir })}
        style={{ width: scaleW, height: scaleH }}
      >
        <BalanceScale
          width={scaleW}
          height={scaleH}
          outcome={shownOutcome}
          weighCount={board.history.length}
          reduced={reduced}
          leftContent={renderPanItems(shownLeft)}
          rightContent={renderPanItems(shownRight)}
          leftLabel={shownOutcome === 'L' ? 'HEAVIER' : leftPan ? 'LEFT' : undefined}
          rightLabel={shownOutcome === 'R' ? 'HEAVIER' : rightPan ? 'RIGHT' : undefined}
        />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
        <Copy testID="scale-weigh-count" maxFontSizeMultiplier={1.4} style={{ fontSize: 14, fontWeight: '800', color: ink }}>
          {`Weighings: ${board.history.length} · Par: ${par}`}
        </Copy>
        {shownOutcome && (
          <Copy testID="scale-last-result" accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.4} style={{ fontSize: 14, fontWeight: '800', color: '#1F6B64' }}>
            {shownOutcome === '=' ? 'Balanced (=)' : shownOutcome === 'L' ? 'Left is heavier' : 'Right is heavier'}
          </Copy>
        )}
      </View>
    </View>
  );

  // Pan buttons + Weigh action (always directly beneath the scale so board + controls stay visible together at AX5!)
  const panRow = board.kind === 'sort' ? (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
      <Button
        quiet
        compact
        maxFontSizeMultiplier={1.35}
        disabled={!live}
        selected={leftPan !== 0}
        onPress={() => tapSortPan('left')}
        label={picked !== null ? `Put ${itemName(board, picked)} on Left pan` : leftPan ? `Clear Left pan (${panLabel(board, leftPan)})` : 'Left pan'}
      >
        {leftPan ? `Left: ${panLabel(board, leftPan)}` : 'Left pan'}
      </Button>
      <Button
        compact
        maxFontSizeMultiplier={1.4}
        disabled={!canWeighNow}
        onPress={doWeigh}
        label={scaleHolder ? `Ask ${scaleHolder.names[scaleHolder.holder]} to weigh` : 'Weigh the two pans'}
      >
        {scaleHolder ? `Ask ${scaleHolder.names[scaleHolder.holder]}` : 'Weigh'}
      </Button>
      <Button
        quiet
        compact
        maxFontSizeMultiplier={1.35}
        disabled={!live}
        selected={rightPan !== 0}
        onPress={() => tapSortPan('right')}
        label={picked !== null ? `Put ${itemName(board, picked)} on Right pan` : rightPan ? `Clear Right pan (${panLabel(board, rightPan)})` : 'Right pan'}
      >
        {rightPan ? `Right: ${panLabel(board, rightPan)}` : 'Right pan'}
      </Button>
    </View>
  ) : (
    <View style={{ gap: 8, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        <Chip maxFontSizeMultiplier={1.3} selected={pearlTool === 'left'} onPress={() => setPearlTool('left')}>
          {`Left pan (${leftCount})`}
        </Chip>
        <Chip maxFontSizeMultiplier={1.3} selected={pearlTool === 'right'} onPress={() => setPearlTool('right')}>
          {`Right pan (${rightCount})`}
        </Chip>
        <Chip maxFontSizeMultiplier={1.3} selected={pearlTool === 'pick'} onPress={() => setPearlTool('pick')}>
          Pick odd pearl
        </Chip>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        <Button
          compact
          maxFontSizeMultiplier={1.4}
          disabled={!canWeighNow}
          onPress={doWeigh}
          label={scaleHolder ? `Ask ${scaleHolder.names[scaleHolder.holder]} to weigh` : `Weigh ${leftCount} against ${rightCount}`}
        >
          {scaleHolder ? `Ask ${scaleHolder.names[scaleHolder.holder]}` : leftCount > 0 && leftCount === rightCount ? `Weigh ${leftCount} vs ${rightCount}` : 'Weigh equal groups'}
        </Button>
        {(leftPan !== 0 || rightPan !== 0) && (
          <Button
            quiet
            compact
            maxFontSizeMultiplier={1.3}
            disabled={!live}
            onPress={() => { setLeftPan(0); setRightPan(0); }}
          >
            Clear pans
          </Button>
        )}
      </View>
    </View>
  );

  // ---------- Tray & Answer UI ----------
  const trayAndAnswer = board.kind === 'sort' ? (
    <View style={{ gap: 10, alignSelf: 'stretch' }}>
      {/* Shell tray */}
      <View
        testID="scale-shell-tray"
        style={{
          backgroundColor: '#F5E7C8',
          borderRadius: 18,
          borderWidth: 2,
          borderColor: '#D8BE87',
          padding: 8,
          gap: 6,
        }}
      >
        <Copy maxFontSizeMultiplier={1.35} style={{ fontSize: 13, fontWeight: '800', color: ink, textAlign: 'center' }}>
          {picked !== null
            ? `${itemName(board, picked)} picked — tap Left pan, Right pan, or an order spot below`
            : 'Tap a shell to weigh it or place it in order'}
        </Copy>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
          {Array.from({ length: board.n }, (_, i) => {
            const chosen = picked === i;
            const onL = (leftPan >> i) & 1;
            const onR = (rightPan >> i) & 1;
            const hintHighlight = ((focus.highlightLeft >> i) & 1) || ((focus.highlightRight >> i) & 1);
            const greyed = isShellGreyedByHint(i);
            const tile = (
              <PressableScale
                key={i}
                testID={`scale-shell-${i}`}
                accessibilityRole="button"
                accessibilityState={{ selected: chosen }}
                accessibilityLabel={`${itemFullName(board, i)}${onL ? ', on Left pan' : onR ? ', on Right pan' : ''}${greyed ? ', already known' : ''}`}
                accessibilityHint={chosen ? 'Selected. Tap Left pan, Right pan, or an order spot.' : 'Double-tap to pick up this shell.'}
                disabled={!live}
                onPress={() => tapShell(i)}
                style={{
                  minWidth: sToken,
                  minHeight: sToken + 14,
                  paddingHorizontal: 4,
                  paddingVertical: 4,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: chosen ? '#FFF3C4' : hintHighlight ? '#FEF0B8' : greyed ? '#E4E7E8' : '#FFFDF7',
                  borderWidth: chosen || hintHighlight ? 3 : 1.5,
                  borderColor: chosen ? C.teal : hintHighlight ? '#D69A1F' : onL ? '#2D85A8' : onR ? '#D96548' : '#D4BF92',
                  opacity: greyed ? 0.5 : 1,
                }}
              >
                <ShellArt pool={board.cast[i] ?? i} size={sToken - 10} />
                <Copy maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 11, fontWeight: '800', color: ink }}>
                  {itemName(board, i)}
                </Copy>
              </PressableScale>
            );
            return i === 0 && coach?.active ? (
              <CoachSpot key={i} active handAt="bottom-right" style={{ borderRadius: 14 }}>
                {tile}
              </CoachSpot>
            ) : (
              tile
            );
          })}
        </View>
      </View>

      {/* Lightest -> Heaviest answer row */}
      <View
        testID="scale-order-row"
        style={{
          backgroundColor: '#EAF4F3',
          borderRadius: 18,
          borderWidth: 2,
          borderColor: '#A8D0CB',
          padding: 8,
          gap: 6,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
          <Copy maxFontSizeMultiplier={1.3} style={{ fontSize: 12, fontWeight: '800', color: '#24666E' }}>
            Lightest
          </Copy>
          <Copy maxFontSizeMultiplier={1.3} style={{ fontSize: 12, fontWeight: '800', color: '#24666E' }}>
            Heaviest
          </Copy>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
          {Array.from({ length: board.n }, (_, slot) => {
            const shellIdx = order[slot] ?? -1;
            const filled = shellIdx >= 0;
            return (
              <PressableScale
                key={slot}
                testID={`scale-slot-${slot}`}
                accessibilityRole="button"
                accessibilityLabel={`Spot ${slot + 1} of ${board.n}${slot === 0 ? ', lightest' : slot === board.n - 1 ? ', heaviest' : ''}: ${filled ? itemFullName(board, shellIdx) : 'empty'}`}
                accessibilityHint={picked !== null ? `Double-tap to place ${itemName(board, picked)} here.` : filled ? 'Double-tap to clear this spot.' : 'Pick a shell first.'}
                disabled={!live}
                onPress={() => tapOrderSlot(slot)}
                style={{
                  width: sToken,
                  minHeight: sToken + 10,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: filled ? '#FFFFFF' : picked !== null ? '#FFF8DB' : '#F6FBFA',
                  borderWidth: picked !== null ? 2 : 1.5,
                  borderStyle: filled ? 'solid' : 'dashed',
                  borderColor: filled ? '#2B7A78' : picked !== null ? '#D69A1F' : '#8EBAB4',
                }}
              >
                {filled ? (
                  <>
                    <ShellArt pool={board.cast[shellIdx] ?? shellIdx} size={sToken - 14} />
                    <Copy maxFontSizeMultiplier={1.15} numberOfLines={1} style={{ fontSize: 10, fontWeight: '800', color: ink }}>
                      {`${slot + 1}. ${itemName(board, shellIdx)}`}
                    </Copy>
                  </>
                ) : (
                  <Copy maxFontSizeMultiplier={1.3} style={{ fontSize: 16, fontWeight: '800', color: '#6E9A95' }}>
                    {String(slot + 1)}
                  </Copy>
                )}
              </PressableScale>
            );
          })}
        </View>
      </View>
    </View>
  ) : (
    /* Odd-pearl tray + direction picker */
    <View style={{ gap: 10, alignSelf: 'stretch' }}>
      <View
        testID="scale-pearl-tray"
        style={{
          backgroundColor: '#F3ECE2',
          borderRadius: 18,
          borderWidth: 2,
          borderColor: '#D6C3A5',
          padding: 8,
          gap: 8,
        }}
      >
        <Copy maxFontSizeMultiplier={1.35} style={{ fontSize: 13, fontWeight: '800', color: ink, textAlign: 'center' }}>
          {pearlTool === 'left'
            ? 'Tap pearls to add or remove from Left pan'
            : pearlTool === 'right'
              ? 'Tap pearls to add or remove from Right pan'
              : 'Tap the odd pearl you found'}
        </Copy>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
          {Array.from({ length: board.n }, (_, i) => {
            const onL = ((leftPan >> i) & 1) !== 0;
            const onR = ((rightPan >> i) & 1) !== 0;
            const isPicked = oddPick === i;
            const ruledOut = (showLinks || focus.greyKnown) && !!oddInfo?.ruledOut.includes(i);
            const hintPan = (((focus.highlightLeft >> i) & 1) || ((focus.highlightRight >> i) & 1)) !== 0;
            const tone: PearlTone = isPicked
              ? 'picked'
              : onL
                ? 'left'
                : onR
                  ? 'right'
                  : ruledOut
                    ? 'ruled-out'
                    : hintPan
                      ? 'hint'
                      : 'normal';
            const tile = (
              <PressableScale
                key={i}
                testID={`scale-pearl-${i}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isPicked || onL || onR }}
                accessibilityLabel={`Pearl ${i + 1}${onL ? ', on Left pan' : onR ? ', on Right pan' : ''}${isPicked ? ', chosen as odd pearl' : ''}${ruledOut ? ', ruled out normal' : ''}`}
                disabled={!live}
                onPress={() => tapPearl(i)}
                style={{
                  width: pToken,
                  height: pToken,
                  borderRadius: pToken / 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: ruledOut && !onL && !onR && !isPicked ? 0.52 : 1,
                }}
              >
                <PearlArt number={i + 1} size={pToken - 2} theme={board.cast[0] ?? 0} tone={tone} />
              </PressableScale>
            );
            return i === 0 && coach?.active ? (
              <CoachSpot key={i} active handAt="bottom-right" style={{ borderRadius: pToken / 2 }}>
                {tile}
              </CoachSpot>
            ) : (
              tile
            );
          })}
        </View>
      </View>

      {board.kind === 'odd-either' && (
        <View
          testID="scale-odd-dir"
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: '#EAF4F3',
            borderRadius: 16,
            padding: 10,
          }}
        >
          <Copy maxFontSizeMultiplier={1.4} style={{ fontSize: 14, fontWeight: '800', color: ink }}>
            {oddPick !== null ? `Pearl ${oddPick + 1} is:` : 'Odd pearl is:'}
          </Copy>
          <Chip maxFontSizeMultiplier={1.35} selected={oddDir === 'heavy'} onPress={() => onSetOddDir('heavy')}>
            Heavier
          </Chip>
          <Chip maxFontSizeMultiplier={1.35} selected={oddDir === 'light'} onPress={() => onSetOddDir('light')}>
            Lighter
          </Chip>
        </View>
      )}
    </View>
  );

  // ---------- Known Links / Public Knowledge Helper Strip ----------
  const linksSection = (showLinks || focus.greyKnown) && (board.history.length > 0 || focus.greyKnown) ? (
    <View
      testID="scale-known-links"
      style={{
        alignSelf: 'stretch',
        backgroundColor: '#F3F7F2',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#C2D7C0',
        padding: 10,
        gap: 6,
      }}
    >
      <Copy maxFontSizeMultiplier={1.35} style={{ fontSize: 13, fontWeight: '800', color: '#275A3A' }}>
        {board.kind === 'sort' ? 'Known from the scale' : 'Public pearl clues'}
      </Copy>
      {board.kind === 'sort' && sortInfo ? (
        sortInfo.links.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {sortInfo.links.map(([lo, hi]) => (
              <View
                key={`${lo}-${hi}`}
                style={{ backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#B8CFB6', paddingHorizontal: 8, paddingVertical: 4 }}
              >
                <Copy maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: '700', color: ink }}>
                  {`${itemName(board, lo)} < ${itemName(board, hi)}`}
                </Copy>
              </View>
            ))}
            {focus.greyKnown && sortInfo.knownPairs.length > sortInfo.links.length && (
              <View style={{ backgroundColor: '#E6E9E7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Copy maxFontSizeMultiplier={1.3} style={{ fontSize: 12, color: C.muted, fontWeight: '700' }}>
                  {`+${sortInfo.knownPairs.length - sortInfo.links.length} already known (greyed out)`}
                </Copy>
              </View>
            )}
          </View>
        ) : (
          <Copy maxFontSizeMultiplier={1.3} style={{ fontSize: 13, color: C.muted }}>
            No links yet — weigh two shells to learn your first link.
          </Copy>
        )
      ) : oddInfo ? (
        <Copy maxFontSizeMultiplier={1.35} style={{ fontSize: 13, color: ink }}>
          {oddInfo.ruledOut.length > 0
            ? `Ruled out (normal): ${oddInfo.ruledOut.map(i => `#${i + 1}`).join(', ')}. Remaining suspects: ${board.n - oddInfo.ruledOut.length}.`
            : 'No pearls ruled out yet — weigh equal groups!'}
        </Copy>
      ) : null}
    </View>
  ) : null;

  // ---------- Compact public weighing log ----------
  const historyStrip = board.history.length > 0 ? (
    <ScrollView
      testID="scale-history"
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
      style={{ alignSelf: 'stretch' }}
    >
      {board.history.map((w, idx) => (
        <View
          key={idx}
          style={{
            backgroundColor: '#FAF6EC',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#D6C8AC',
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <Copy maxFontSizeMultiplier={1.25} style={{ fontSize: 12, fontWeight: '700', color: ink }}>
            {`#${idx + 1}: ${panLabel(board, w.left)} ${w.outcome === '=' ? '=' : w.outcome === 'L' ? '>' : '<'} ${panLabel(board, w.right)}`}
          </Copy>
        </View>
      ))}
    </ScrollView>
  ) : null;

  // ---------- Header & Controls ----------
  const caption0 = coach?.active
    ? 'Tap a shell, put two on the pans, then tap Weigh.'
    : missed
      ? 'The scale disagrees. Weigh another pair or adjust your row, then Check again.'
      : notice || title;

  const head = (
    <View
      testID="board-header"
      style={
        large
          ? { alignSelf: 'stretch', gap: 8 }
          : { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', alignSelf: 'stretch', gap: 8, minHeight: 42 }
      }
    >
      <Copy
        accessibilityLiveRegion="polite"
        maxFontSizeMultiplier={1.5}
        style={{ flex: large ? undefined : 1, fontWeight: '800', fontSize: 16, color: missed ? '#B54132' : ink }}
      >
        {caption0}
      </Copy>
      {scaleHolder && !won && (
        <Button
          quiet
          compact
          maxFontSizeMultiplier={1.35}
          disabled={!active}
          onPress={scaleHolder.onSwapRoles}
          label={scaleHolder.swapNeedsFresh ? 'Swap roles with fresh shells' : 'Swap Scale Holder and Guesser'}
        >
          {scaleHolder.swapNeedsFresh ? 'Swap roles (new)' : 'Swap roles'}
        </Button>
      )}
      {onToggleLinks && !won && (
        <Button
          quiet
          compact
          maxFontSizeMultiplier={1.35}
          disabled={!active}
          onPress={() => onToggleLinks(!showLinks)}
        >
          {showLinks ? 'Hide links' : 'Show links'}
        </Button>
      )}
    </View>
  );

  const actionsRow = !won ? (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignSelf: 'stretch' }}>
      <Button compact maxFontSizeMultiplier={1.45} disabled={!live || !canCheck} onPress={onCheck}>
        Check
      </Button>
      <Button quiet compact maxFontSizeMultiplier={1.35} disabled={!live || !canUndo} onPress={onUndo}>
        Undo
      </Button>
      <Button quiet compact maxFontSizeMultiplier={1.35} disabled={!live || !canReset} onPress={onReset}>
        Clear row
      </Button>
    </View>
  ) : null;

  const content = (
    <>
      {header}
      {head}
      {scaleHolder && !won && (
        <Copy testID="scale-role-banner" maxFontSizeMultiplier={1.4} style={{ fontSize: 13, fontWeight: '800', color: '#24666E' }}>
          {`${scaleHolder.names[scaleHolder.holder === 0 ? 1 : 0]} chooses weighings · ${scaleHolder.names[scaleHolder.holder]} holds the secret scale`}
        </Copy>
      )}
      {scaleView}
      {panRow}
      {trayAndAnswer}
      {actionsRow}
      {linksSection}
      {historyStrip}
      {finished}
      {!won && help}
      {practiceControls}
      {footer}
    </>
  );

  return school ? (
    <BoardPrimary style={{ alignSelf: 'stretch', gap: 10 }}>{content}</BoardPrimary>
  ) : (
    <View style={{ alignSelf: 'stretch', gap: 10 }}>{content}</View>
  );
}
