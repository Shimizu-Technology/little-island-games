import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, Copy, Heading } from '../../components/ui';
import { hintLabels, hintOffered, hintSteps, requestHint, type HintCue, type PublicHintRules } from '../hints';

export type HintSnapshot<V> = { key: string; view: V };
export type HintCommit<A> = { kind: 'help' | 'finish' } | { kind: 'step'; action: A; last: boolean };
/**
 * key includes owner, epoch, puzzle and accepted revision. commit must compare it and durably record
 * help before revealing a cue or applying a move; last finishes a Show me through the normal engine.
 */
export function PuzzleHelp<V, A>({ snapshot, rules, commit, onFresh, kind, failedRuns, active = true, onCue }: {
  snapshot: HintSnapshot<V>; rules: PublicHintRules<V, A>;
  commit: (event: HintCommit<A>, expected: string) => Promise<HintSnapshot<V> | null>;
  onFresh: () => void; onCue?: (cue: HintCue | null) => void; kind: 'grid' | 'build-run'; failedRuns: number; active?: boolean;
}) {
  const [open, setOpen] = useState(false), [stage, setStage] = useState(0), [cue, setCue] = useState<HintCue | null>(null);
  const [route, setRoute] = useState<readonly A[] | null>(null), [done, setDone] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [unavailable, setUnavailable] = useState(false);
  const live = useRef({ snapshot, active, rules, commit, onCue }), controller = useRef<AbortController | null>(null), lock = useRef(false), expectedRoute = useRef('');
  useLayoutEffect(() => { live.current = { snapshot, active, rules, commit, onCue }; }, [snapshot, active, rules, commit, onCue]);
  useEffect(() => { live.current.onCue?.(open ? cue : null); }, [cue, open]);
  useEffect(() => () => { live.current.active = false; live.current.onCue?.(null); controller.current?.abort(); }, []);
  useEffect(() => {
    controller.current?.abort();
    if (!active || snapshot.key !== expectedRoute.current) { setCue(null); setRoute(null); setDone(false); setUnavailable(false); setStage(0); setMessage(''); }
  }, [snapshot.key, active]);
  const current = (key: string) => live.current.active && live.current.snapshot.key === key;
  async function ask() {
    if (lock.current || !active) return;
    const start = snapshot, step = hintSteps[stage];
    lock.current = true; setBusy(true); setMessage('');
    const abort = new AbortController(); controller.current = abort;
    try {
      const result = await requestHint(rules, start.view, step, abort.signal);
      if (!current(start.key) || abort.signal.aborted || result.status === 'cancelled') return;
      if (result.status === 'unavailable') {
        setCue(null); setStage(3);
        if (step === 'show-me') { setUnavailable(true); setMessage('Your entries are kept. Try a fresh puzzle with the same idea.'); }
        else setMessage('Your entries are kept. Choose Show me or try another puzzle.');
        return;
      }
      const accepted = await commit({ kind: 'help' }, start.key);
      if (!accepted || !live.current.active) { setMessage('Your draft is kept. Try help again, or choose another puzzle.'); return; }
      // A host returns its accepted revision; a switch/restore cannot authorize this request.
      if (live.current.snapshot.key !== start.key && live.current.snapshot.key !== accepted.key) return;
      expectedRoute.current = accepted.key;
      if (result.status === 'cue') setCue(result.cue);
      else if (step === 'one-step') {
        const action = result.actions[0];
        if (result.actions.length) {
          const moved = await live.current.commit({ kind: 'step', action, last: result.last }, accepted.key);
          if (!moved || !live.current.active || live.current.snapshot.key !== start.key && live.current.snapshot.key !== accepted.key && live.current.snapshot.key !== moved.key) { setMessage('Your draft changed. Ask for a fresh hint.'); return; }
          expectedRoute.current = moved.key;
        }
        setCue({ text: result.actions.length ? result.last ? 'One step completes the demonstration.' : 'One step. Your turn to keep going.' : 'Every box is filled. Check when you are ready, or choose Show me.', focus: [] });
      } else {
        if (!result.actions.length) {
          const finished = await live.current.commit({ kind: 'finish' }, accepted.key);
          if (!finished || !live.current.active || live.current.snapshot.key !== start.key && live.current.snapshot.key !== accepted.key && live.current.snapshot.key !== finished.key) return;
          expectedRoute.current = finished.key;
        }
        setCue(null); setRoute(result.actions); setDone(result.actions.length === 0);
      }
      setStage(Math.min(stage + 1, hintSteps.length - 1));
    } catch { if (live.current.active) setMessage('Help could not finish. Your draft is kept. Try again or choose another puzzle.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function next() {
    if (lock.current || !active || !route?.length) return;
    if (!current(expectedRoute.current)) { setRoute(null); setMessage('Your draft changed. Ask for a fresh hint.'); return; }
    lock.current = true; setBusy(true);
    try {
      const accepted = await commit({ kind: 'step', action: route[0], last: route.length === 1 }, expectedRoute.current);
      if (!accepted || !live.current.active || live.current.snapshot.key !== expectedRoute.current && live.current.snapshot.key !== accepted.key) { setRoute(null); setMessage('Your draft changed. Ask for a fresh hint.'); return; }
      expectedRoute.current = accepted.key;
      setRoute(route.slice(1)); setDone(route.length === 1);
    } catch { setRoute(null); setMessage('Your draft is kept. Ask for a fresh hint.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <View style={{ gap: 10 }} testID="puzzle-help">
    <Button quiet disabled={!active || busy} onPress={() => setOpen(!open)}>{open ? 'Close help' : 'Help'}</Button>
    {!open && hintOffered(kind, failedRuns) && <Copy>{kind === 'grid' ? 'Look, Think, One step, or Show me. Help is here.' : 'Want a hint? Help is here whenever you want it.'}</Copy>}
    {open && <>
      <Heading style={{ fontSize: 21 }}>A little help</Heading><Copy>A helped finish counts too.</Copy>
      {cue && <Copy accessibilityLiveRegion="polite">{cue.text}</Copy>}
      {unavailable ? <Button quiet disabled={!active || busy} onPress={onFresh}>Try another</Button> : route?.length ? <><Copy>One move at a time. Tap when you are ready.</Copy><Button quiet disabled={!active || busy} onPress={() => void next()}>Next step</Button></> : done ? <>
        <Copy>The puzzle is shown. Try a fresh one with the same idea.</Copy><Button quiet disabled={!active || busy} onPress={() => { if (current(expectedRoute.current)) onFresh(); }}>Try another</Button>
      </> : <Button quiet disabled={!active || busy} onPress={() => void ask()}>{busy ? 'Finding a hint…' : hintLabels[hintSteps[stage]]}</Button>}
    </>}
    {!!message && !unavailable && <Button quiet disabled={!active || busy} onPress={onFresh}>Try another puzzle</Button>}
    {!!message && <Copy accessibilityLiveRegion="polite">{message}</Copy>}
  </View>;
}
