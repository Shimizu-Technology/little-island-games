import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { Button, C, Chip, Copy } from '../../../components/ui';
import type { HintCue } from '../../../puzzles/hints';
import { PuzzleHelp, type HintCommit, type HintSnapshot } from '../../../puzzles/ui/PuzzleHelp';
import type { BoardProps } from '../../types';
import { ScaleBoard, type HolderSecret } from './board';
import {
  answerHolderWeigh, canCheckAnswer, checkAnswer, dealFresh, exitRandomPractice, levelInfo, linksChoice, markHelped,
  nextBoard, openGuesserScreen, openHolderScreen, pickOddPearl, provenPar, puzzleAt, requestHolderWeigh,
  resetDraft, setOddDirection, setOrderSlot, setPartner, setShowLinks, startRandomPractice, swapRoles, undoDraft,
  weighSolo, type ScaleState,
} from './engine';
import { shellHelpRules, type PublicScaleView, type ScaleHelpAction } from './help';
import { itemName, publicContradiction, trueSortOrder, weighOnScale, type PuzzleKind, type ScaleOutcome } from './rules';

const historySig = (s: Pick<ScaleState, 'history'>) =>
  `${s.history.length}:${s.history.map(w => `${w.left}-${w.right}-${w.outcome}`).join(',')}`;

const keyOf = (s: ScaleState) =>
  `${s.practice ? 'p' : 'c'}:${s.index}:${s.puzzles[s.index]?.join('|') ?? ''}:${historySig(s)}:${s.order.join(',')}:${s.oddPick ?? -1}:${s.oddDir ?? ''}:${s.checks}:${s.helped ? 1 : 0}:${s.won ? 1 : 0}:${s.holder}:${s.phase}`;

const PRACTICE_CHOICES: readonly { label: string; kind: PuzzleKind; n: number }[] = [
  { label: '2 shells', kind: 'sort', n: 2 },
  { label: '3 shells', kind: 'sort', n: 3 },
  { label: '4 shells', kind: 'sort', n: 4 },
  { label: '5 shells', kind: 'sort', n: 5 },
  { label: '6 shells', kind: 'sort', n: 6 },
  { label: '9 pearls', kind: 'odd-heavy', n: 9 },
  { label: '12 pearls', kind: 'odd-either', n: 12 },
];

