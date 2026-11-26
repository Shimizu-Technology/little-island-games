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
import { FaceButton, solvingPeople } from './PeoplePicker';
import { SearchChrome } from '../puzzles/words/layout';
import { presentationFor } from './presentation';
import type { Mistakes } from './local';
import { RoundMore } from './RoundMore';
import { boardTitle, engineReset, honorsMistakes, hudActions, playLabel } from './shelf';
import { BoardHud, type BoardCommands, type BoardMoreAction } from './boardHud';

/** What the HUD shows of a hosted board's commands; their handlers stay in a ref. */
type HudShape = {
  hint?: { disabled: boolean; label?: string };
  undo?: { disabled: boolean };
  reset?: { disabled: boolean };
  extraActions?: { label: string; disabled: boolean; icon?: BoardMoreAction['icon'] }[];
  localPlay?: boolean;
} | null;
const shapeOf = (c: BoardCommands | null): HudShape => c && {
  ...(c.hint ? { hint: { disabled: !!c.hint.disabled, ...(c.hint.label ? { label: c.hint.label } : {}) } } : {}),
  ...(c.undo ? { undo: { disabled: !!c.undo.disabled } } : {}),
  ...(c.reset ? { reset: { disabled: !!c.reset.disabled } } : {}),
  ...(c.extraActions?.length ? { extraActions: c.extraActions.map(a => ({ label: a.label, disabled: !!a.disabled, ...(a.icon ? { icon: a.icon } : {}) })) } : {}),
  ...(c.localPlay ? { localPlay: true } : {}),
};
/** A board shrunk above More never goes narrower than this (or the full width, when that is less): its keys and pads keep their minimums. */
const MIN_BOARD = 280;

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
export function CoveRound({ entry, card, partner, width, replace = false, onBrowse, onClose, remix, choosing = false, choices = {}, onFinishHeld }: {
  remix?: string; entry: ChallengeEntry; card: ChallengeCard; partner: string | null; width: number; replace?: boolean; onBrowse: () => void; onClose: () => void;
  /** Choose a puzzle is open over this round: More steps aside and comes back when it closes. */
  choosing?: boolean;
  choices?: RoundChoices;
  /** Told while a finish waits for its partner choice (and `false` on unmount), so the host drops any deal that would replace this round. */
  onFinishHeld?: (held: boolean) => void;
}) {
  const { height = 800 } = useWindowDimensions();
  const [chromeHeight, setChromeHeight] = useState(0), [boardHeight, setBoardHeight] = useState(0), [screenHeight, setScreenHeight] = useState(0), [more, setMore] = useState(false), [gridTouch, setGridTouch] = useState(false);
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
  // A hosted board hands over its own staged Hint, Undo and Start over (BoardHud); the HUD re-renders only when their availability changes.
  const commands = useRef<BoardCommands | null>(null), [hud, setHud] = useState<HudShape>(null);
  const register = useCallback((next: BoardCommands | null) => { commands.current = next; const shape = shapeOf(next); setHud(before => JSON.stringify(before) === JSON.stringify(shape) ? before : shape); }, []);
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
  const held = !!pending, heldTo = useRef(onFinishHeld);
  useLayoutEffect(() => { heldTo.current = onFinishHeld; });
  useLayoutEffect(() => { heldTo.current?.(held); }, [held]);
  useLayoutEffect(() => () => heldTo.current?.(false), []);
  // The finish save in flight, so leaving waits for it: a refused finish stays here, visible and retryable.
  const finishing = useRef<Promise<boolean> | null>(null);
  function confirmFinish(withPerson: string | null): Promise<boolean> {
    if (!pending || lock.current || !current.current || !focused) return Promise.resolve(false);
    const run = saveFinish(pending, withPerson).finally(() => { if (finishing.current === run) finishing.current = null; });
    finishing.current = run;
    return run;
  }
  async function saveFinish(solved: ChallengeSession, withPerson: string | null): Promise<boolean> {
    boundary.current = true; lock.current = true; setBusy(true); setMessage('');
    try {
      const candidate = { ...solved, partner: withPerson };
      const next = { ...candidate, result: entry.catalog.codecs.get(candidate.codec)!.evaluate(candidate) };
      if (!next.result) throw new Error('The engine could not confirm this finish.');
      if (await store.challengeSave(next, expected(current.current))) { current.current = next; setFinished(next); setPending(undefined); return true; }
      setMessage('Your finish has not saved yet. Keep this screen open and try again.');
    } catch { setMessage('Your finish has not saved yet. Keep this screen open and try again.'); }
    finally { boundary.current = false; lock.current = false; setBusy(false); }
    return false;
  }
  const round = pending ?? saved ?? finished, actual = round ? entry.puzzles.find(p => sameRef(p.ref, round.puzzle)) ?? entry.packed?.card(round.puzzle) : card;
  // Leaving a finish that is waiting for a partner choice keeps it as a solo finish. While its save is in flight,
  // leaving waits for that save and happens only if it lands; any other held change keeps the finish here.
  const leaveThen = (next: () => void) => {
    const after = (saved: boolean) => { if (saved && mounted.current) next(); };
    if (finishing.current) void finishing.current.then(after);
    else if (!pending) next();
    else if (lock.current) setMessage('Wait for this change to finish, then try again. Your accepted work is kept.');
    else void confirmFinish(null).then(after);
  };
  const close = () => leaveThen(onClose);
  const open = entry.packed ? async (e: Parameters<typeof store.challengeOpen>[0]) => { await entry.packed!.prepare(round!.puzzle); return store.challengeOpen(e); } : store.challengeOpen;
  const changeAttempt = !!saved && replace && (!sameRef(saved.puzzle, card.ref) || !!remix);
  const people = solvingPeople(store.save), others = people.filter(p => p.id !== owner), together = round?.partner ? people.find(p => p.id === round.partner)?.name ?? 'family' : null;
  const name = infoFor(entry.game).name, tier = actual?.tier ?? card.tier, frameHint = hudActions(entry).hint, playing = !!round && !round.result && !pending && !changeAttempt;
  const localPlay = !!hud?.localPlay, hudActive = playing || localPlay;
  const ref = round?.puzzle ?? card.ref, title = boardTitle(entry, ref, tier), host = { commands: register, title };
  // Restart keeps this attempt: the board's own Start over (an engine reset that keeps its options and help audit).
  // A table whose log is full cannot take another reset, so it restarts the deal the documented way.
  // A local board (such as Picture Grid's family solver) keeps its own reset even over a finished Cove round.
  const reset = engineReset(entry), canRestart = localPlay ? !!hud?.reset : !!saved && playing && !!hud?.reset && reset !== undefined;
  const restart = () => {
    if (commands.current?.localPlay) { commands.current.reset?.run(); return; }
    if (!saved) return;
    if (entry.full?.(saved, reset)) void launch(true); else commands.current?.reset?.run();
  };
  // While More is open the board shrinks, in proportion to its measured full-width height, to the room above the sheet
  // inside this screen's own (safe-area) height, never below its minimum width.
  const room = (screenHeight || height) - sheetHeight(height, 'small') - chromeHeight - theme.space.xl, fit = boardHeight > room ? room / boardHeight : 1;
  const boardWidth = more && !choosing ? Math.max(Math.min(width, MIN_BOARD), Math.floor(width * fit)) : width;
  const finishCard = (heading: string, children: React.ReactNode) => <View testID="cove-finish" style={[styles.card, theme.shadow]}>
    <Icon glyph={glyphs.Sparkle} weight="fill" size={40} tone="lagoon"/>
    <Text variant="title" accessibilityRole="header" accessibilityLiveRegion="polite">{heading}</Text>
    {children}
  </View>;
  const question = (heading: string, line: string, children: React.ReactNode) => <View style={[styles.card, theme.shadow]}>
    <Text variant="section" accessibilityRole="header">{heading}</Text><Text variant="caption" tone="muted" style={styles.center}>{line}</Text>{children}
  </View>;
  return <View style={styles.screen} onLayout={e => setScreenHeight(e.nativeEvent.layout.height)}>
    <View onLayout={e => setChromeHeight(e.nativeEvent.layout.height)}>
      <Hud title={name} subtitle={[playLabel(entry, ref, tier), together && `with ${together}`].filter(Boolean).join(' · ')} onBack={close} backLabel="Save and leave"
        onUndo={hudActive && hud?.undo ? () => commands.current?.undo?.run() : undefined} canUndo={!hud?.undo?.disabled && !busy}
        onHint={hudActive && hud?.hint ? () => commands.current?.hint?.run() : playing && frameHint !== undefined ? () => void dispatch(frameHint, true) : undefined}
        canHint={!hud?.hint?.disabled && !busy} hintLabel={hud?.hint?.label}
        onMore={changeAttempt ? undefined : () => setMore(true)}/>
      <SaveStatus/>
    </View>
    <ScrollView scrollEnabled={!gridTouch} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.board, { paddingBottom: more ? sheetHeight(height, 'small') + theme.space.lg : theme.space.xl }]}>
      {changeAttempt ? question('Start a new puzzle?', 'Your paused puzzle will be replaced.', <>
        <Button label="New puzzle" fill disabled={busy} onPress={() => void launch()}/>
        <Button label="Keep my puzzle" variant="quiet" target="adult" fill onPress={choices.onKeep ?? onClose}/>
      </>) : round ? <>
        {pending ? finishCard('Puzzle solved', <>
          <Text variant="caption" tone="muted">Solved together with…</Text>
          <View style={styles.faces}>{others.map(p => <FaceButton key={p.id} id={p.id} name={p.name} label={`Solved together with ${p.name}`} disabled={busy} onPress={() => void confirmFinish(p.id)}/>)}</View>
          <Button label="Save my finish" fill disabled={busy} onPress={() => void confirmFinish(null)}/>
          <Button label="Back to my board" variant="quiet" target="adult" disabled={busy} onPress={() => setPending(undefined)}/>
        </>) : round.result ? <>
          {entry.helpUI === 'board' && <BoardHud.Provider value={host}>{entry.render(round, () => {}, false, boardWidth)}</BoardHud.Provider>}
          {finishCard(round.result.event === 'together' ? 'Solved together' : 'Puzzle solved', <>
            {together && <Text variant="caption" tone="muted">Together with {together}</Text>}
            <Text variant="body" style={styles.center}>{entry.completionText?.(round.puzzle, round.result, entry.completionFacts?.(round) ?? null) ?? 'Your finished puzzle is kept.'}</Text>
            {choices.onNext && <Button label="Next puzzle" fill onPress={choices.onNext}/>}
            <Button label="Puzzles" variant="secondary" target="adult" fill onPress={onClose}/>
          </>)}
        </> : <SessionGate key={`${owner}:${store.epoch}:${round.id}`} open={open} expected={expected(round)} onStartFresh={() => store.challengeDiscard(expected(round))} render={() => <>
          {entry.game === 'solitaire' && entry.full?.(round, entry.controls.reset()) && <Button label="Start this deal again" disabled={busy || !focused} onPress={() => void launch(true)}/>}
          <SearchChrome.Provider value={{ top: 60, bottom: 34, bar: entry.game === 'word-search' ? chromeHeight + 28 : 0 }}><GridInteraction.Provider value={hold}><GridFeedback.Provider value={() => { sound.play('tap'); }}><View testID="cove-board" onLayout={e => { if (!more) setBoardHeight(e.nativeEvent.layout.height); }} style={styles.boardBox}><BoardHud.Provider value={host}>{entry.render(round, a => void dispatch(a), focused && !busy, boardWidth)}</BoardHud.Provider></View></GridFeedback.Provider></GridInteraction.Provider></SearchChrome.Provider>
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
    {/* A finish waiting for its partner choice lives only here, so nothing in More may replace this round until it is saved. */}
    <RoundMore visible={more && !choosing} onClose={() => setMore(false)} game={entry.game} busy={busy} held={pending ? 'Save your finish first.' : undefined}
      mistakes={honorsMistakes(entry) ? choices.mistakes : undefined} onMistakes={honorsMistakes(entry) ? choices.onMistakes : undefined}
      onRestart={canRestart ? restart : undefined} restartDisabled={canRestart && !!hud?.reset?.disabled && (localPlay || !entry.full?.(saved!, reset))}
      extraActions={hud?.extraActions?.map((action, index) => ({
        label: action.label,
        disabled: action.disabled,
        icon: action.icon,
        onPress: () => commands.current?.extraActions?.[index]?.run(),
      }))}
      onNew={choices.onNew} onChoose={onBrowse}
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
  faces: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: theme.space.md },
  center: { textAlign: 'center' },
} as const;
