import React, { useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AudioPreferences, useSoundControls } from '../../../components/Audio';
import type { ChallengeViewProps } from '../../../challenge/types';
import type { HintCue } from '../../../puzzles/hints';
import { PuzzleHelp, type HintCommit, type HintSnapshot } from '../../../puzzles/ui/PuzzleHelp';
import type { GateMood } from './art';
import { GateCrabBoard } from './board';
import {
  CHECK, encodeHintQuiz, encodeHintTest, encodeQuiz, gateCrabStep, HELP,
  ordinaryAllowed, ordinaryFull, RESET, UNDO, type Action, type State,
} from './challenge';
import { gateCrabHelpRules, type GateHelpAction, type GateView } from './help';
import { codesToRow, evaluateRow, rowCodes, RULE_BY_ID, type ShellCode } from './rules';

type Accepted = { key: string; state: State };
const QUEUE = 2;

const defaultBuilder = (len: 2 | 3): ShellCode[] => (len === 2 ? [0, 4] : [0, 4, 2]);

export function ChallengeBoard({ state, dispatch, active, width, sessionKey, commit, onFresh, header, footer }: ChallengeViewProps<State, Action>) {
  const prefs = useContext(AudioPreferences);
  const { play } = useSoundControls(prefs.sound ?? true);

  const live = useRef({ state, key: sessionKey, active });
  const lane = useRef<Promise<unknown>>(Promise.resolve());
  const epoch = useRef(0);
  const waiting = useRef(0);
  const sending = useRef(false);
  const predicted = useRef<{ epoch: number; state: State } | null>(null);

  const [builder, setBuilder] = useState<ShellCode[]>(() => defaultBuilder(state.puzzle.len));
  const [phase, setPhase] = useState<'test' | 'quiz'>('test');
  const [readRows, setReadRows] = useState(false);
  const [mood, setMood] = useState<GateMood>('idle');
  const [statusLine, setStatusLine] = useState('Build a shell row and tap Test at gate.');
  const [cue, setCue] = useState<HintCue | null>(null);

  // Reset local builder/phase if the puzzle changes.
  const puzzleKey = `${state.puzzle.ruleId}:${state.puzzle.starters.join(',')}`;
  const [syncedKey, setSyncedKey] = useState(puzzleKey);
  if (syncedKey !== puzzleKey) {
    setSyncedKey(puzzleKey);
    setBuilder(defaultBuilder(state.puzzle.len));
    setPhase('test');
    setMood('idle');
    setStatusLine('Build a shell row and tap Test at gate.');
    setCue(null);
  }

  useLayoutEffect(() => {
    if (!active || (live.current.key !== sessionKey && !sending.current)) epoch.current++;
    live.current = { state, key: sessionKey, active };
  }, [state, sessionKey, active]);

  const submit = useCallback((action: Action, expected?: string): Promise<Accepted | null> => {
    const mine = epoch.current;
    const run = async (): Promise<Accepted | null> => {
      const at = live.current;
      if (mine !== epoch.current || !at.active || !commit || at.key === undefined || (expected !== undefined && expected !== at.key)) return null;
      if (!gateCrabStep(at.state, action) || !ordinaryAllowed(at.state, action)) return null;
      sending.current = true;
      let accepted: Accepted | null;
      try { accepted = await commit(action, at.key); } finally { sending.current = false; }
      if (!accepted) { epoch.current++; return null; }
      if (live.current.key === at.key || live.current.key === accepted.key) {
        live.current = { ...live.current, state: accepted.state, key: accepted.key };
      } else {
        epoch.current++;
        return null;
      }
      return accepted;
    };
    const next = lane.current.then(run, run);
    lane.current = next.catch(() => null);
    return next;
  }, [commit]);

  const enqueue = useCallback((action: Action): boolean => {
    if (!active) return false;
    if (!commit) {
      if (!gateCrabStep(state, action) || !ordinaryAllowed(state, action)) return false;
      dispatch(action);
      return true;
    }
    const base = waiting.current && predicted.current?.epoch === epoch.current ? predicted.current.state : live.current.state;
    const after = gateCrabStep(base, action);
    if (!after || !ordinaryAllowed(base, action) || waiting.current > QUEUE) return false;
    predicted.current = { epoch: epoch.current, state: after };
    waiting.current++;
    void submit(action).then(accepted => {
      if (!accepted) return;
      if (action === CHECK) {
        if (accepted.state.won) {
          setMood('pass');
          setStatusLine('All five right! You discovered the secret rule!');
          play('win');
        } else {
          setMood('block');
          setPhase('test');
          setStatusLine('Not quite yet — your missed row became a new clue!');
          play('tap');
        }
      } else if (action < 216) {
        const ev = accepted.state.evidence.find(e => e.row === action);
        if (ev) {
          setMood(ev.pass ? 'pass' : 'block');
          setStatusLine(ev.pass ? 'The gate opens! That row PASSES.' : 'The gate stays shut. That row BLOCKS.');
          play(ev.pass ? 'match' : 'tap');
        }
      } else {
        play('tap');
      }
    }).catch(() => null).finally(() => { waiting.current--; });
    return true;
  }, [active, commit, dispatch, play, state, submit]);

  const full = ordinaryFull(state);
  const rules = useMemo(() => {
    const rule = RULE_BY_ID.get(state.puzzle.ruleId)!;
    return gateCrabHelpRules(row => evaluateRow(rule, state.puzzle.len, row), true);
  }, [state.puzzle]);

  const toView = (s: State): GateView => ({
    len: s.puzzle.len,
    rung: s.puzzle.rung,
    evidence: s.evidence,
    quizRows: s.quizRows,
    quizChoices: s.quizChoices,
  });

  const snapshot = useMemo<HintSnapshot<GateView>>(() => ({
    key: sessionKey ?? `standalone:${state.actions}`,
    view: toView(state),
  }), [sessionKey, state]);

  const helpCommit = useCallback(async (event: HintCommit<GateHelpAction>, expected: string): Promise<HintSnapshot<GateView> | null> => {
    if (event.kind === 'finish') {
      return live.current.key === expected ? { key: expected, view: toView(live.current.state) } : null;
    }
    let action: Action;
    if (event.kind === 'help') {
      action = HELP;
    } else if (event.kind === 'step') {
      action = event.action.kind === 'test'
        ? encodeHintTest(event.action.row)
        : encodeHintQuiz(event.action.slot, event.action.pass);
    } else {
      return null;
    }
    const accepted = await submit(action, expected);
    if (!accepted) return null;
    if (event.kind === 'step') {
      if (event.action.kind === 'test') {
        const testRow = event.action.row;
        const ev = accepted.state.evidence.find(e => e.row === testRow);
        if (ev) {
          setMood(ev.pass ? 'pass' : 'block');
          setStatusLine(ev.pass ? 'Hint test: PASS! The gate opens.' : 'Hint test: BLOCK! The gate stays shut.');
        }
      } else {
        setPhase('quiz');
      }
    }
    return { key: accepted.key, view: toView(accepted.state) };
  }, [submit]);

  const onTest = () => {
    const row = codesToRow(builder);
    const existing = state.evidence.find(e => e.row === row);
    if (existing) {
      setMood(existing.pass ? 'pass' : 'block');
      setStatusLine(existing.pass ? 'Already tested — that row PASSES!' : 'Already tested — that row BLOCKS!');
      play('tap');
      return;
    }
    enqueue(row);
  };

  return (
    <GateCrabBoard
      key={puzzleKey}
      puzzle={state.puzzle}
      evidence={state.evidence}
      testsCount={state.tests.length}
      builder={builder}
      quizRows={state.quizRows}
      quizChoices={state.quizChoices}
      phase={phase}
      won={state.won}
      active={active}
      width={width}
      title="Gate Crab"
      readRows={readRows}
      mood={mood}
      statusLine={statusLine}
      notice={full ? 'That is a lot of testing! Help can still finish this gate, or choose another puzzle.' : undefined}
      counterexample={state.counterexample}
      canCheck={!state.won && state.quizChoices.every(c => c !== null)}
      canUndo={state.stack.length > 0 && !full}
      canResetQuiz={state.quizChoices.some(c => c !== null) && !full}
      testDisabled={full}
      quizEditDisabled={full}
      cue={cue}
      onSetBuilderSlot={(slot, shell) => { setBuilder(b => b.map((v, i) => (i === slot ? shell : v))); play('tap'); }}
      onCycleBuilderSlot={slot => { setBuilder(b => b.map((v, i) => (i === slot ? (((v + 1) % 6) as ShellCode) : v))); play('tap'); }}
      onLoadRow={rowIdx => { setBuilder(rowCodes(state.puzzle.len, rowIdx)); play('tap'); }}
      onTest={onTest}
      onPhase={nextPhase => { setPhase(nextPhase); play('tap'); }}
      onQuizChoice={(slot, pass) => { enqueue(encodeQuiz(slot, pass)); }}
      onCheckQuiz={() => { enqueue(CHECK); }}
      onUndo={() => { enqueue(UNDO); }}
      onResetQuiz={() => { enqueue(RESET); }}
      onToggleReadRows={() => { setReadRows(v => !v); play('tap'); }}
      header={header}
      footer={footer}
      help={
        <PuzzleHelp
          snapshot={snapshot}
          rules={rules}
          commit={helpCommit}
          onFresh={() => onFresh?.()}
          kind="grid"
          failedRuns={state.misses}
          active={active && !!commit}
          onCue={setCue}
        />
      }
    />
  );
}
