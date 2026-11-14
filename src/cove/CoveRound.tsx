import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
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
import { solvingPeople } from './PeoplePicker';
import { atLarge, LARGE_TEXT, wordFitMultiplier } from '../components/wordFit';
import { SearchChrome } from '../puzzles/words/layout';
import { presentationFor } from './presentation';

/** All progress and autosave go through the existing owner/epoch-guarded Store. */
export function CoveRound({ entry, card, partner, width, replace = false, onBrowse, onClose, remix }: { remix?: string; entry: ChallengeEntry; card: ChallengeCard; partner: string | null; width: number; replace?: boolean; onBrowse: () => void; onClose: () => void }) {
  const { fontScale = 1, height } = useWindowDimensions(), largeSearch = entry.game === 'word-search' && fontScale >= LARGE_TEXT;
  const shortSearch = largeSearch && height < 500;
  const cap = entry.game === 'word-search' ? atLarge(fontScale, 1.3) : undefined;
  const [chromeHeight, setChromeHeight] = useState(0);
  const store = useStore(), owner = selectedOwner(store.save), focused = useIsFocused();
  const sound = useSoundControls(store.save.settings.sound && focused);
  const progress = progressFor(store.save, owner), saved = progress?.paused.find(s => s.game === entry.game && !s.credited && !s.result);
  const [pending, setPending] = useState<ChallengeSession>(), [finished, setFinished] = useState<ChallengeSession>(), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [role, setRole] = useState(!largeSearch), [replacement, setReplacement] = useState<ChallengeSession>();
  const current = useRef<ChallengeSession | undefined>(saved), lock = useRef(false), mounted = useRef(true), auto = useRef(false), boundary = useRef(false), dispatchToken = useRef(0);
  // Release draft input on acceptance, before disk I/O; launches/results stay serialized.
  useLayoutEffect(() => { if (saved && (!current.current || saved.id !== current.current.id || saved.revision >= current.current.revision)) { current.current = saved; if (!boundary.current) lock.current = false; } }, [saved]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const expected = (session?: ChallengeSession) => ({ owner, epoch: store.epoch, game: entry.game, id: session?.id ?? null, revision: session?.revision ?? null });
  const full = !saved && (progress?.paused.filter(s => !s.credited).length ?? 0) >= (owner.startsWith('cove-') ? 4 : 8);
  async function launch() {
    if (!focused || lock.current || !progress || saved && !replace) return;
    boundary.current = true; lock.current = true; setBusy(true); setMessage('');
    try {
      // A packed entry is verified and made resident again in case it left the small cache.
      if (entry.packed) await entry.packed.prepare(card.ref);
      let next = { ...entry.start(card.ref, owner, `cove-${owner}-${progress.nextOrdinal}`, progress, { supportOff: false, ownRead: false }, []), partner };
      if (remix) { const recipe = presentationFor(entry).remixes?.find(r => r.id === remix); if (!recipe) throw new Error('Unknown remix.'); const remixed = recipe.start(next); if (!sameRef(remixed.puzzle, next.puzzle)) throw new Error('A remix keeps the same puzzle ref.'); next = remixed; }
      const replacing = replace ? saved : replacement;
      if (await store.challengeSave(next, { ...expected(saved), ...(replacing ? { replace: { game: replacing.game, id: replacing.id, revision: replacing.revision } } : {}) })) {
        current.current = next;
      } else if (mounted.current) setMessage('This puzzle could not start. Your saved work is kept. Continue a saved puzzle or export a backup in Settings.');
    } catch { if (mounted.current) setMessage('This puzzle could not open. Your saved work is kept. Try again.'); }
    finally { boundary.current = false; lock.current = false; if (mounted.current) setBusy(false); }
  }
  // One launch per mounted owner/epoch/ref. Parent keys this component at every identity boundary.
  useEffect(() => {
    // A resumed round already owns an attempt. Crediting it removes `saved`,
    // but must never be mistaken for an empty first mount that needs a deal.
    if (focused && !auto.current && !saved && !current.current && !full) { auto.current = true; void launch(); }
  });
  // Word Search can finish two independent native pointers while a draft write is pending.
  // Serialize those gestures against the latest accepted revision; identity/unmount cancels the queue.
  const hunterQueue = useRef<unknown[]>([]);
  const latestDispatch = useRef<(action: unknown) => Promise<void>>(async () => {}), canDrain = useRef(false);
  useLayoutEffect(() => { canDrain.current = focused && !pending && !finished; if (!canDrain.current) hunterQueue.current = []; }, [focused, pending, finished]);
  async function dispatch(action: unknown) {
    if (entry.serializeMoves && focused && mounted.current && lock.current && !boundary.current && !pending && !current.current?.result && hunterQueue.current.length < 8) { hunterQueue.current.push(action); return; }
    const before = current.current;
    if (!focused || !before || lock.current || before.result || pending) { if (focused && !before?.result) setMessage('Wait for this change to finish, then try again. Your accepted work is kept.'); return; }
    const token = ++dispatchToken.current;
    lock.current = true; setMessage('');
    let accepted = false;
    try {
      const next = entry.move(before, action);
      if (!next) { setMessage(entry.full?.(before, action) ? 'This attempt’s move log is full. Your accepted draft is kept.' : 'That change could not be made. Your accepted draft is kept.'); return; }
      if (next.result && !next.partner && solvingPeople(store.save).some(p => p.id !== owner)) { setPending(next); return; }
      if (next.result) { boundary.current = true; setBusy(true); }
      if (await store.challengeSave(next, expected(before))) {
        accepted = true;
        if (!current.current || current.current.id === next.id && current.current.revision <= next.revision) current.current = next;
        if (next.result && mounted.current) setFinished(next);
      } else if (mounted.current) setMessage('Keep the app open. Retry saving or export your accepted work in Settings.');
    } catch { if (mounted.current) setMessage('This change could not be made. Your accepted draft is kept. Try again.'); } finally { if (token === dispatchToken.current) { boundary.current = false; lock.current = false; if (mounted.current) setBusy(false); if (!accepted || !mounted.current || !canDrain.current || current.current?.result) hunterQueue.current = []; else { const next = hunterQueue.current.shift(); if (next !== undefined) void latestDispatch.current(next); } } }
  }
  useLayoutEffect(() => { latestDispatch.current = dispatch; });
  async function confirmFinish(withPerson: string | null): Promise<boolean> {
    if (!pending || lock.current || !current.current || !focused) return false;
    boundary.current = true; lock.current = true; setBusy(true); setMessage('');
    try {
      const candidate = { ...pending, partner: withPerson };
      const next = { ...candidate, result: entry.catalog.codecs.get(candidate.codec)!.evaluate(candidate) };
      if (!next.result) throw new Error('The engine could not confirm this finish.');
      if (await store.challengeSave(next, expected(current.current))) { current.current = next; setFinished(next); setPending(undefined); return true; }
      setMessage('Your finish has not saved yet. Keep this screen open and try again.');
    } catch { setMessage('Your finish has not saved yet. Keep this screen open and try again.'); }
    finally { boundary.current = false; lock.current = false; setBusy(false); }
    return false;
  }
  const round = pending ?? saved ?? finished, actual = round ? entry.puzzles.find(p => sameRef(p.ref, round.puzzle)) ?? entry.packed?.card(round.puzzle) : card;
  // Leaving a finish that is waiting for a partner choice keeps it as a solo finish.
  const close = () => { if (pending && !lock.current) void confirmFinish(null).then(saved => { if (saved) onClose(); }); else onClose(); };
  const open = entry.packed ? async (e: Parameters<typeof store.challengeOpen>[0]) => { await entry.packed!.prepare(round!.puzzle); return store.challengeOpen(e); } : store.challengeOpen;
  const changeAttempt = !!saved && replace && (!sameRef(saved.puzzle, card.ref) || !!remix);
  return <View style={{ gap: 14 }}>
    <View onLayout={e => setChromeHeight(e.nativeEvent.layout.height)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Button maxFontSizeMultiplier={cap} quiet compact onPress={close}>← Cove</Button><Heading maxFontSizeMultiplier={largeSearch ? wordFitMultiplier(infoFor(entry.game).name, 24, Math.max(80, width - 120), shortSearch ? 1 : 2) : undefined} style={{ flexShrink: 1, ...(entry.helpUI === 'board' ? { fontSize: 24 } : {}) }}>{infoFor(entry.game).name}</Heading></View><SaveStatus/>
    {!!message && <Copy maxFontSizeMultiplier={cap} accessibilityLiveRegion="polite">{message}</Copy>}
    {changeAttempt ? <><Copy maxFontSizeMultiplier={cap}>Your unfinished puzzle is kept until this new attempt saves. Its notes and undo will then be replaced. Finished history stays kept.</Copy><Button maxFontSizeMultiplier={cap} disabled={busy} onPress={() => void launch()}>Replace paused puzzle</Button><Button maxFontSizeMultiplier={cap} quiet onPress={onClose}>Keep paused puzzle</Button></> : round ? <>
      {entry.helpUI !== 'board' && <Copy maxFontSizeMultiplier={cap}>{actual?.title}</Copy>}
      {round.partner && !shortSearch && <Copy maxFontSizeMultiplier={cap}>Together with {solvingPeople(store.save).find(p => p.id === round.partner)?.name ?? 'family'}</Copy>}
      {round.partner && !shortSearch && !role && infoFor(entry.game).role && <Button maxFontSizeMultiplier={cap} quiet compact onPress={() => setRole(true)}>Show role card</Button>}
      {round.partner && !shortSearch && role && infoFor(entry.game).role && <View style={{ gap: 8 }}><Copy maxFontSizeMultiplier={cap}>{infoFor(entry.game).role}</Copy><Button maxFontSizeMultiplier={cap} quiet compact onPress={() => setRole(false)}>Put role card away</Button></View>}
      {pending ? <><Heading maxFontSizeMultiplier={largeSearch ? wordFitMultiplier(infoFor(entry.game).name, 24, Math.max(80, width - 120), shortSearch ? 1 : 2) : undefined} style={{ fontSize: 24 }}>Keep this finish</Heading><Copy maxFontSizeMultiplier={cap}>Did you solve together? One tap credits both people. Your finish saves when you choose.</Copy><Button maxFontSizeMultiplier={cap} disabled={busy} onPress={() => void confirmFinish(null)}>Save my finish</Button>{solvingPeople(store.save).filter(p => p.id !== owner).map(p => <Button maxFontSizeMultiplier={cap} key={p.id} quiet disabled={busy} onPress={() => void confirmFinish(p.id)}>Solved together with {p.name}</Button>)}<Button maxFontSizeMultiplier={cap} quiet disabled={busy} onPress={() => setPending(undefined)}>Back to my board</Button></> : round.result ? <><Heading maxFontSizeMultiplier={largeSearch ? wordFitMultiplier(infoFor(entry.game).name, 24, Math.max(80, width - 120), shortSearch ? 1 : 2) : undefined} style={{ fontSize: 24 }}>{round.result.event === 'together' ? 'Solved together' : 'Puzzle solved'}</Heading>{entry.helpUI === 'board' && entry.render(round, () => {}, false, width)}<Copy maxFontSizeMultiplier={cap}>{entry.completionText?.(round.puzzle, round.result, entry.completionFacts?.(round) ?? null) ?? 'Your finished puzzle is kept.'} Take your time choosing what comes next.</Copy><Button maxFontSizeMultiplier={cap} onPress={onBrowse}>Replay or choose another puzzle</Button></> : <SessionGate key={`${owner}:${store.epoch}:${round.id}`} open={open} expected={expected(round)} onStartFresh={() => store.challengeDiscard(expected(round))} render={() => <>
        <SearchChrome.Provider value={{ top: 60, bottom: 34, bar: largeSearch ? chromeHeight + (round.partner && !shortSearch ? 84 : 0) + 28 : 0 }}><GridFeedback.Provider value={() => { sound.play('tap'); }}>{entry.render(round, a => void dispatch(a), focused && !busy, width)}</GridFeedback.Provider></SearchChrome.Provider>
        {shortSearch && round.partner && <View style={{ gap: 8 }}><Copy maxFontSizeMultiplier={cap}>Together with {solvingPeople(store.save).find(p => p.id === round.partner)?.name ?? 'family'}</Copy>{infoFor(entry.game).role && <><Button maxFontSizeMultiplier={cap} quiet compact onPress={() => setRole(value => !value)}>{role ? 'Put role card away' : 'Show role card'}</Button>{role && <Copy maxFontSizeMultiplier={cap}>{infoFor(entry.game).role}</Copy>}</>}</View>}
        {entry.helpUI !== 'board' && <Button maxFontSizeMultiplier={cap} quiet disabled={busy} onPress={() => void dispatch(entry.controls.help())}>Help · show me how</Button>}<Copy maxFontSizeMultiplier={cap}>Helping a child? Ask what they notice, then let them choose the next step.</Copy>
      </>}/>}
    </> : full ? <><Heading maxFontSizeMultiplier={largeSearch ? wordFitMultiplier(infoFor(entry.game).name, 24, Math.max(80, width - 120), shortSearch ? 1 : 2) : undefined} style={{ fontSize: 22 }}>Your paused spaces are full</Heading><Copy maxFontSizeMultiplier={cap}>Continue one, or choose one to replace. Existing work stays kept until a new puzzle saves.</Copy>{progress?.paused.filter(s => !s.credited).map(s => <Button maxFontSizeMultiplier={cap} key={s.id} quiet selected={replacement?.id === s.id} onPress={() => setReplacement(s)}>Replace paused {infoFor(s.game).name}</Button>)}{replacement && <Button maxFontSizeMultiplier={cap} disabled={busy} onPress={() => void launch()}>Start this puzzle instead</Button>}</> : <><Copy maxFontSizeMultiplier={cap}>{busy ? 'Opening your puzzle…' : 'Your saved work is kept.'}</Copy>{!busy && <Button maxFontSizeMultiplier={cap} onPress={() => void launch()}>Try opening again</Button>}</>}
    {!changeAttempt && !round?.result && <Button maxFontSizeMultiplier={cap} quiet onPress={onBrowse}>Bands, packs and all puzzles</Button>}
  </View>;
}
