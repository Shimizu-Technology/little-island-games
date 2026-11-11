import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button, C, Chip, Copy, Heading, Sheet, ToggleRow, font } from '../components/ui';
import { Recovery } from '../components/Recovery';
import { SaveStatus } from '../components/SaveStatus';
import { useStore } from '../state/Store';
import { emptyChallenge } from '../state/challenge';
import { progressFor, selectedOwner } from '../state/challengeDrafts';
import { makeGate, gateAccepts } from '../state/grownUpGate';
import { shelfGames } from '../learn/home';
import { learningGroups } from '../learn/generated/ids';
import type { ChallengeCard, ChallengeEntry } from '../challenge/types';
import { openGame } from '../hub/navigation';
import { Landmark } from '../hub/Landmarks';
import { PeoplePicker, solvingPeople } from './PeoplePicker';
import { cardFor, coveEntries, dealPacked, hiddenPackedCount, infoFor, readers, rowNames, shownCount, suggested, suggestedPacked, tideTable } from './catalog';
import { civilDate } from '../puzzles/today';
import { defaults } from './local';
import { useCoveLocal } from './useCoveLocal';
import { CoveRound } from './CoveRound';
import { GridPreferences, GridInteraction, GridAdult } from '../puzzles/grid/preferences';
import { PuzzleBrowser } from './PuzzleBrowser';

