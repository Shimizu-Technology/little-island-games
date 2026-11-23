import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { hasSpeech } from '../../../components/Audio';
import { Button, C, Copy } from '../../../components/ui';
import type { HintCue } from '../../../puzzles/hints';
import { PuzzleHelp, type HintCommit, type HintSnapshot } from '../../../puzzles/ui/PuzzleHelp';
import type { BoardProps } from '../../types';
import type { GateMood } from './art';
import { GateCrabBoard } from './board';
import {
  canCheckQuiz, checkQuiz, cycleBuilderSlot, dealFresh, evidenceOf, levelInfo, loadRowIntoBuilder,
  lockSecretRule, makerRuleOptions, markHelped, nextGate, openRulePicker, pickSecretRule, puzzleAt,
  resetQuiz, setBuilderSlot, setPhase, setQuizChoice, startGuessing, submitTestRow, toggleReadRows,
  undoStep, type GateCrabState,
} from './engine';
import { gateCrabHelpRules, type GateHelpAction, type GateView } from './help';
import { evaluateRow, RULE_BY_ID } from './rules';
import { GATE_SPEECH_KEYS } from './speech';

const keyOf = (s: GateCrabState) =>
  `${s.index}:${s.puzzles[s.index]?.[2] ?? ''}:${s.tests.length}:${s.revealed.length}:${s.quizChoices.map(c => (c === null ? '-' : c ? '1' : '0')).join('')}:${s.won ? 1 : 0}:${s.stage}:${s.maker}`;

