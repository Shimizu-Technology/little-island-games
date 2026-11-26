import React, { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useIsFocused } from 'expo-router';
import { SaveStatus } from '../components/SaveStatus';
import { useStore } from '../state/Store';
import { progressFor, selectedOwner } from '../state/challengeDrafts';
import type { ChallengeSession } from '../state/challenge';
import type { ChallengeCard, ChallengeEntry } from '../challenge/types';
import { useSoundControls } from '../components/Audio';
import { GridFeedback, GridInteraction } from '../puzzles/grid/preferences';
import { SessionGate } from '../challenge/SessionGate';
import { Button, Hud, Icon, Text, glyphs, sheetHeight, theme } from '../ui';
import { infoFor, sameRef } from './catalog';
import { solvingPeople } from './PeoplePicker';
import { SearchChrome } from '../puzzles/words/layout';
import { presentationFor } from './presentation';
import type { Mistakes } from './local';
import { RoundMore } from './RoundMore';
import { difficultyLabel, hudActions } from './shelf';

/** Board-side choices the Cove screen supplies. Each is optional; a missing one leaves its More item out. */
export type RoundChoices = {
  mistakes?: Mistakes; onMistakes?: (value: Mistakes) => void;
  /** Deal another puzzle at this difficulty (finish card and More). */
  onNext?: () => void; onNew?: () => void;
  onSend?: (to: string, ref: ChallengeSession['puzzle']) => Promise<boolean>;
  onGrownUps?: () => void;
  /** Leave a "start a new puzzle?" question without replacing the paused one. */
  onKeep?: () => void;
};

