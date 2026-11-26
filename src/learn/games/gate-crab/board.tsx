import React, { useEffect, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { BoardPrimary } from '../../BoardSpace';
import { CoachSpot } from '../../Coach';
import { useReducedMotion } from '../../../components/motion';
import { atLarge, LARGE_TEXT, wordFitMultiplier } from '../../../components/wordFit';
import { Button, Copy, Heading, PressableScale } from '../../../components/ui';
import type { HintCue } from '../../../puzzles/hints';
import { ALL_SHELL_CODES, GateCrabArt, ink, RulePicture, ShellArt, type GateMood } from './art';
import { focusOf } from './help';
import {
  builderShellSize, crabSceneHeight, evidenceShellSize, evidenceSideBySide,
  pickerColumns, pickerShellSize,
} from './layout';
import {
  codesToRow, rowCodes, rowShort, rowWords, RULE_BY_ID, shellShort,
  type CounterexampleInfo, type EvidenceEntry, type GatePuzzle, type RuleDef, type ShellCode,
} from './rules';
import { rowReadSpeechText, shellButtonLabel } from './speech';

export type TogetherProps = {
  readonly names: readonly [string, string];
  readonly maker: 0 | 1;
  readonly stage: 'cover-maker' | 'pick-rule' | 'cover-guesser' | 'play' | 'revealed';
  readonly options: readonly RuleDef[];
  readonly onOpenPicker: () => void;
  readonly onPickRule: (ruleId: string) => void;
  readonly onSurprise: () => void;
  readonly onLockRule: () => void;
  readonly onStartGuessing: () => void;
};

export type GateCrabBoardProps = {
  readonly puzzle: GatePuzzle;
  readonly evidence: readonly EvidenceEntry[];
  readonly testsCount: number;
  readonly builder: readonly ShellCode[];
  readonly quizRows: readonly number[];
  readonly quizChoices: readonly (boolean | null)[];
  readonly phase: 'test' | 'quiz';
  readonly won: boolean;
  readonly active: boolean;
  readonly width: number;
  readonly title: string;
  readonly readRows: boolean;
  readonly mood: GateMood;
  readonly statusLine?: string;
  readonly notice?: string;
  readonly counterexample: CounterexampleInfo | null;
  readonly canCheck: boolean;
  readonly canUndo: boolean;
  readonly canResetQuiz: boolean;
  readonly testDisabled?: boolean;
  readonly quizEditDisabled?: boolean;
  readonly cue?: HintCue | null;
  readonly coach?: { active: boolean; done: () => void };
  readonly together?: TogetherProps;
  readonly onSetBuilderSlot: (slot: number, shell: ShellCode) => void;
  readonly onCycleBuilderSlot: (slot: number) => void;
  readonly onLoadRow: (rowIdx: number) => void;
  readonly onTest: () => void;
  readonly onPhase: (phase: 'test' | 'quiz') => void;
  readonly onQuizChoice: (slot: number, pass: boolean) => void;
  readonly onCheckQuiz: () => void;
  readonly onUndo: () => void;
  readonly onResetQuiz: () => void;
  readonly onToggleReadRows: () => void;
  readonly onSpeakRow?: (rowIdx: number, outcome?: boolean) => void;
  readonly help?: React.ReactNode;
  readonly finished?: React.ReactNode;
  readonly header?: React.ReactNode;
  readonly footer?: React.ReactNode;
};

/** Picks a balanced spread across every rule family in the level so all families are reachable in the Maker picker. */
export function selectMakerPickerOptions(options: readonly RuleDef[], selectedRuleId?: string, limit = 18): RuleDef[] {
  if (options.length <= limit) return [...options];
  const byFamily = new Map<string, RuleDef[]>();
  for (const rule of options) {
    const bucket = byFamily.get(rule.family);
    if (bucket) bucket.push(rule);
    else byFamily.set(rule.family, [rule]);
  }
  const buckets = [...byFamily.values()];
  const picked: RuleDef[] = [];
  const seen = new Set<string>();
  for (let round = 0; picked.length < limit; round++) {
    let added = false;
    for (const bucket of buckets) {
      if (round < bucket.length && picked.length < limit) {
        picked.push(bucket[round]);
        seen.add(bucket[round].id);
        added = true;
      }
    }
    if (!added) break;
  }
  if (selectedRuleId && !seen.has(selectedRuleId)) {
    const cur = options.find(r => r.id === selectedRuleId);
    if (cur) {
      const sameFamilyIdx = picked.findIndex(r => r.family === cur.family);
      picked[sameFamilyIdx >= 0 ? sameFamilyIdx : picked.length - 1] = cur;
    }
  }
  return picked;
}

function ShellStrip({ len, rowIdx, size }: { len: 2 | 3; rowIdx: number; size: number }) {
  const codes = rowCodes(len, rowIdx);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {codes.map((code, i) => (
        <ShellArt key={i} code={code} size={size} />
      ))}
    </View>
  );
}

