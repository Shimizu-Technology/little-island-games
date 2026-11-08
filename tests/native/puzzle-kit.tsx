/** Isolated native acceptance fixture. This entry is never registered on a family shelf. */
import React, { useLayoutEffect, useRef, useState } from 'react';
import { registerRootComponent } from 'expo';
import { ScrollView, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Button, Copy, Heading, C } from '../../src/components/ui';
import { answerCheck, answerEdit, answerHelp, answerStart, canCheckAnswer, type AnswerRules } from '../../src/puzzles/wholeAnswer';
import { PuzzleHelp, type HintCommit } from '../../src/puzzles/ui/PuzzleHelp';
import { PickYourTide, PuzzleEnding, PuzzleFeedback } from '../../src/puzzles/ui/PuzzleEnding';
import { WholeAnswerControls } from '../../src/puzzles/ui/WholeAnswerControls';
import type { HintCue, PublicHintRules } from '../../src/puzzles/hints';
import { finishOriginalPuzzle, originalRoundDone, type OriginalRound } from '../../src/puzzles/flow';
type Draft = readonly number[];
const firstTarget = 5;
const rules: AnswerRules<number, Draft, Draft> = {
  initial: () => [0, 0], valid: d => d.length === 2 && d.every(n => Number.isInteger(n) && n >= 0 && n <= 4),
  edit: (_, a) => a, complete: d => d.every(Boolean), accepts: (d, t) => d[0] + d[1] === t,
};
const makeHints = (target: number): PublicHintRules<Draft, Draft> => ({
  look: () => ({ text: 'Look at the two number boxes.', focus: ['left', 'right'] }),
  think: () => ({ text: `Find two numbers that add to ${target}.`, focus: [] }),
  preserves: (before, after) => before.every((n, i) => !n || n === after[i]),
  problem: start => ({ start, key: s => s.join(), nodeBudget: 100,
    moves: s => [0, 1].flatMap(i => s[i] ? [] : [1, 2, 3, 4].map(n => s.map((v, j) => i === j ? n : v))),
    apply: (_, a) => a, goal: s => rules.complete(s, target) && rules.accepts(s, target) }),
});
function Fixture() {
  const [picking, setPicking] = useState(true), [answer, setAnswer] = useState(() => answerStart(rules, firstTarget));
  const [round, setRound] = useState<OriginalRound>({ finished: [] }), [puzzle, setPuzzle] = useState(0), [revision, setRevision] = useState(0), [cue, setCue] = useState<HintCue | null>(null);
  const target = [5, 6, 7, 4][puzzle % 4], hints = makeHints(target);
  const current = useRef({ answer, revision, puzzle }); useLayoutEffect(() => { current.current = { answer, revision, puzzle }; }, [answer, revision, puzzle]);
  const key = (p: number, r: number) => `fixture:0:${p}:${r}`;
  function next() { setAnswer(answerStart(rules, target)); setPuzzle(n => n + 1); setRevision(0); setCue(null); }
  function check() { const next = answerCheck(rules, target, answer); setAnswer(next); if (next.solved) setRound(r => finishOriginalPuzzle(r, String(puzzle))); }
  async function commit(event: HintCommit<Draft>, expected: string) {
    const s = current.current;
    if (expected !== key(s.puzzle, s.revision)) return null;
    let accepted = answerHelp(s.answer);
    if (event.kind === 'finish') accepted = answerCheck(rules, target, accepted);
    if (event.kind === 'step') { accepted = answerEdit(rules, target, accepted, event.action); if (rules.complete(accepted.draft, target)) accepted = answerCheck(rules, target, accepted); }
    const r = s.revision + 1; current.current = { answer: accepted, revision: r, puzzle: s.puzzle }; setAnswer(accepted); setRevision(r);
    if (accepted.solved) setRound(round => finishOriginalPuzzle(round, String(s.puzzle)));
    return { key: key(s.puzzle, r), view: accepted.draft };
  }
  return <SafeAreaProvider><SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}><ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
    <Heading>Puzzle kit</Heading><Copy>Native fixture · shared controls</Copy>
    {picking ? <PickYourTide samples={[
      { id: 'a', label: 'Shallow', sample: <Copy>1 + □ = 5</Copy> },
      { id: 'b', label: 'Middle', sample: <Copy>□ + □ = 5</Copy> },
      { id: 'c', label: 'Deep', sample: <Copy>Find another way to make 5</Copy> },
    ]} onChoose={() => setPicking(false)} /> : answer.solved ? <>
      <Copy>{answer.helped || answer.misses ? 'Helped finish kept' : 'Independent finish kept'}</Copy>
      <PuzzleEnding praise={`You found two numbers that make ${target}.`} roundDone={originalRoundDone(round)} onChoose={next} onAnother={next} onRest={() => { setPicking(true); setRound({ finished: [] }); next(); }} />
    </> : <>
      <Heading style={{ fontSize: 24 }}>Make {target}</Heading>
      <View style={{ flexDirection: 'row', gap: 16 }}><Copy style={{ fontSize: 32, backgroundColor: cue?.focus.includes('left') ? C.gold : C.sand }}>{answer.draft[0] || '□'}</Copy><Copy style={{ fontSize: 32 }}>+</Copy><Copy style={{ fontSize: 32, backgroundColor: cue?.focus.includes('right') ? C.gold : C.sand }}>{answer.draft[1] || '□'}</Copy><Copy style={{ fontSize: 32 }}>= {target}</Copy></View>
      {[0, 1].map(cell => <View key={cell} style={{ gap: 8 }}><Copy>{cell === 0 ? 'Left box' : 'Right box'}</Copy><View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{[1, 2, 3, 4].map(n => <Button key={n} quiet compact selected={answer.draft[cell] === n} label={`${cell === 0 ? 'Left' : 'Right'} ${n}`} onPress={() => { setAnswer(answerEdit(rules, target, answer, answer.draft.map((v, i) => i === cell ? n : v))); setRevision(n => n + 1); }}>{n}</Button>)}</View></View>)}
      <PuzzleFeedback failure={answer.last?.correct === false ? { character: 'Crab', line: 'Oops, I need a different pair!', focus: [] } : null} />
      <WholeAnswerControls canCheck={canCheckAnswer(rules, target, answer)} missed={answer.last?.correct === false} needsVariant={false} onCheck={check} onVariant={next} />
      <PuzzleHelp key={puzzle} snapshot={{ key: key(puzzle, revision), view: answer.draft }} rules={hints} commit={commit} onFresh={next} kind="grid" failedRuns={answer.misses} onCue={setCue} />
      <Button quiet onPress={next}>Try another</Button><Copy>Checks: {answer.checks} · Finished: {round.finished.length}/4</Copy>
    </>}
  </ScrollView></SafeAreaView></SafeAreaProvider>;
}
registerRootComponent(Fixture);