/** All progress and autosave go through the existing owner/epoch-guarded Store. */
export function CoveRound({ entry, card, partner, width, replace = false, onBrowse, onClose, remix, choices = {} }: { remix?: string; entry: ChallengeEntry; card: ChallengeCard; partner: string | null; width: number; replace?: boolean; onBrowse: () => void; onClose: () => void; choices?: RoundChoices }) {
  const { height = 800 } = useWindowDimensions();
  const [chromeHeight, setChromeHeight] = useState(0), [boardHeight, setBoardHeight] = useState(0), [more, setMore] = useState(false), [gridTouch, setGridTouch] = useState(false);
  const outerHold = useContext(GridInteraction);
  // The board's own scroll lock, still reported to any enclosing host.
  const hold = useCallback((held: boolean) => { setGridTouch(held); outerHold(held); }, [outerHold]);
  const store = useStore(), owner = selectedOwner(store.save), focused = useIsFocused();
  const sound = useSoundControls(store.save.settings.sound && focused);
  const progress = progressFor(store.save, owner), saved = progress?.paused.find(s => s.game === entry.game && !s.credited && !s.result);
  const [pending, setPending] = useState<ChallengeSession>(), [finished, setFinished] = useState<ChallengeSession>(), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [replacement, setReplacement] = useState<ChallengeSession>();
  const current = useRef<ChallengeSession | undefined>(saved), lock = useRef(false), mounted = useRef(true), auto = useRef(false), boundary = useRef(false), dispatchToken = useRef(0);
  // Release draft input on acceptance, before disk I/O; launches/results stay serialized.
  useLayoutEffect(() => { if (saved && (!current.current || saved.id !== current.current.id || saved.revision >= current.current.revision)) { current.current = saved; if (!boundary.current) lock.current = false; } }, [saved]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const expected = (session?: ChallengeSession) => ({ owner, epoch: store.epoch, game: entry.game, id: session?.id ?? null, revision: session?.revision ?? null });
  const full = !saved && (progress?.paused.filter(s => !s.credited).length ?? 0) >= (owner.startsWith('cove-') ? 4 : 8);
  async function launch(restart = false) {
    if (!focused || lock.current || !progress || saved && !replace && !restart) return;
    boundary.current = true; lock.current = true; setBusy(true); setMessage('');
    try {
      const ref = restart && saved ? saved.puzzle : card.ref;
      // A packed entry is verified and made resident again in case it left the small cache.
      if (entry.packed) await entry.packed.prepare(ref);
      let next = { ...entry.start(ref, owner, `cove-${owner}-${progress.nextOrdinal}`, progress, { supportOff: false, ownRead: false }, []), partner: restart && saved ? saved.partner : partner };
      if (remix) { const recipe = presentationFor(entry).remixes?.find(r => r.id === remix); if (!recipe) throw new Error('Unknown remix.'); const remixed = recipe.start(next); if (!sameRef(remixed.puzzle, next.puzzle)) throw new Error('A remix keeps the same puzzle ref.'); next = remixed; }
      const replacing = replace || restart ? saved : replacement;
      if (await store.challengeSave(next, { ...expected(saved), ...(replacing ? { replace: { game: replacing.game, id: replacing.id, revision: replacing.revision } } : {}) })) {
        current.current = next;
      } else if (mounted.current) setMessage('This puzzle could not start. Your saved work is kept.');
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
  /** `quiet`: a HUD Undo or Hint that the engine declines (nothing to undo, no hint left) changes nothing and says nothing. */
  async function dispatch(action: unknown, quiet = false) {
    if (entry.serializeMoves && focused && mounted.current && lock.current && !boundary.current && !pending && !current.current?.result && hunterQueue.current.length < 8) { hunterQueue.current.push(action); return; }
    const before = current.current;
    if (!focused || !before || lock.current || before.result || pending) { if (focused && !before?.result) setMessage('Wait for this change to finish, then try again. Your accepted work is kept.'); return; }
    const token = ++dispatchToken.current;
    lock.current = true; setMessage('');
    let accepted = false;
    try {
      const next = entry.move(before, action);
      if (!next) { if (entry.full?.(before, action)) setMessage('This attempt’s move log is full. Your accepted draft is kept.'); else if (!quiet) setMessage('That change could not be made. Your accepted draft is kept.'); return; }
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
  const leaveThen = (next: () => void) => { if (pending && !lock.current) void confirmFinish(null).then(saved => { if (saved) next(); }); else next(); };
  const close = () => leaveThen(onClose);
  const open = entry.packed ? async (e: Parameters<typeof store.challengeOpen>[0]) => { await entry.packed!.prepare(round!.puzzle); return store.challengeOpen(e); } : store.challengeOpen;
  const changeAttempt = !!saved && replace && (!sameRef(saved.puzzle, card.ref) || !!remix);
  const people = solvingPeople(store.save), others = people.filter(p => p.id !== owner), together = round?.partner ? people.find(p => p.id === round.partner)?.name ?? 'family' : null;
  const name = infoFor(entry.game).name, tier = actual?.tier ?? card.tier, hud = hudActions(entry), playing = !!round && !round.result && !pending && !changeAttempt;
  // While More is open the board shrinks, in proportion to its measured full-width height, to the room above the sheet.
  const room = height - sheetHeight(height, 'small') - chromeHeight - theme.space.xl, fit = boardHeight > room ? room / boardHeight : 1;
  const boardWidth = more ? Math.max(160, Math.floor(width * fit)) : width;
  const finishCard = (heading: string, children: React.ReactNode) => <View testID="cove-finish" style={[styles.card, theme.shadow]}>
    <Icon glyph={glyphs.Sparkle} weight="fill" size={40} tone="lagoon"/>
    <Text variant="title" accessibilityRole="header" accessibilityLiveRegion="polite">{heading}</Text>
    {children}
  </View>;
  const question = (heading: string, line: string, children: React.ReactNode) => <View style={[styles.card, theme.shadow]}>
    <Text variant="section" accessibilityRole="header">{heading}</Text><Text variant="caption" tone="muted" style={styles.center}>{line}</Text>{children}
  </View>;
  return <View style={styles.screen}>
    <View onLayout={e => setChromeHeight(e.nativeEvent.layout.height)}>
      <Hud title={name} subtitle={[difficultyLabel(entry, tier), together && `with ${together}`].filter(Boolean).join(' · ')} onBack={close} backLabel="Save and leave"
        onUndo={playing && hud.undo ? () => void dispatch(hud.undo, true) : undefined} onHint={playing && hud.hint !== undefined ? () => void dispatch(hud.hint, true) : undefined}
        onMore={changeAttempt ? undefined : () => setMore(true)}/>
      <SaveStatus/>
    </View>
    <ScrollView scrollEnabled={!gridTouch} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.board, { paddingBottom: more ? sheetHeight(height, 'small') + theme.space.lg : theme.space.xl }]}>
      {changeAttempt ? question('Start a new puzzle?', 'Your paused puzzle will be replaced.', <>
        <Button label="New puzzle" fill disabled={busy} onPress={() => void launch()}/>
        <Button label="Keep my puzzle" variant="quiet" target="adult" fill onPress={choices.onKeep ?? onClose}/>
      </>) : round ? <>
        {pending ? finishCard('Puzzle solved', <>
          {others.map(p => <Button key={p.id} variant="secondary" target="adult" fill disabled={busy} label={`Solved together with ${p.name}`} onPress={() => void confirmFinish(p.id)}/>)}
          <Button label="Save my finish" fill disabled={busy} onPress={() => void confirmFinish(null)}/>
          <Button label="Back to my board" variant="quiet" target="adult" disabled={busy} onPress={() => setPending(undefined)}/>
        </>) : round.result ? <>
          {entry.helpUI === 'board' && entry.render(round, () => {}, false, boardWidth)}
          {finishCard(round.result.event === 'together' ? 'Solved together' : 'Puzzle solved', <>
            {together && <Text variant="caption" tone="muted">Together with {together}</Text>}
            <Text variant="body" style={styles.center}>{entry.completionText?.(round.puzzle, round.result, entry.completionFacts?.(round) ?? null) ?? 'Your finished puzzle is kept.'}</Text>
            {choices.onNext && <Button label="Next puzzle" fill onPress={choices.onNext}/>}
            <Button label="Puzzles" variant="secondary" target="adult" fill onPress={onClose}/>
          </>)}
        </> : <SessionGate key={`${owner}:${store.epoch}:${round.id}`} open={open} expected={expected(round)} onStartFresh={() => store.challengeDiscard(expected(round))} render={() => <>
          {entry.game === 'solitaire' && entry.full?.(round, entry.controls.reset()) && <Button label="Start this deal again" disabled={busy || !focused} onPress={() => void launch(true)}/>}
          <SearchChrome.Provider value={{ top: 60, bottom: 34, bar: entry.game === 'word-search' ? chromeHeight + 28 : 0 }}><GridInteraction.Provider value={hold}><GridFeedback.Provider value={() => { sound.play('tap'); }}><View testID="cove-board" onLayout={e => { if (!more) setBoardHeight(e.nativeEvent.layout.height); }} style={styles.boardBox}>{entry.render(round, a => void dispatch(a), focused && !busy, boardWidth)}</View></GridFeedback.Provider></GridInteraction.Provider></SearchChrome.Provider>
        </>}/>}
      </> : full ? question('Too many paused puzzles', 'Pick one to replace.', <>
        {progress?.paused.filter(s => !s.credited).map(s => <Button key={s.id} variant={replacement?.id === s.id ? 'secondary' : 'quiet'} target="adult" fill selected={replacement?.id === s.id} label={`Replace ${infoFor(s.game).name}`} onPress={() => setReplacement(s)}/>)}
        {replacement && <Button label="Start this puzzle" fill disabled={busy} onPress={() => void launch()}/>}
      </>) : <>
        <Text variant="caption" tone="muted">{busy ? 'Opening your puzzle…' : 'Your saved work is kept.'}</Text>
        {!busy && <Button label="Try again" onPress={() => void launch()}/>}
      </>}
      {!!message && <Text variant="caption" accessibilityLiveRegion="polite" style={styles.center}>{message}</Text>}
    </ScrollView>
    <RoundMore visible={more} onClose={() => setMore(false)} game={entry.game} busy={busy}
      mistakes={choices.mistakes} onMistakes={choices.onMistakes}
      onRestart={saved && playing ? () => void launch(true) : undefined}
      onNew={choices.onNew} onChoose={() => leaveThen(onBrowse)}
      people={others} onSend={choices.onSend && round ? to => choices.onSend!(to, round.puzzle) : undefined}
      role={round?.partner ? infoFor(entry.game).role : undefined} onGrownUps={choices.onGrownUps}/>
  </View>;
}

/** Plain style objects (React Native accepts them as they are). */
const styles = {
  screen: { flex: 1 },
  board: { alignItems: 'center', gap: theme.space.md, paddingHorizontal: theme.space.lg, paddingTop: theme.space.sm },
  card: { alignSelf: 'center', maxWidth: 520, width: '100%', alignItems: 'center', gap: theme.space.md, padding: theme.space.xl, borderRadius: theme.radius.sheet, backgroundColor: theme.colors.surface },
  boardBox: { alignSelf: 'stretch', alignItems: 'center' },
  center: { textAlign: 'center' },
} as const;