export function GateCrabBoard(props: GateCrabBoardProps) {
  const {
    puzzle, evidence, testsCount, builder, quizRows, quizChoices, phase, won, active, width, title,
    readRows, mood, statusLine, notice, counterexample, canCheck, canUndo, canResetQuiz,
    testDisabled = false, quizEditDisabled = false, cue = null, coach, together,
    onSetBuilderSlot, onCycleBuilderSlot, onLoadRow, onTest, onPhase, onQuizChoice,
    onCheckQuiz, onUndo, onResetQuiz, onToggleReadRows, onSpeakRow, help, finished, header, footer,
  } = props;

  const reduced = useReducedMotion();
  const window = useWindowDimensions();
  const fontScale = window.fontScale ?? 1;
  const large = fontScale >= LARGE_TEXT;
  const boardW = Math.max(260, Math.min(width, 760));
  const btnMax = atLarge(fontScale, 1.35);
  const titleMax = large ? wordFitMultiplier(title, 18, boardW - 12, 1.5) : undefined;

  const [selectedSlot, setSelectedSlot] = useState(0);
  const [spokenLine, setSpokenLine] = useState('');
  const safeSlot = Math.min(selectedSlot, puzzle.len - 1);

  // Subtle spring animation on the Gate Crab when a row passes or blocks.
  const bounce = useSharedValue(1);
  const prevTests = useRef(testsCount);
  useEffect(() => {
    if (testsCount !== prevTests.current) {
      prevTests.current = testsCount;
      if (!reduced) {
        bounce.set(withSequence(withTiming(0.95, { duration: 75 }), withSpring(1, { damping: 10, stiffness: 260 })));
      }
    }
  }, [testsCount, reduced, bounce]);
  const crabAnim = useAnimatedStyle(() => ({ transform: [{ scale: bounce.get() }] }));

  const focus = won ? { highlightPass: false, contrastRow: null, quizSlot: null } : focusOf(cue);
  const passRows = evidence.filter(e => e.pass);
  const blockRows = evidence.filter(e => !e.pass);
  const sideBySide = evidenceSideBySide(boardW, large);
  const evShell = evidenceShellSize(boardW, puzzle.len, sideBySide, window.width);
  const bShell = builderShellSize(boardW, puzzle.len, window.width);
  const pCols = pickerColumns(boardW, large);
  const pShell = pickerShellSize(boardW, large);
  const sceneH = crabSceneHeight(window.width, large);
  const sceneW = Math.min(boardW, Math.round((sceneH * 260) / 140));
  const revealedRule = won ? RULE_BY_ID.get(puzzle.ruleId) ?? null : null;

  const speak = (rowIdx: number, outcome?: boolean) => {
    setSpokenLine(rowReadSpeechText(puzzle.len, rowIdx, outcome));
    onSpeakRow?.(rowIdx, outcome);
  };

  // ---------- Together Rule-Maker handover & picture menu ----------
  if (together && together.stage === 'cover-maker') {
    const makerName = together.names[together.maker] || `Player ${together.maker + 1}`;
    const guesserName = together.names[together.maker === 0 ? 1 : 0] || `Player ${together.maker === 0 ? 2 : 1}`;
    return (
      <View testID="gate-together-cover-maker" style={{ gap: 14, alignItems: 'center', paddingVertical: 8 }}>
        {header}
        <GateCrabArt mood="idle" width={sceneW} height={sceneH} />
        <Heading maxFontSizeMultiplier={atLarge(fontScale, 1.5)} style={{ fontSize: 22, textAlign: 'center', color: ink }}>
          Rule maker: {makerName}
        </Heading>
        <Copy maxFontSizeMultiplier={btnMax} style={{ textAlign: 'center', color: ink }}>
          Hand the device to {makerName} to choose the secret gate rule. No peeking, {guesserName}!
        </Copy>
        <Button maxFontSizeMultiplier={btnMax} disabled={!active} onPress={together.onOpenPicker}>
          I’m {makerName} — pick a rule
        </Button>
        {footer}
      </View>
    );
  }

  if (together && together.stage === 'pick-rule') {
    const makerName = together.names[together.maker] || `Player ${together.maker + 1}`;
    const currentRule = RULE_BY_ID.get(puzzle.ruleId);
    return (
      <View testID="gate-together-pick-rule" style={{ gap: 12 }}>
        {header}
        <View style={{ backgroundColor: '#F6EFE2', borderRadius: 18, padding: 12, gap: 6, borderWidth: 1.5, borderColor: '#D6C2A3' }}>
          <Heading maxFontSizeMultiplier={atLarge(fontScale, 1.4)} style={{ fontSize: 19, color: ink }}>
            {makerName}: choose a secret rule
          </Heading>
          <Copy maxFontSizeMultiplier={btnMax} style={{ fontSize: 14, color: ink }}>
            Pick a rule card below, or tap Surprise me. Then tap Lock secret rule & hide before handing over the device.
          </Copy>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            <Button maxFontSizeMultiplier={btnMax} disabled={!active} onPress={together.onLockRule}>
              Lock secret rule & hide
            </Button>
            <Button quiet compact maxFontSizeMultiplier={btnMax} disabled={!active} onPress={together.onSurprise}>
              Surprise me
            </Button>
          </View>
        </View>

        {currentRule && (
          <View testID="gate-maker-preview" style={{ backgroundColor: '#E5F4EC', borderRadius: 16, padding: 10, gap: 8, borderWidth: 1.5, borderColor: '#6EB48D' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <RulePicture spec={currentRule.picture} width={104} height={40} />
              <View style={{ flex: 1, minWidth: 140 }}>
                <Copy maxFontSizeMultiplier={btnMax} style={{ fontWeight: '900', color: ink }}>Selected secret rule</Copy>
                <Copy maxFontSizeMultiplier={btnMax} style={{ color: ink, fontSize: 14 }}>{currentRule.label}</Copy>
              </View>
            </View>
            <Copy maxFontSizeMultiplier={btnMax} style={{ fontSize: 13, color: '#2E6248' }}>
              Starter clues shown to tester: 2 PASS rows and 2 BLOCK rows ready.
            </Copy>
          </View>
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {selectMakerPickerOptions(together.options, puzzle.ruleId).map(rule => {
            const selected = rule.id === puzzle.ruleId;
            return (
              <PressableScale
                key={rule.id}
                testID={`gate-rule-option-${rule.id}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Secret rule: ${rule.label}`}
                disabled={!active}
                onPress={() => together.onPickRule(rule.id)}
                style={{
                  width: boardW >= 540 ? '48%' : '100%',
                  backgroundColor: selected ? '#E2F2E4' : '#FFFDF6',
                  borderRadius: 16,
                  borderWidth: selected ? 2.5 : 1.5,
                  borderColor: selected ? '#2E8B57' : '#CBDAD8',
                  padding: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  minHeight: 58,
                }}
              >
                <RulePicture spec={rule.picture} width={96} height={36} />
                <Copy maxFontSizeMultiplier={btnMax} style={{ flex: 1, fontSize: 14, fontWeight: selected ? '900' : '700', color: ink }}>
                  {rule.label}
                </Copy>
              </PressableScale>
            );
          })}
        </View>
        {footer}
      </View>
    );
  }

  if (together && together.stage === 'cover-guesser') {
    const makerName = together.names[together.maker] || `Player ${together.maker + 1}`;
    const guesserName = together.names[together.maker === 0 ? 1 : 0] || `Player ${together.maker === 0 ? 2 : 1}`;
    return (
      <View testID="gate-together-cover-guesser" style={{ gap: 14, alignItems: 'center', paddingVertical: 8 }}>
        {header}
        <GateCrabArt mood="block" width={sceneW} height={sceneH} />
        <Heading maxFontSizeMultiplier={atLarge(fontScale, 1.5)} style={{ fontSize: 22, textAlign: 'center', color: ink }}>
          Secret rule locked!
        </Heading>
        <Copy maxFontSizeMultiplier={btnMax} style={{ textAlign: 'center', color: ink }}>
          {makerName}’s rule is safely hidden. Hand the device to {guesserName} to test the gate!
        </Copy>
        <Button maxFontSizeMultiplier={btnMax} disabled={!active} onPress={together.onStartGuessing}>
          I’m {guesserName} — test the gate
        </Button>
        {footer}
      </View>
    );
  }

  // ---------- Main Play & Quiz Board ----------
  const sortedCount = quizChoices.filter(c => c !== null).length;
  const builderRowIdx = codesToRow(builder);

  const renderEvidenceRow = (e: EvidenceEntry, idx: number) => {
    const isHighlight = counterexample?.row === e.row || counterexample?.contrastRow === e.row || focus.contrastRow === e.row;
    const label = `${e.pass ? 'Pass' : 'Block'} clue: ${rowWords(puzzle.len, e.row)}. Tap to copy into builder.`;
    return (
      <PressableScale
        key={`${e.row}-${idx}`}
        testID={`gate-ev-${e.row}`}
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={!active || won}
        onPress={() => {
          onLoadRow(e.row);
          if (readRows) speak(e.row, e.pass);
        }}
        style={{
          backgroundColor: isHighlight ? '#FFF2BD' : '#FFFDF6',
          borderRadius: 12,
          borderWidth: isHighlight ? 2.2 : 1.2,
          borderColor: isHighlight ? '#D99B16' : e.pass ? '#9FD1B5' : '#E3B0A3',
          paddingVertical: 6,
          paddingHorizontal: 8,
          alignItems: 'center',
          gap: 3,
          minHeight: 44,
        }}
      >
        <ShellStrip len={puzzle.len} rowIdx={e.row} size={evShell} />
        {readRows && (
          <Copy maxFontSizeMultiplier={atLarge(fontScale, 1.25)} style={{ fontSize: 12, color: ink, textAlign: 'center' }}>
            {rowShort(puzzle.len, e.row)}
          </Copy>
        )}
      </PressableScale>
    );
  };

  const evidenceSection = (
    <View testID="gate-evidence" style={{ flexDirection: sideBySide ? 'row' : 'column', gap: 10 }}>
      <View
        testID="gate-pass-column"
        style={{
          flex: 1,
          backgroundColor: '#E5F4EC',
          borderRadius: 16,
          padding: 8,
          gap: 6,
          borderWidth: focus.highlightPass ? 3 : 1.5,
          borderColor: focus.highlightPass ? '#E9B024' : '#7BC09B',
        }}
      >
        <Copy maxFontSizeMultiplier={btnMax} style={{ fontWeight: '900', fontSize: 14, color: '#1F6943', textAlign: 'center' }}>
          ✓ PASS ({passRows.length})
        </Copy>
        {passRows.map(renderEvidenceRow)}
      </View>
      <View
        testID="gate-block-column"
        style={{
          flex: 1,
          backgroundColor: '#FCEAE4',
          borderRadius: 16,
          padding: 8,
          gap: 6,
          borderWidth: 1.5,
          borderColor: '#DFA08F',
        }}
      >
        <Copy maxFontSizeMultiplier={btnMax} style={{ fontWeight: '900', fontSize: 14, color: '#9E3824', textAlign: 'center' }}>
          ✕ BLOCK ({blockRows.length})
        </Copy>
        {blockRows.map(renderEvidenceRow)}
      </View>
    </View>
  );

  return (
    <View testID="gate-crab-board" style={{ gap: 12, width: '100%', maxWidth: width }}>
      {header}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <Copy maxFontSizeMultiplier={titleMax} style={{ fontWeight: '900', fontSize: 16, color: ink, flexShrink: 1 }}>
          {title}
        </Copy>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Copy maxFontSizeMultiplier={btnMax} style={{ fontSize: 13, fontWeight: '700', color: '#4A6E70' }}>
            Tests: {testsCount}
          </Copy>
          <Button
            quiet
            compact
            selected={readRows}
            maxFontSizeMultiplier={btnMax}
            label={readRows ? 'Row reading is on. Tap to turn off.' : 'Row reading is off. Tap to read rows aloud.'}
            onPress={onToggleReadRows}
          >
            {readRows ? 'Read rows: On' : 'Read rows'}
          </Button>
        </View>
      </View>

      {/* Live Gate Crab scene */}
      <BoardPrimary>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Animated.View style={crabAnim}>
            <PressableScale
              accessibilityRole="imagebutton"
              accessibilityLabel={won ? 'Gate Crab with open gate' : 'Gate Crab guarding the shell gate. Tap to test your row.'}
              disabled={!active || won || phase !== 'test' || testDisabled}
              onPress={() => {
                coach?.done();
                onTest();
              }}
            >
              <GateCrabArt mood={won ? 'pass' : mood} width={sceneW} height={sceneH} />
            </PressableScale>
          </Animated.View>

          {!!statusLine && (
            <View accessibilityLiveRegion="polite" style={{ backgroundColor: mood === 'pass' || won ? '#E2F2E4' : mood === 'block' ? '#FCEAE4' : '#F3F6F5', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'stretch' }}>
              <Copy maxFontSizeMultiplier={btnMax} style={{ textAlign: 'center', fontWeight: '800', fontSize: 14, color: ink }}>
                {statusLine}
              </Copy>
            </View>
          )}
          {!!notice && (
            <Copy accessibilityLiveRegion="polite" maxFontSizeMultiplier={btnMax} style={{ textAlign: 'center', fontSize: 14, color: '#8C4A19', fontWeight: '700' }}>
              {notice}
            </Copy>
          )}
          {!!spokenLine && readRows && (
            <Copy accessibilityLiveRegion="polite" maxFontSizeMultiplier={atLarge(fontScale, 1.3)} style={{ textAlign: 'center', fontSize: 13, color: '#2C6A73' }}>
              {spokenLine}
            </Copy>
          )}

          {/* Gentle counterexample card after a missed quiz check */}
          {counterexample && !won && (
            <View
              testID="gate-counterexample"
              accessibilityLiveRegion="polite"
              style={{
                alignSelf: 'stretch',
                backgroundColor: '#FFF5DA',
                borderRadius: 16,
                borderWidth: 2,
                borderColor: '#E5A823',
                padding: 10,
                gap: 8,
              }}
            >
              <Copy maxFontSizeMultiplier={btnMax} style={{ fontWeight: '900', fontSize: 15, color: '#7D4F09' }}>
                New clue from the quiz!
              </Copy>
              <Copy maxFontSizeMultiplier={btnMax} style={{ fontSize: 14, color: ink }}>
                {counterexample.note}
              </Copy>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ alignItems: 'center', backgroundColor: counterexample.actualPass ? '#E2F2E4' : '#FCEAE4', borderRadius: 12, padding: 6 }}>
                  <Copy maxFontSizeMultiplier={atLarge(fontScale, 1.25)} style={{ fontSize: 12, fontWeight: '900', color: ink }}>
                    {counterexample.actualPass ? '✓ PASS' : '✕ BLOCK'}
                  </Copy>
                  <ShellStrip len={puzzle.len} rowIdx={counterexample.row} size={Math.max(26, evShell)} />
                </View>
                {counterexample.contrastRow !== null && counterexample.contrastPass !== null && (
                  <View style={{ alignItems: 'center', backgroundColor: counterexample.contrastPass ? '#E2F2E4' : '#FCEAE4', borderRadius: 12, padding: 6 }}>
                    <Copy maxFontSizeMultiplier={atLarge(fontScale, 1.25)} style={{ fontSize: 12, fontWeight: '900', color: ink }}>
                      Compare {counterexample.contrastPass ? '✓ PASS' : '✕ BLOCK'}
                    </Copy>
                    <ShellStrip len={puzzle.len} rowIdx={counterexample.contrastRow} size={Math.max(26, evShell)} />
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Post-solve secret rule reveal (never shown before won === true!) */}
          {won && revealedRule && (
            <View testID="gate-rule-reveal" accessibilityLiveRegion="polite" style={{ alignSelf: 'stretch', backgroundColor: '#E2F2E4', borderRadius: 18, borderWidth: 2, borderColor: '#2E8B57', padding: 12, alignItems: 'center', gap: 8 }}>
              <Copy maxFontSizeMultiplier={btnMax} style={{ fontWeight: '900', fontSize: 15, color: '#1F6943' }}>
                Secret rule discovered!
              </Copy>
              <RulePicture spec={revealedRule.picture} width={132} height={48} />
              <Copy maxFontSizeMultiplier={btnMax} style={{ fontWeight: '900', fontSize: 17, color: ink, textAlign: 'center' }}>
                {revealedRule.label}
              </Copy>
            </View>
          )}

          {finished}

          {/* Phase controls when still playing */}
          {!won && (
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', alignSelf: 'stretch' }}>
              <Button
                quiet={phase !== 'test'}
                compact
                maxFontSizeMultiplier={btnMax}
                disabled={!active}
                onPress={() => onPhase('test')}
              >
                Test rows
              </Button>
              <Button
                quiet={phase !== 'quiz'}
                compact
                maxFontSizeMultiplier={btnMax}
                disabled={!active}
                onPress={() => onPhase('quiz')}
              >
                Take the quiz ({sortedCount}/5)
              </Button>
            </View>
          )}
        </View>
      </BoardPrimary>

      {/* PHASE 1: Shell Row Builder + 6-Shell Picker */}
      {!won && phase === 'test' && (
        <View testID="gate-builder-panel" style={{ backgroundColor: '#F7F3EA', borderRadius: 20, padding: 12, gap: 10, borderWidth: 1.5, borderColor: '#D6C8B0' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
            <Copy maxFontSizeMultiplier={btnMax} style={{ fontWeight: '800', fontSize: 14, color: ink }}>
              Build a {puzzle.len}-shell row to test:
            </Copy>
            {readRows && (
              <Button
                quiet
                compact
                maxFontSizeMultiplier={btnMax}
                onPress={() => speak(builderRowIdx)}
                label={`Read builder row: ${rowWords(puzzle.len, builderRowIdx)}`}
              >
                Hear row
              </Button>
            )}
          </View>

          {/* Active Row Slots */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
            {builder.map((code, idx) => {
              const selected = idx === safeSlot;
              return (
                <PressableScale
                  key={idx}
                  testID={`gate-slot-${idx}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Row slot ${idx + 1}: ${shellButtonLabel(code)}. ${selected ? 'Selected. Tap again to cycle shell.' : 'Tap to select.'}`}
                  disabled={!active || testDisabled}
                  onPress={() => {
                    if (selected) onCycleBuilderSlot(idx);
                    else setSelectedSlot(idx);
                  }}
                  style={{
                    width: bShell + 16,
                    minHeight: bShell + 22,
                    borderRadius: 16,
                    backgroundColor: selected ? '#E3F4F2' : '#FFFDF6',
                    borderWidth: selected ? 3 : 1.8,
                    borderColor: selected ? '#1D7478' : '#C3D2D0',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4,
                  }}
                >
                  <ShellArt code={code} size={bShell} />
                  <Copy maxFontSizeMultiplier={atLarge(fontScale, 1.2)} style={{ fontSize: 11, fontWeight: '800', color: ink }}>
                    {shellShort(code)}
                  </Copy>
                </PressableScale>
              );
            })}
          </View>

          {/* Subtle divider between the row slots and the 6-shell picker tray */}
          <View style={{ height: 1, backgroundColor: '#E3D7C3', marginVertical: 2 }} />

          {/* 6-Shell Picker Tray: explicit 6x1 or 3x2 rows so narrow/Challenge/AX5 screens never wrap 2x3 or overflow */}
          <View style={{ gap: 8, alignItems: 'center', width: '100%' }}>
            {(pCols === 6 ? [ALL_SHELL_CODES] : [ALL_SHELL_CODES.slice(0, 3), ALL_SHELL_CODES.slice(3, 6)]).map((rowCodesList, rIdx) => (
              <View
                key={rIdx}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  maxWidth: pCols === 6 ? 6 * (pShell + 10) + 5 * 8 : Math.min(boardW, 560),
                }}
              >
                {rowCodesList.map(code => {
                  const activeShell = builder[safeSlot] === code;
                  return (
                    <PressableScale
                      key={code}
                      testID={`gate-pick-${code}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Put ${shellButtonLabel(code)} in slot ${safeSlot + 1}`}
                      accessibilityState={{ selected: activeShell }}
                      disabled={!active || testDisabled}
                      onPress={() => {
                        coach?.done();
                        onSetBuilderSlot(safeSlot, code);
                        if (readRows) setSpokenLine(shellButtonLabel(code));
                      }}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        minHeight: 52,
                        borderRadius: 14,
                        backgroundColor: activeShell ? '#FFF2BD' : '#FFFDF6',
                        borderWidth: activeShell ? 2.4 : 1.4,
                        borderColor: activeShell ? '#D99B16' : '#CBDAD8',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 4,
                        paddingHorizontal: 2,
                      }}
                    >
                      <ShellArt code={code} size={Math.min(44, pShell - 4)} />
                      <Copy maxFontSizeMultiplier={atLarge(fontScale, 1.15)} style={{ fontSize: 11, fontWeight: '700', color: ink }}>
                        {shellShort(code)}
                      </Copy>
                    </PressableScale>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Primary Test Action + Quiz Shortcut + Undo */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            <CoachSpot active={!!coach?.active}>
              <Button
                maxFontSizeMultiplier={btnMax}
                disabled={!active || testDisabled}
                onPress={() => {
                  coach?.done();
                  onTest();
                }}
              >
                Test at gate
              </Button>
            </CoachSpot>
            <Button
              quiet
              maxFontSizeMultiplier={btnMax}
              disabled={!active}
              onPress={() => onPhase('quiz')}
            >
              I know the rule!
            </Button>
            {canUndo && (
              <Button quiet compact maxFontSizeMultiplier={btnMax} disabled={!active} onPress={onUndo}>
                Undo
              </Button>
            )}
          </View>
        </View>
      )}

      {/* PHASE 2: Sort 5 Disagreeing Quiz Rows */}
      {!won && phase === 'quiz' && (
        <View testID="gate-quiz-panel" style={{ backgroundColor: '#F3F7F6', borderRadius: 20, padding: 12, gap: 10, borderWidth: 1.5, borderColor: '#B5D1CE' }}>
          <Heading maxFontSizeMultiplier={atLarge(fontScale, 1.4)} style={{ fontSize: 18, color: ink }}>
            Sort 5 new rows to prove you found the rule
          </Heading>
          <Copy maxFontSizeMultiplier={btnMax} style={{ fontSize: 14, color: ink }}>
            Tap Pass or Block for each row. A wrong guess is never game over — it joins your clues!
          </Copy>
          {quizRows.map((rowIdx, slot) => {
            const pick = quizChoices[slot];
            const highlighted = focus.quizSlot === slot;
            return (
              <View
                key={`${slot}-${rowIdx}`}
                testID={`gate-quiz-row-${slot}`}
                style={{
                  backgroundColor: highlighted ? '#FFF2BD' : '#FFFDF6',
                  borderRadius: 16,
                  borderWidth: highlighted ? 2.4 : 1.5,
                  borderColor: highlighted ? '#D99B16' : '#CBDAD8',
                  padding: 10,
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Copy maxFontSizeMultiplier={btnMax} style={{ fontWeight: '900', color: '#4A6E70', fontSize: 14 }}>
                      {slot + 1}.
                    </Copy>
                    <ShellStrip len={puzzle.len} rowIdx={rowIdx} size={Math.max(34, evShell + 4)} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    <Button
                      compact
                      quiet={pick !== true}
                      selected={pick === true}
                      maxFontSizeMultiplier={btnMax}
                      disabled={!active || quizEditDisabled}
                      label={`Quiz row ${slot + 1}, ${rowWords(puzzle.len, rowIdx)}: Pass`}
                      onPress={() => onQuizChoice(slot, true)}
                      style={pick === true ? { backgroundColor: '#2E8B57', borderColor: '#2E8B57' } : undefined}
                    >
                      ✓ Pass
                    </Button>
                    <Button
                      compact
                      quiet={pick !== false}
                      selected={pick === false}
                      maxFontSizeMultiplier={btnMax}
                      disabled={!active || quizEditDisabled}
                      label={`Quiz row ${slot + 1}, ${rowWords(puzzle.len, rowIdx)}: Block`}
                      onPress={() => onQuizChoice(slot, false)}
                      style={pick === false ? { backgroundColor: '#C95A42', borderColor: '#C95A42' } : undefined}
                    >
                      ✕ Block
                    </Button>
                  </View>
                </View>
                {readRows && (
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={`Read quiz row ${slot + 1}: ${rowWords(puzzle.len, rowIdx)}`}
                    onPress={() => speak(rowIdx)}
                  >
                    <Copy maxFontSizeMultiplier={atLarge(fontScale, 1.25)} style={{ fontSize: 13, color: '#2C6A73' }}>
                      🔊 {rowWords(puzzle.len, rowIdx)}
                    </Copy>
                  </PressableScale>
                )}
              </View>
            );
          })}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            <Button
              maxFontSizeMultiplier={btnMax}
              disabled={!active || !canCheck}
              onPress={onCheckQuiz}
            >
              Check my 5 ({sortedCount}/5)
            </Button>
            <Button quiet compact maxFontSizeMultiplier={btnMax} disabled={!active} onPress={() => onPhase('test')}>
              Back to testing
            </Button>
            {canUndo && (
              <Button quiet compact maxFontSizeMultiplier={btnMax} disabled={!active} onPress={onUndo}>
                Undo
              </Button>
            )}
            {canResetQuiz && (
              <Button quiet compact maxFontSizeMultiplier={btnMax} disabled={!active} onPress={onResetQuiz}>
                Clear
              </Button>
            )}
          </View>
        </View>
      )}

      {/* Tested & Starter Evidence Columns */}
      {evidenceSection}

      {/* Shared Help Ladder */}
      {!won && help}
      {footer}
    </View>
  );
}