export function SchoolBoard({ session, update, practice, assistance, partners, cheer, coach, active, width, sound }: BoardProps<ScaleState>) {
  const state = session.state;
  const together = session.options.mode === 'together';
  const puzzle = useMemo(() => puzzleAt(state), [state.index, state.puzzles]); // eslint-disable-line react-hooks/exhaustive-deps -- index and tuples identify the board.
  const latest = useRef(state);
  useLayoutEffect(() => { latest.current = state; }, [state]);

  const [notice, setNotice] = useState('');
  const [cue, setCue] = useState<HintCue | null>(null);
  const [practiceOpen, setPracticeOpen] = useState(false);

  /**
   * CRITICAL Scale-Holder privacy lock:
   * Always starts locked (`null`) on mount (so force-close & resume NEVER leaks secrets!),
   * re-locks on OS app background/inactive via AppState, re-locks if `active` flips false,
   * and binds unlock strictly to the current (index, holder, history, pendingWeigh) token.
   */
  const holderKeyFor = (s: ScaleState) =>
    `${s.practice ? 'p' : 'c'}:${s.index}:${s.holder}:${historySig(s)}:${s.pendingWeigh ? `${s.pendingWeigh[0]}-${s.pendingWeigh[1]}` : 'none'}`;
  const [unlockedHolderKey, setUnlockedHolderKey] = useState<string | null>(null);
  const [prevActive, setPrevActive] = useState(active);
  if (prevActive !== active) {
    setPrevActive(active);
    if (!active && unlockedHolderKey !== null) setUnlockedHolderKey(null);
  }
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next !== 'active') setUnlockedHolderKey(null);
    });
    return () => sub.remove();
  }, []);
  const holderUnlocked = active && state.phase === 'holder' && unlockedHolderKey === holderKeyFor(state);

  const boardKey = `${state.index}:${state.puzzles[state.index]?.join('|') ?? ''}:${state.practice ? 'p' : 'c'}`;
  const commit = useCallback((next: ScaleState) => {
    if (next === latest.current) return false;
    latest.current = next;
    update(next);
    return true;
  }, [update]);

  const celebrateWin = useCallback((next: ScaleState) => {
    const p = puzzleAt(next);
    if (!p || !next.won) return;
    const overPar = next.history.length > provenPar(p);
    if (next.index === next.puzzles.length - 1 && !next.practice) {
      cheer('big', overPar ? 'scale-over-par' : 'scale-sorted');
    } else {
      sound('match');
    }
    if (!next.practice && !together && !next.helped && next.misses === 0) practice('think.scale-deduction', true);
  }, [cheer, practice, sound, together]);

  const handleWeigh = useCallback((left: number, right: number) => {
    const before = latest.current;
    if (together) {
      const next = requestHolderWeigh(before, left, right);
      if (!commit(next)) return false;
      setUnlockedHolderKey(null);
      setCue(null);
      setNotice('');
      sound('scale-pass-holder');
      return true;
    }
    const next = weighSolo(before, left, right);
    if (!commit(next)) return false;
    setNotice('');
    const outcome = next.history.at(-1)?.outcome;
    sound(outcome === '=' ? 'scale-balanced' : outcome === 'L' ? 'scale-tip-left' : 'scale-tip-right');
    return true;
  }, [commit, sound, together]);

  const handleCheck = useCallback(() => {
    const before = latest.current;
    const next = checkAnswer(before);
    if (!commit(next)) return;
    if (next.won) {
      setNotice('');
      celebrateWin(next);
    } else {
      sound('scale-not-yet');
      const p = puzzleAt(next);
      if (p && p.kind === 'sort') {
        const conflict = publicContradiction({ kind: p.kind, n: p.n, cast: p.cast, history: next.history }, next.order);
        if (conflict) {
          setNotice(`Check your weighings: ${itemName(p, conflict[0])} was lighter than ${itemName(p, conflict[1])}.`);
          return;
        }
      }
      setNotice('The scale disagrees. Try another weighing, then Check again.');
    }
  }, [celebrateWin, commit, sound]);

  // Strictly public view (ZERO hidden weights passed to board or Help!).
  const publicView: PublicScaleView | null = useMemo(
    () =>
      puzzle
        ? {
            kind: puzzle.kind,
            n: puzzle.n,
            cast: puzzle.cast,
            history: state.history,
            order: state.order,
            oddPick: state.oddPick,
            oddDir: state.oddDir,
            scaleHolder: together,
          }
        : null,
    [puzzle, state.history, state.order, state.oddPick, state.oddDir, together],
  );

  const rules = useMemo(() => (publicView ? shellHelpRules(publicView) : null), [publicView]);
  const snapshot = useMemo<HintSnapshot<PublicScaleView> | null>(
    () => (publicView ? { key: keyOf(state), view: publicView } : null),
    [publicView, state],
  );

  const helpCommit = useCallback(
    async (event: HintCommit<ScaleHelpAction>, expected: string): Promise<HintSnapshot<PublicScaleView> | null> => {
      const at = latest.current;
      const p = puzzleAt(at);
      if (!active || !p || keyOf(at) !== expected) return null;
      if (event.kind === 'help') {
        if (!at.practice && !together) assistance?.();
        commit(markHelped(at));
      } else if (event.kind === 'step') {
        const a = event.action;
        let next = at;
        if (a.kind === 'weigh') next = weighSolo(at, a.left, a.right);
        else if (a.kind === 'place-sort') next = setOrderSlot(at, a.item, a.slot);
        else next = pickOddPearl(at, a.pearl, a.dir);
        if (!commit(next)) return null;
        sound('tap');
      }
      const cur = latest.current;
      const curP = puzzleAt(cur);
      if (!curP) return null;
      return {
        key: keyOf(cur),
        view: {
          kind: curP.kind,
          n: curP.n,
          cast: curP.cast,
          history: cur.history,
          order: cur.order,
          oddPick: cur.oddPick,
          oddDir: cur.oddDir,
          scaleHolder: together,
        },
      };
    },
    [active, assistance, commit, sound, together],
  );

  const onCue = useCallback(
    (next: HintCue | null) => {
      setCue(next);
      if (next?.text.startsWith('Look')) sound('scale-hint-look');
      else if (next?.text.startsWith('Think')) sound('scale-hint-think');
    },
    [sound],
  );

  if (!puzzle || !publicView || !rules || !snapshot) return null;

  const par = provenPar(puzzle);
  const overPar = state.history.length > par;
  const names = session.names ?? ['Player 1', 'Player 2'];

  // Build secret object ONLY when Scale Holder has explicitly unlocked the Holder screen.
  const holderSecret: HolderSecret | null = (() => {
    if (!together || state.phase !== 'holder' || !holderUnlocked || !state.pendingWeigh) return null;
    const [pendingLeft, pendingRight] = state.pendingWeigh;
    const truth = weighOnScale(puzzle, pendingLeft, pendingRight);
    if (!truth) return null;
    const summary =
      puzzle.kind === 'sort'
        ? `Lightest to heaviest: ${trueSortOrder(puzzle).map(i => itemName(puzzle, i)).join(' < ')}`
        : puzzle.kind === 'odd-heavy'
          ? `Heavy pearl: Pearl ${puzzle.odd + 1} (all other pearls weigh the same)`
          : `Odd pearl: Pearl ${puzzle.odd + 1} is ${puzzle.dir === 'heavy' ? 'HEAVIER' : 'LIGHTER'} than the rest`;
    return { summary, pendingLeft, pendingRight, truth };
  })();

  const title = state.practice
    ? `Random practice · ${puzzle.kind === 'sort' ? `${puzzle.n} shells` : `${puzzle.n} pearls`}`
    : `${levelInfo[state.level - 1].name} · Scale ${state.index + 1} of ${state.puzzles.length}`;

  const availablePartners = partners ?? [];
  const chosenPartner = state.partner ? availablePartners.find(p => p.id === state.partner) ?? null : null;
  const finishLastBoard = state.index + 1 === state.puzzles.length;
  const returnToCertified = () => {
    const next = exitRandomPractice(latest.current);
    if (!commit(next)) return;
    setUnlockedHolderKey(null);
    setCue(null);
    setPracticeOpen(false);
    setNotice('Back to your certified scale!');
  };

  const finished = state.won ? (
    <View
      testID="scale-finished-card"
      accessibilityLiveRegion="polite"
      style={{ alignItems: 'center', gap: 10, alignSelf: 'stretch', backgroundColor: '#E2F2E4', borderRadius: 20, padding: 14 }}
    >
      <Copy maxFontSizeMultiplier={1.5} style={{ fontWeight: '900', fontSize: 20, color: C.ink }}>
        {together ? 'You weighed it out together!' : overPar ? 'Sorted!' : 'Every weight found!'}
      </Copy>
      <Copy maxFontSizeMultiplier={1.5} style={{ color: C.ink, fontSize: 15, textAlign: 'center' }}>
        {overPar
          ? `Done in ${state.history.length} weighings. The tide thinks it can be done in ${par} — want to try another?`
          : `Done in ${state.history.length} ${state.history.length === 1 ? 'weighing' : 'weighings'} (par ${par})!`}
      </Copy>
      {!together && state.helped && (
        <Copy maxFontSizeMultiplier={1.5} style={{ color: C.ink, fontSize: 14, textAlign: 'center' }}>
          A helped finish counts too. Want to try a fresh one yourself?
        </Copy>
      )}
      {!state.practice && together && finishLastBoard && !chosenPartner && availablePartners.length > 0 && (
        <Copy maxFontSizeMultiplier={1.5} style={{ color: C.ink, fontSize: 14, textAlign: 'center' }}>
          Who played together? One tap credits both people.
        </Copy>
      )}
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {state.practice ? (
          <>
            <Button
              compact
              maxFontSizeMultiplier={1.45}
              onPress={() => {
                commit(startRandomPractice(latest.current, puzzle.kind, puzzle.n, Math.random));
                setNotice('Fresh random weights!');
              }}
            >
              Another random puzzle
            </Button>
            {state.certified && (
              <Button quiet compact maxFontSizeMultiplier={1.4} onPress={returnToCertified}>
                Back to certified round
              </Button>
            )}
          </>
        ) : together && finishLastBoard ? (
          <>
            {chosenPartner ? (
              <>
                <Button
                  compact
                  maxFontSizeMultiplier={1.45}
                  onPress={() => commit(nextBoard(setPartner(latest.current, chosenPartner.id)))}
                >
                  {`Finish together with ${chosenPartner.name}`}
                </Button>
                {availablePartners
                  .filter(p => p.id !== chosenPartner.id)
                  .map(p => (
                    <Button
                      key={p.id}
                      quiet
                      compact
                      maxFontSizeMultiplier={1.4}
                      onPress={() => commit(nextBoard(setPartner(latest.current, p.id)))}
                    >
                      {`With ${p.name}`}
                    </Button>
                  ))}
              </>
            ) : availablePartners.length > 0 ? (
              <>
                {availablePartners.map(p => (
                  <Button
                    key={p.id}
                    compact
                    maxFontSizeMultiplier={1.45}
                    onPress={() => commit(nextBoard(setPartner(latest.current, p.id)))}
                  >
                    {`Finish together with ${p.name}`}
                  </Button>
                ))}
                <Button
                  quiet
                  compact
                  maxFontSizeMultiplier={1.4}
                  onPress={() => commit(nextBoard(setPartner(latest.current, null)))}
                >
                  Finish without partner
                </Button>
              </>
            ) : (
              <Button
                compact
                maxFontSizeMultiplier={1.45}
                onPress={() => commit(nextBoard(setPartner(latest.current, null)))}
              >
                Finish together
              </Button>
            )}
            <Button
              quiet
              compact
              maxFontSizeMultiplier={1.4}
              onPress={() => {
                commit(dealFresh(latest.current, Math.random));
                setNotice('Fresh weights ready!');
              }}
            >
              Try another
            </Button>
          </>
        ) : (
          <>
            <Button compact maxFontSizeMultiplier={1.45} onPress={() => commit(nextBoard(latest.current))}>
              {finishLastBoard ? 'Finish' : 'Next scale'}
            </Button>
            <Button
              quiet
              compact
              maxFontSizeMultiplier={1.4}
              onPress={() => {
                commit(dealFresh(latest.current, Math.random));
                setNotice('Fresh weights ready!');
              }}
            >
              Try another
            </Button>
          </>
        )}
      </View>
    </View>
  ) : undefined;

  const practiceControls = (
    <View testID="scale-practice-bar" style={{ gap: 8, alignSelf: 'stretch', paddingTop: 4 }}>
      {state.practice && state.certified && (
        <Button
          compact
          maxFontSizeMultiplier={1.35}
          disabled={!active}
          onPress={returnToCertified}
        >
          Back to certified round
        </Button>
      )}
      <Button
        quiet
        compact
        maxFontSizeMultiplier={1.35}
        disabled={!active}
        onPress={() => setPracticeOpen(v => !v)}
      >
        {practiceOpen ? 'Close random practice' : 'Random practice (any size)'}
      </Button>
      {practiceOpen && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
          {PRACTICE_CHOICES.map(ch => (
            <Chip
              key={ch.label}
              maxFontSizeMultiplier={1.3}
              selected={state.practice && puzzle.kind === ch.kind && puzzle.n === ch.n}
              onPress={() => {
                commit(startRandomPractice(latest.current, ch.kind, ch.n, Math.random));
                setUnlockedHolderKey(null);
                setCue(null);
                setNotice(`Random practice: ${ch.label}`);
                setPracticeOpen(false);
              }}
            >
              {ch.label}
            </Chip>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <ScaleBoard
      key={boardKey}
      board={publicView}
      order={state.order}
      oddPick={state.oddPick}
      oddDir={state.oddDir}
      showLinks={state.showLinks}
      won={state.won}
      missed={state.checked}
      canCheck={canCheckAnswer(state)}
      active={active}
      width={width}
      title={title}
      notice={notice}
      cue={cue}
      finished={finished}
      practiceControls={practiceControls}
      coach={state.index === 0 && state.history.length === 0 ? coach : undefined}
      onWeigh={handleWeigh}
      onPlaceSort={(item, slot) => {
        const ok = commit(setOrderSlot(latest.current, item, slot));
        if (ok) { sound('tap'); setNotice(''); }
        return ok;
      }}
      onPickOdd={(pearl, dir) => {
        const ok = commit(pickOddPearl(latest.current, pearl, dir));
        if (ok) { sound('tap'); setNotice(''); }
        return ok;
      }}
      onSetOddDir={dir => {
        if (commit(setOddDirection(latest.current, dir))) { sound('tap'); setNotice(''); }
      }}
      onCheck={handleCheck}
      onUndo={() => { if (commit(undoDraft(latest.current))) sound('tap'); }}
      onReset={() => { if (commit(resetDraft(latest.current))) sound('tap'); }}
      canUndo={state.undo.length > 0}
      canReset={puzzle.kind === 'sort' ? state.order.some(x => x >= 0) : state.oddPick !== null || state.oddDir !== null}
      onToggleLinks={linksChoice(state.level) ? on => commit(setShowLinks(latest.current, on)) : undefined}
      scaleHolder={
        together
          ? {
              names,
              holder: state.holder,
              phase: state.phase,
              unlocked: holderUnlocked,
              secret: holderSecret,
              onUnlockHolder: () => {
                setCue(null);
                const next = latest.current.phase === 'cover-to-holder' ? openHolderScreen(latest.current) : latest.current;
                commit(next);
                setUnlockedHolderKey(holderKeyFor(next));
              },
              onHolderAnswer: (outcome: ScaleOutcome) => {
                const ok = commit(answerHolderWeigh(latest.current, outcome));
                if (ok) {
                  setUnlockedHolderKey(null);
                  sound('scale-pass-guesser');
                }
                return ok;
              },
              onRevealGuesser: () => {
                setUnlockedHolderKey(null);
                setCue(null);
                if (commit(openGuesserScreen(latest.current))) {
                  const last = latest.current.history.at(-1)?.outcome;
                  sound(last === '=' ? 'scale-balanced' : last === 'L' ? 'scale-tip-left' : 'scale-tip-right');
                }
              },
              onSwapRoles: () => {
                setUnlockedHolderKey(null);
                setCue(null);
                if (commit(swapRoles(latest.current, Math.random))) {
                  sound('tap');
                  setNotice('Roles swapped!');
                }
              },
              swapNeedsFresh: state.holderPeeked || state.history.length > 0,
            }
          : undefined
      }
      help={
        <PuzzleHelp
          key={`${boardKey}:${historySig(state)}:${together ? `${state.holder}:${state.phase}` : 'solo'}`}
          snapshot={snapshot}
          rules={rules}
          commit={helpCommit}
          onFresh={() => {
            commit(dealFresh(latest.current, Math.random));
            setNotice('Fresh shells ready!');
          }}
          kind="grid"
          failedRuns={state.misses}
          active={active && state.phase === 'guesser'}
          onCue={onCue}
        />
      }
    />
  );
}
