import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { Button, Copy, Heading } from '../components/ui';
import { SaveStatus } from '../components/SaveStatus';
import { useStore } from '../state/Store';
import { progressFor, selectedOwner } from '../state/challengeDrafts';
import type { ChallengeSession } from '../state/challenge';
import type { ChallengeCard, ChallengeEntry } from '../challenge/types';
import { useSoundControls } from '../components/Audio';
import { GridFeedback } from '../puzzles/grid/preferences';
import { SessionGate } from '../challenge/SessionGate';
import { infoFor, sameRef } from './catalog';
import { presentationFor } from './presentation';

/** All progress and autosave go through the existing owner/epoch-guarded Store. */
export function CoveRound({ entry, card, partner, width, replace = false, onBrowse, onClose, remix }: { remix?: string; entry: ChallengeEntry; card: ChallengeCard; partner: string | null; width: number; replace?: boolean; onBrowse: () => void; onClose: () => void }) {
  const store = useStore(), owner = selectedOwner(store.save), focused = useIsFocused();
  const sound = useSoundControls(store.save.settings.sound && focused);
  const progress = progressFor(store.save, owner), saved = progress?.paused.find(s => s.game === entry.game && !s.credited && !s.result);
  const [finished, setFinished] = useState<ChallengeSession>(), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [role, setRole] = useState(true), [replacement, setReplacement] = useState<ChallengeSession>();
  const current = useRef<ChallengeSession | undefined>(saved), lock = useRef(false), mounted = useRef(true), auto = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const expected = (session?: ChallengeSession) => ({ owner, epoch: store.epoch, game: entry.game, id: session?.id ?? null, revision: session?.revision ?? null });
  const full = !saved && (progress?.paused.filter(s => !s.credited).length ?? 0) >= (owner.startsWith('cove-') ? 4 : 8);
  async function launch() {
    if (lock.current || !progress || saved && !replace) return;
    lock.current = true; setBusy(true); setMessage('');
    try {
      let next = { ...entry.start(card.ref, owner, `cove-${owner}-${progress.nextOrdinal}`, progress, { supportOff: false, ownRead: false }, []), partner };
      if (remix) { const recipe = presentationFor(entry).remixes?.find(r => r.id === remix); if (!recipe) throw new Error('Unknown remix.'); const remixed = recipe.start(next); if (!sameRef(remixed.puzzle, next.puzzle)) throw new Error('A remix keeps the same puzzle ref.'); next = remixed; }
      const replacing = replace ? saved : replacement;
      if (await store.challengeSave(next, { ...expected(saved), ...(replacing ? { replace: { game: replacing.game, id: replacing.id, revision: replacing.revision } } : {}) })) {
        current.current = next;
      } else if (mounted.current) setMessage('This puzzle could not start. Your saved work is kept. Continue a saved puzzle or export a backup in Settings.');
    } catch { if (mounted.current) setMessage('This puzzle could not open. Your saved work is kept. Try again.'); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  // One launch per mounted owner/epoch/ref. Parent keys this component at every identity boundary.
  useEffect(() => {
    if (!auto.current && !saved && !full) { auto.current = true; void launch(); }
  });
  async function dispatch(action: unknown) {
    const before = current.current;
    if (!focused || !before || lock.current || before.result) return;
    lock.current = true; setMessage('');
    try {
      const next = entry.move(before, action);
      if (!next) { setMessage('That change could not be saved. Your accepted draft is kept.'); return; }
      if (next.result) setBusy(true);
      if (await store.challengeSave(next, expected(before))) {
        current.current = next;
        if (next.result && mounted.current) setFinished(next);
      } else if (mounted.current) setMessage('Keep the app open. Retry saving or export your accepted work in Settings.');
    } catch { if (mounted.current) setMessage('This change could not be made. Your accepted draft is kept. Try again.'); } finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  // Store may publish an accepted draft even if its disk write later fails.
  useEffect(() => { if (saved && (!current.current || saved.id !== current.current.id || saved.revision > current.current.revision)) current.current = saved; }, [saved]);
  const round = saved ?? finished, actual = round ? entry.puzzles.find(p => sameRef(p.ref, round.puzzle)) : card;
  const changeAttempt = !!saved && replace && !sameRef(saved.puzzle, card.ref);
  return <View style={{ gap: 14 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Button quiet compact onPress={onClose}>← Cove</Button><Heading style={{ flexShrink: 1 }}>{infoFor(entry.game).name}</Heading></View><SaveStatus/>
    {!!message && <Copy accessibilityLiveRegion="polite">{message}</Copy>}
    {changeAttempt ? <><Copy>Your unfinished puzzle is kept until this new attempt saves. Its notes and undo will then be replaced. Finished history stays kept.</Copy><Button disabled={busy} onPress={() => void launch()}>Replace paused puzzle</Button><Button quiet onPress={onClose}>Keep paused puzzle</Button></> : round ? <>
      <Copy>{actual?.title}</Copy>
      {round.partner && role && infoFor(entry.game).role && <View style={{ gap: 8 }}><Copy>{infoFor(entry.game).role}</Copy><Button quiet compact onPress={() => setRole(false)}>Put role card away</Button></View>}
      {round.result ? <><Heading style={{ fontSize: 24 }}>{round.result.event === 'together' ? 'Solved together' : 'Puzzle solved'}</Heading><Copy>Your finished puzzle is kept. Take your time choosing what comes next.</Copy><Button onPress={onBrowse}>Replay or choose another puzzle</Button></> : <SessionGate key={`${owner}:${store.epoch}:${round.id}`} open={store.challengeOpen} expected={expected(round)} render={() => <>
        <GridFeedback.Provider value={() => { sound.play('tap'); }}>{entry.render(round, a => void dispatch(a), focused && !busy, width)}</GridFeedback.Provider>
        <Button quiet disabled={busy} onPress={() => void dispatch(entry.controls.help())}>Help · show me how</Button><Copy>Helping a child? Ask what they notice, then let them choose the next step.</Copy>
      </>}/>}
    </> : full ? <><Heading style={{ fontSize: 22 }}>Your paused spaces are full</Heading><Copy>Continue one, or choose one to replace. Existing work stays kept until a new puzzle saves.</Copy>{progress?.paused.filter(s => !s.credited).map(s => <Button key={s.id} quiet selected={replacement?.id === s.id} onPress={() => setReplacement(s)}>Replace paused {infoFor(s.game).name}</Button>)}{replacement && <Button disabled={busy} onPress={() => void launch()}>Start this puzzle instead</Button>}</> : <><Copy>{busy ? 'Opening your puzzle…' : 'Your saved work is kept.'}</Copy>{!busy && <Button onPress={() => void launch()}>Try opening again</Button>}</>}
    {!changeAttempt && !round?.result && <Button quiet onPress={onBrowse}>Bands, packs and all puzzles</Button>}
  </View>;
}