export default function CoveScreen() {
  const store = useStore();
  const active = store.save.cove?.active, epoch = store.epoch, covePerson = store.covePerson;
  // A native Back/swipe or another destination has the same identity boundary as Map.
  // A cleanup captured before a person/restore change is rejected by Store's epoch guard.
  useFocusEffect(useCallback(() => () => { if (active) void covePerson({ type: 'select', id: null }, epoch); }, [active, epoch, covePerson]));
  // Recovery is a flex:1 ScrollView; without flex here it has no height and the screen looks blank.
  if (!store.ready) return <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}><Heading>Getting your Cove ready…</Heading></SafeAreaView>;
  if (store.recovery) return <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}><Recovery/></SafeAreaView>;
  return <ResumeCovePerson><CoveLocalGate key={`${selectedOwner(store.save)}:${store.epoch}`}/></ResumeCovePerson>;
}
/** A named shortcut is an explicit request, never the launch identity. */
function ResumeCovePerson({ children }: { children: React.ReactNode }) {
  const store = useStore(), params = useLocalSearchParams<{ person?: string }>(), requested = params.person;
  const [error, setError] = useState(''), [done, setDone] = useState(false), opening = useRef(false);
  const open = useCallback(async () => {
    if (!requested || done || opening.current || !store.save.cove?.people[requested]) return;
    opening.current = true;
    if (await store.covePerson({ type: 'select', id: requested }, store.epoch)) setDone(true);
    else setError('Could not open this person yet. Your saved work is kept. Try again.');
    opening.current = false;
  }, [requested, store, done]);
  useEffect(() => { if (requested && !done) void Promise.resolve().then(open); }, [requested, open, done]);
  if (requested && store.save.cove?.people[requested] && store.save.cove.active !== requested && !done) return <SafeAreaView><Copy>{error || 'Opening your saved puzzle…'}</Copy>{!!error && <Button onPress={() => void open()}>Try again</Button>}</SafeAreaView>;
  return <>{children}</>;
}
function SheetError({ local, message = '' }: { local: ReturnType<typeof useCoveLocal>; message?: string }) { return local.error || message ? <Copy accessibilityLiveRegion="polite">{local.error || message}</Copy> : null; }
function CoveLocalGate() {
  const local = useCoveLocal();
  if (!local.ready) return <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}><View style={{ padding: 20, gap: 12 }}><Heading>Puzzle Cove</Heading><Copy>{local.error || 'Getting your Cove choices ready…'}</Copy>{!!local.error && <><Button quiet onPress={local.load}>Retry Cove preferences</Button><Button quiet onPress={() => void local.reset()}>Use fresh Cove choices · keep original copy</Button></>}</View></SafeAreaView>;
  return <CoveInterior local={local}/>;
}
function CoveInterior({ local }: { local: ReturnType<typeof useCoveLocal> }) {
  const store = useStore(), owner = selectedOwner(store.save), { width, fontScale } = useWindowDimensions();
  const params = useLocalSearchParams<{ game?: string }>(), entries = coveEntries(), progress = progressFor(store.save, owner) ?? emptyChallenge();
  const [selection, setSelection] = useState<{ entry: ChallengeEntry; card: ChallengeCard; replace: boolean; remix?: string } | null>(() => { const entry = entries.find(e => e.game === params.game), saved = progress.paused.find(s => s.game === params.game && !s.result && !s.credited), allowed = entry?.puzzles.filter(p => !local.data.hidden.includes(p.ref.hash)); const card = saved ? cardFor(saved.puzzle, entries) ?? (entry?.puzzles.length ? suggested(entry, progress) : undefined) : allowed?.length ? suggested({ ...entry!, puzzles: allowed }, progress, (local.data.people[owner] ?? defaults()).band) : undefined; return entry && card ? { entry, card, replace: false } : null; });
  const [gridTouch, setGridTouch] = useState(false), [browse, setBrowse] = useState<ChallengeEntry | null>(null), [partner, setPartner] = useState<string | null>(null), [options, setOptions] = useState(false), [pinning, setPinning] = useState(false), [adult, setAdult] = useState(false), [answer, setAnswer] = useState(''), [gate, setGate] = useState(makeGate), [message, setMessage] = useState('');
  const preferences = local.data.people[owner] ?? defaults(), people = solvingPeople(store.save), cardWidth = Math.min(260, width - 52);
  const [dealing, setDealing] = useState(false);
  // Hidden packed puzzles are found by hash in their banks, only when something is hidden.
  const [packedHidden, setPackedHidden] = useState<Record<string, number>>({}), hiddenKey = local.data.hidden.join('|');
  useEffect(() => {
    let live = true;
    void Promise.all(entries.filter(e => e.packed).map(async e => [e.game, await hiddenPackedCount(e, local.data.hidden).catch(() => 0)] as const)).then(rows => { if (live) setPackedHidden(Object.fromEntries(rows)); });
    return () => { live = false; };
  }, [hiddenKey]); // eslint-disable-line react-hooks/exhaustive-deps -- Recount only when the hidden list changes.
  /** A packed game deals its next entry here; content is verified before the round mounts. */
  const deal = async (entry: ChallengeEntry, pick: () => Promise<ChallengeCard | undefined>, replace: boolean) => {
    if (dealing) return;
    setDealing(true); setMessage('');
    try { const card = await pick(); if (card) { setBrowse(null); setSelection({ entry, card, replace }); } else setMessage('This puzzle could not open. Your saved work is kept. Try again.'); }
    catch { setMessage('This puzzle could not open. Your saved work is kept. Try again.'); }
    finally { setDealing(false); }
  };
  const choose = (entry: ChallengeEntry, card?: ChallengeCard, replace = false) => {
    if (!card && !entry.puzzles.length && entry.packed) { void deal(entry, () => suggestedPacked(entry, progress, preferences.band, local.data.hidden), replace); return; }
    setBrowse(null); setSelection({ entry, card: card ?? suggested({ ...entry, puzzles: entry.puzzles.filter(p => !local.data.hidden.includes(p.ref.hash)) }, progress, preferences.band), replace });
  };
  const opened = useRef(false);
  useEffect(() => { const entry = entries.find(e => e.game === params.game); if (!opened.current && !selection && entry?.packed && !entry.puzzles.length) { opened.current = true; choose(entry); } }); // A packed shortcut deals once on arrival.
  useEffect(() => { if (owner.startsWith('cove-')) void local.change({ type: 'remember-person', owner }); }, [owner]); // eslint-disable-line react-hooks/exhaustive-deps -- Remember explicit identity changes only.
  const owners = people.map(p => p.id).sort().join('|');
  useEffect(() => { void local.change({ type: 'prune', owners: owners.split('|') }); }, [owners]); // eslint-disable-line react-hooks/exhaustive-deps -- Prune only when the actual people change.
  const hidden = (card: ChallengeCard) => local.data.hidden.includes(card.ref.hash);
  const visibleEntries = entries.map(e => ({ ...e, puzzles: e.puzzles.filter(p => !hidden(p)) })).filter(e => shownCount(e));
  const items = entries.filter(e => shownCount(e, local.data.hidden));
  const tile = (id: string, name: string, detail: string, action: () => void) => <Button key={id} quiet onPress={action} style={{ width: cardWidth, minHeight: 118 }} label={`Open ${name}. ${detail}`}>{name}{'\n'}{detail}</Button>;
  const row = (title: string, children: React.ReactNode[], count = children.length) => <View key={title} style={{ gap: 8 }}><Heading style={{ fontSize: 23 }}>{title} · {count}</Heading>{children.length ? <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>{children}</ScrollView> : <Copy>No puzzles here yet.</Copy>}</View>;
  const leave = async (next: () => void) => { if (store.save.cove?.active && !await store.covePerson({ type: 'select', id: null }, store.epoch)) { setMessage('Could not leave this person yet. Your saved work is kept. Try again.'); return; } next(); };
  const close = () => { setSelection(null); setBrowse(null); };
  const currentSaved = selection && progress.paused.find(s => s.game === selection.entry.game && !s.result && !s.credited);
  const currentRef = currentSaved?.puzzle ?? selection?.card.ref;
  if (browse && !selection) return <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}><PeoplePicker/><PuzzleBrowser key={browse.game} entry={browse} progress={progress} initialBand={preferences.band} reader={preferences.reader} hidden={local.data.hidden} onBack={close} onBand={band => void local.change({ type: 'preferences', owner, value: { band } })} onChoose={card => choose(browse, card, true)} onRemix={(card, remix) => { setSelection({ entry: browse, card, replace: true, remix }); setBrowse(null); }}/></SafeAreaView>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}><ScrollView scrollEnabled={!gridTouch} contentContainerStyle={{ width: '100%', maxWidth: 960, alignSelf: 'center', padding: 20, gap: selection ? 12 : 22 }} keyboardShouldPersistTaps="handled">
    {/* A round has its own back button; keep only who is solving above the board. */}
    {selection ? <PeoplePicker/> : <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}><Button quiet compact onPress={() => void leave(() => router.canGoBack() ? router.back() : router.replace('/'))}>← Map</Button><Heading style={{ fontSize: 28, flexShrink: 1 }}>Puzzle Cove</Heading><PeoplePicker/></View>}<SaveStatus/>
    {!!local.error && <View style={{ gap: 8 }}><Copy accessibilityLiveRegion="polite">{local.error}</Copy><Button quiet onPress={local.load}>Retry Cove preferences</Button>{!local.ready && <Button quiet onPress={() => void local.reset()}>Use fresh Cove choices · keep original copy</Button>}</View>}
    {selection ? <><GridInteraction.Provider value={setGridTouch}><GridAdult.Provider value={adult}><GridPreferences.Provider value={preferences}><CoveRound key={`${selection.entry.game}:${selection.card.ref.hash}:${selection.replace}:${selection.remix ?? ""}`} {...selection} partner={partner} width={Math.min(width, 960) - 40} onClose={close} onBrowse={() => { setBrowse(selection.entry); setSelection(null); }}/></GridPreferences.Provider></GridAdult.Provider></GridInteraction.Provider><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Button quiet onPress={() => setPinning(true)}>Try this one · pin to a person</Button><Button quiet onPress={() => setOptions(true)}>Cove choices</Button></View></> : <>
      <View style={{ flexDirection: fontScale > 1.5 ? 'column' : 'row', gap: 16, alignItems: 'center' }}><View style={{ width: 110, height: 90 }}><Landmark id="cove"/></View><View style={{ flex: 1 }}><Heading style={{ fontSize: 24 }}>Think as long as you like.</Heading><Copy>Every band is open. Your puzzles wait for you.</Copy></View></View>
      {row('Keep going', [...progress.paused.filter(s => !s.result && !s.credited).flatMap(s => { const entry = entries.find(e => e.game === s.game), card = cardFor(s.puzzle, entries); return entry && card ? [tile(s.id, infoFor(s.game).name, local.data.hidden.includes(card.ref.hash) ? 'Continue your saved puzzle · hidden from packs' : 'Continue your saved puzzle', () => choose(entry, card))] : []; }), ...(local.data.pins[owner] ?? []).flatMap(pin => { const entry = items.find(e => e.game === pin.ref.engine), card = cardFor(pin.ref, entries); return entry && card && !hidden(card) ? [<View key={`pin-${card.ref.hash}`} style={{ gap: 6 }}>{tile(card.ref.hash, infoFor(entry.game).name, `Try this one · from ${people.find(p => p.id === pin.from)?.name ?? 'family'}`, () => choose(entry, card, true))}<Button quiet compact onPress={() => void local.change({ type: 'unpin', owner, hash: pin.ref.hash })}>Put pin away</Button></View>] : []; })])}
      {row('Today · Tide Table', tideTable(civilDate(new Date()), visibleEntries).map(p => tile(p.size, `${p.size} · ${infoFor(p.entry.game).name}`, p.title, () => p.card ? choose(p.entry, p.card, true) : void deal(p.entry, () => dealPacked(p.entry, p.bank!, progress, local.data.hidden), true))))}<Copy>Today is a shortcut into the packs. No expiry. Past days stay in their packs.</Copy>
      {rowNames.map(name => {
        const games = items.filter(e => infoFor(e.game).row === name);
        const children: React.ReactNode[] = games.map(e => <View key={e.game} style={{ gap: 6 }}>{tile(e.game, infoFor(e.game).name, `${shownCount(e, [], packedHidden[e.game] ?? 0)} puzzles · all bands open`, () => choose(e))}<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}><Button quiet compact onPress={() => setBrowse(e)}>Bands & packs</Button><Button quiet compact disabled={!local.ready} onPress={() => void local.change({ type: 'favorite', game: e.game })}>{local.data.favorites.includes(e.game) ? '★ Favorite' : '☆ Favorite'}</Button></View></View>);
        if (name === 'Logic') children.push(tile('reef-sweep', 'Reef Sweep', 'A shortcut to the same saved game in the Hall', () => void leave(() => openGame('reef-sweep'))));
        if (name === 'Island originals') children.push(...shelfGames.filter(g => (learningGroups as Partial<Record<string, 'levels' | 'originals'>>)[g.id] === 'originals').map(g => tile(g.id, g.name, 'Same game, same saved work as School', () => void leave(() => openGame(g.id)))));
        return row(name, children);
      })}

      <View style={{ gap: 8 }}><Heading style={{ fontSize: 22 }}>Solve together</Heading><Copy>Choose a partner before opening a new puzzle. Both people get a Together finish. You can also confirm a partner at the finish. A paused Together puzzle keeps its original people.</Copy><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Chip selected={partner === null} onPress={() => setPartner(null)}>On my own</Chip>{people.filter(p => p.id !== owner).map(p => <Chip key={p.id} selected={partner === p.id} onPress={() => setPartner(p.id)}>{p.name}</Chip>)}</View></View>
      <Button quiet onPress={() => setOptions(true)}>Reader level, mistake settings and grown-up choices</Button>
    </>}
    {dealing && <Copy accessibilityLiveRegion="polite">Opening your puzzle…</Copy>}
    {!!message && <Copy accessibilityLiveRegion="polite">{message}</Copy>}
  </ScrollView>
    <Sheet visible={pinning} title="Try this one" onClose={() => setPinning(false)}><SheetError local={local}/><Copy>A quiet pin in their Keep going. No scores or notifications.</Copy>{people.filter(p => p.id !== owner).map(p => <Button key={p.id} quiet disabled={!local.ready || !currentRef} onPress={() => { if (currentRef) void local.change({ type: 'pin', to: p.id, pin: { from: owner, ref: currentRef } }).then(ok => { if (ok) { setPinning(false); setMessage(`Pinned for ${p.name}.`); } }); }}>{p.name}</Button>)}</Sheet>
    <Sheet visible={options} title="Cove choices" onClose={() => { setOptions(false); setAnswer(''); }}><SheetError local={local} message={message}/><Heading style={{ fontSize: 20 }}>Reader level</Heading><Copy>Choose reading separately from puzzle difficulty.</Copy><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{readers.map(reader => <Chip key={reader} selected={preferences.reader === reader} onPress={() => void local.change({ type: 'preferences', owner, value: { reader, fillNotes: reader === 'Grown-up' && preferences.fillNotes } })}>{reader}</Chip>)}</View><Heading style={{ fontSize: 20 }}>Mistakes</Heading><Copy>Friendly shows conflicts. Plain checks when you ask. Rewind offers a way back. There is never a mistake limit or game over.</Copy>{(['Friendly', 'Plain', 'Rewind'] as const).map(mistakes => <Chip key={mistakes} selected={preferences.mistakes === mistakes} onPress={() => void local.change({ type: 'preferences', owner, value: { mistakes } })}>{mistakes}</Chip>)}{adult && preferences.reader === 'Grown-up' && <ToggleRow label="Fill notes when supported" value={preferences.fillNotes} onChange={fillNotes => void local.change({ type: 'preferences', owner, value: { fillNotes } })}/>}<Copy>Cove choices and pins stay on this device. Puzzle progress and paused boards are included in the app backup.</Copy>
      {adult ? <>{currentRef && <Button quiet onPress={() => void local.change({ type: 'hide', hash: currentRef.hash }).then(ok => { if (ok) { close(); setOptions(false); } })}>Hide this puzzle on this device</Button>}<Button quiet onPress={() => void local.change({ type: 'unhide' })}>Show all hidden puzzles ({local.data.hidden.length})</Button></> : <><Copy>For grown-ups · type {gate.a} × {gate.b} to change hidden puzzles or enable fill notes.</Copy><TextInput accessibilityLabel="Grown-up answer" keyboardType="number-pad" value={answer} onChangeText={setAnswer} style={{ minHeight: 48, padding: 12, borderColor: C.teal, borderWidth: 1, borderRadius: 12, fontSize: 18, fontFamily: font, color: C.ink }}/><Button quiet onPress={() => { if (gateAccepts(gate, answer)) setAdult(true); else { setGate(makeGate()); setMessage('A grown-up can try a new question.'); } setAnswer(''); }}>Open grown-up choices</Button></>}
    </Sheet>
  </SafeAreaView>;
}