export function SchoolBoard({ session, update, practice, assistance, cheer, coach, active, width, sound, soundOn }: BoardProps<GateCrabState>) {
  const state = session.state;
  const puzzle = useMemo(() => puzzleAt(state), [state.index, state.puzzles]); // eslint-disable-line react-hooks/exhaustive-deps -- index and puzzles identify the gate.
  const latest = useRef(state);
  useLayoutEffect(() => { latest.current = state; }, [state]);

  const [mood, setMood] = useState<GateMood>('idle');
  const [statusLine, setStatusLine] = useState('Build a shell row and tap Test at gate.');
  const [notice, setNotice] = useState('');
  const [cue, setCue] = useState<HintCue | null>(null);

  const commit = useCallback((next: GateCrabState) => {
    if (next === latest.current) return false;
    latest.current = next;
    update(next);
    return true;
  }, [update]);

  const say = useCallback((key: string) => {
    if (soundOn && hasSpeech(key)) sound(key);
  }, [sound, soundOn]);

  const onTest = useCallback(() => {
    const res = submitTestRow(latest.current);
    if (res.duplicate) {
      setMood(res.pass ? 'pass' : 'block');
      setStatusLine(res.pass ? 'Already tested — that row PASSES!' : 'Already tested — that row BLOCKS!');
      say(GATE_SPEECH_KEYS.alreadyTested);
      sound('tap');
      return;
    }
    if (!commit(res.state)) return;
    setNotice('');
    setMood(res.pass ? 'pass' : 'block');
    setStatusLine(res.pass ? 'The gate opens! That row PASSES.' : 'The gate stays shut. That row BLOCKS.');
    sound(res.pass ? 'match' : 'tap');
    say(res.pass ? GATE_SPEECH_KEYS.pass : GATE_SPEECH_KEYS.block);
  }, [commit, say, sound]);

  const onCheck = useCallback(() => {
    const res = checkQuiz(latest.current);
    if (!commit(res.state)) return;
    setNotice('');
    if (res.correct) {
      setMood('pass');
      setStatusLine(res.state.together
        ? `${(session.names?.[res.state.maker === 0 ? 1 : 0] || 'Tester')} cracked ${(session.names?.[res.state.maker] || 'Maker')}’s secret rule!`
        : 'All five right! You discovered the secret rule!');
      if (res.state.index === res.state.puzzles.length - 1) cheer('big', GATE_SPEECH_KEYS.solved);
      else sound('match');
      if (!res.state.together && !res.state.helped && res.state.misses === 0) {
        practice('think.rule-discovery', true);
      }
    } else {
      setMood('block');
      setStatusLine('Not quite yet — your missed row became a new clue!');
      sound('tap');
      say(GATE_SPEECH_KEYS.counterexample);
    }
  }, [cheer, commit, practice, say, session.names, sound]);

  const evidence = useMemo(() => evidenceOf(state), [state]);
  const rules = useMemo(() => {
    if (!puzzle) return null;
    const rule = RULE_BY_ID.get(puzzle.ruleId)!;
    // In Together mode, Look/Think/One step work from public evidence; Show me stays off so Maker's rule isn't spoiled.
    return gateCrabHelpRules(row => evaluateRow(rule, puzzle.len, row), !state.together);
  }, [puzzle, state.together]);

  const snapshot = useMemo<HintSnapshot<GateView> | null>(() => {
    if (!puzzle) return null;
    return {
      key: keyOf(state),
      view: {
        len: puzzle.len,
        rung: puzzle.rung,
        evidence,
        quizRows: state.quizRows,
        quizChoices: state.quizChoices,
      },
    };
  }, [evidence, puzzle, state]);

  const helpCommit = useCallback(async (event: HintCommit<GateHelpAction>, expected: string): Promise<HintSnapshot<GateView> | null> => {
    const at = latest.current;
    const p = puzzleAt(at);
    if (!active || !p || keyOf(at) !== expected) return null;
    if (event.kind === 'help') {
      if (!at.together) assistance?.();
      commit(markHelped(at));
    } else if (event.kind === 'step') {
      if (event.action.kind === 'test') {
        const res = submitTestRow(at, event.action.row);
        if (!commit(res.state)) return null;
        setMood(res.pass ? 'pass' : 'block');
        setStatusLine(res.pass ? 'Hint test: PASS! The gate opens.' : 'Hint test: BLOCK! The gate stays shut.');
        sound(res.pass ? 'match' : 'tap');
      } else {
        const next = setQuizChoice(at, event.action.slot, event.action.pass);
        if (!commit(next)) return null;
        sound('tap');
      }
    }
    const now = latest.current;
    return {
      key: keyOf(now),
      view: {
        len: p.len,
        rung: p.rung,
        evidence: evidenceOf(now),
        quizRows: now.quizRows,
        quizChoices: now.quizChoices,
      },
    };
  }, [active, assistance, commit, sound]);

  const onCue = useCallback((next: HintCue | null) => {
    setCue(next);
    if (next?.text.startsWith('Look')) say(GATE_SPEECH_KEYS.hintLook);
    else if (next?.text.startsWith('Think')) say(GATE_SPEECH_KEYS.hintThink);
  }, [say]);

  if (!puzzle || !rules || !snapshot) return null;

  const names: readonly [string, string] = [session.names?.[0] || 'Player 1', session.names?.[1] || 'Player 2'];
  const boardKey = `${state.index}:${puzzle.ruleId}:${state.stage}`;
  const title = `${levelInfo[state.level - 1].name} · Gate ${state.index + 1} of ${state.puzzles.length}`;

  const finished = state.won ? (
    <View accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: 10, alignSelf: 'stretch', backgroundColor: '#E2F2E4', borderRadius: 20, padding: 14 }}>
      <Copy maxFontSizeMultiplier={1.5} style={{ fontWeight: '900', fontSize: 19, color: C.ink }}>
        {state.together ? 'Great teamwork!' : 'Gate unlocked!'}
      </Copy>
      <Copy maxFontSizeMultiplier={1.5} style={{ color: C.ink, fontSize: 15, textAlign: 'center' }}>
        {state.together
          ? `${names[state.maker === 0 ? 1 : 0]} solved ${names[state.maker]}’s rule in ${state.tests.length} ${state.tests.length === 1 ? 'test' : 'tests'}. Ready to swap roles?`
          : `Sorted all 5 rows after ${state.tests.length} ${state.tests.length === 1 ? 'test' : 'tests'}.`}
      </Copy>
      {!state.together && state.helped && (
        <Copy maxFontSizeMultiplier={1.5} style={{ color: C.ink, fontSize: 14, textAlign: 'center' }}>
          A helped finish counts too. Want to try a fresh gate yourself?
        </Copy>
      )}
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button compact maxFontSizeMultiplier={1.5} onPress={() => { setMood('idle'); setStatusLine('Build a shell row and tap Test at gate.'); commit(nextGate(latest.current)); }}>
          {state.index + 1 === state.puzzles.length ? 'Finish round' : state.together ? 'Swap roles · Next gate' : 'Next gate'}
        </Button>
        {!state.together && state.helped && (
          <Button quiet compact maxFontSizeMultiplier={1.5} onPress={() => { setMood('idle'); setNotice('Fresh gate ready!'); commit(dealFresh(latest.current, Math.random)); }}>
            Try a fresh one
          </Button>
        )}
      </View>
    </View>
  ) : undefined;

  return (
    <GateCrabBoard
      key={boardKey}
      puzzle={puzzle}
      evidence={evidence}
      testsCount={state.tests.length}
      builder={state.builder}
      quizRows={state.quizRows}
      quizChoices={state.quizChoices}
      phase={state.phase}
      won={state.won}
      active={active}
      width={width}
      title={title}
      readRows={state.readRows}
      mood={mood}
      statusLine={statusLine}
      notice={notice}
      counterexample={state.counterexample}
      canCheck={canCheckQuiz(state)}
      canUndo={state.undo.length > 0}
      canResetQuiz={state.quizChoices.some(c => c !== null)}
      cue={cue}
      coach={state.index === 0 && !state.tests.length && !state.together ? coach : undefined}
      together={state.together ? {
        names,
        maker: state.maker,
        stage: state.stage,
        options: makerRuleOptions(state.level),
        onOpenPicker: () => { setCue(null); commit(openRulePicker(latest.current)); },
        onPickRule: ruleId => { commit(pickSecretRule(latest.current, ruleId, Date.now() & 0xffff)); sound('tap'); },
        onSurprise: () => {
          const opts = makerRuleOptions(latest.current.level);
          const pick = opts[Math.floor(Math.random() * opts.length)];
          if (pick) commit(pickSecretRule(latest.current, pick.id, Date.now() & 0xffff));
          sound('tap');
        },
        onLockRule: () => { setCue(null); commit(lockSecretRule(latest.current)); say(GATE_SPEECH_KEYS.guesserCover); sound('tap'); },
        onStartGuessing: () => { setCue(null); setMood('idle'); setStatusLine('Build a shell row and tap Test at gate.'); commit(startGuessing(latest.current)); sound('tap'); },
      } : undefined}
      onSetBuilderSlot={(slot, shell) => { if (commit(setBuilderSlot(latest.current, slot, shell))) sound('tap'); }}
      onCycleBuilderSlot={slot => { if (commit(cycleBuilderSlot(latest.current, slot))) sound('tap'); }}
      onLoadRow={rowIdx => { if (commit(loadRowIntoBuilder(latest.current, rowIdx))) sound('tap'); }}
      onTest={onTest}
      onPhase={nextPhase => { if (commit(setPhase(latest.current, nextPhase))) sound('tap'); }}
      onQuizChoice={(slot, pass) => { if (commit(setQuizChoice(latest.current, slot, pass))) sound('tap'); }}
      onCheckQuiz={onCheck}
      onUndo={() => { if (commit(undoStep(latest.current))) sound('tap'); }}
      onResetQuiz={() => { if (commit(resetQuiz(latest.current))) sound('tap'); }}
      onToggleReadRows={() => {
        const next = toggleReadRows(latest.current);
        if (commit(next)) {
          sound('tap');
          say(next.readRows ? GATE_SPEECH_KEYS.readOn : GATE_SPEECH_KEYS.readOff);
        }
      }}
      finished={finished}
      help={
        <PuzzleHelp
          key={`${boardKey}:${state.together ? 't' : 's'}`}
          snapshot={snapshot}
          rules={rules}
          commit={helpCommit}
          onFresh={() => {
            setMood('idle');
            setNotice('Your turn on a fresh gate!');
            commit(dealFresh(latest.current, Math.random));
          }}
          kind="grid"
          failedRuns={state.misses}
          active={active && state.stage === 'play'}
          onCue={onCue}
        />
      }
    />
  );
}
