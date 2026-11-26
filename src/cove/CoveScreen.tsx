import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Recovery } from '../components/Recovery';
import { SaveStatus } from '../components/SaveStatus';
import { useStore } from '../state/Store';
import { emptyChallenge, type ChallengeSession, type PuzzleRef } from '../state/challenge';
import { progressFor, selectedOwner } from '../state/challengeDrafts';
import { shelfGames } from '../learn/home';
import { learningGroups } from '../learn/generated/ids';
import { challengeFor } from '../challenge/catalog';
import type { ChallengeCard, ChallengeEntry } from '../challenge/types';
import { openGame } from '../hub/navigation';
import type { ShelfId } from '../learn/home';
import { Button, Text, theme } from '../ui';
import { solvingPeople } from './PeoplePicker';
import { cardFor, completionLookup, coveEntries, dealPacked, infoFor, isSolved, sameRef, suggestedPacked, tideTable } from './catalog';
import { civilDate } from '../puzzles/today';
import { defaults, type Preferences } from './local';
import { useCoveLocal } from './useCoveLocal';
import { CoveRound } from './CoveRound';
import { GridPreferences, GridAdult } from '../puzzles/grid/preferences';
import { PuzzleBrowser } from './PuzzleBrowser';
import { CoveHome, type ContinueItem } from './CoveHome';
import { StartSheet } from './StartSheet';
import { CoveGrownUps } from './CoveGrownUps';
import { nearestTier, pastelFor, shelfEntries, shelfSections, tierOf, type ShelfTile } from './shelf';

export default function CoveScreen() {
  const store = useStore();
  const active = store.save.cove?.active, epoch = store.epoch, covePerson = store.covePerson;
  // A native Back/swipe or another destination has the same identity boundary as Map.
  // A cleanup captured before a person/restore change is rejected by Store's epoch guard.
  useFocusEffect(useCallback(() => () => { if (active) void covePerson({ type: 'select', id: null }, epoch); }, [active, epoch, covePerson]));
  // Recovery is a flex:1 ScrollView; without flex here it has no height and the screen looks blank.
  if (!store.ready) return <SafeAreaView style={styles.screen}><Text variant="section" style={styles.pad}>Opening Puzzles…</Text></SafeAreaView>;
  if (store.recovery) return <SafeAreaView style={styles.screen}><Recovery/></SafeAreaView>;
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
    else setError('Could not open this person yet. Your saved work is kept.');
    opening.current = false;
  }, [requested, store, done]);
  useEffect(() => { if (requested && !done) void Promise.resolve().then(open); }, [requested, open, done]);
  if (requested && store.save.cove?.people[requested] && store.save.cove.active !== requested && !done) return <SafeAreaView style={styles.screen}><View style={styles.pad}><Text variant="body" accessibilityLiveRegion="polite">{error || 'Opening your saved puzzle…'}</Text>{!!error && <Button label="Try again" onPress={() => void open()}/>}</View></SafeAreaView>;
  return <>{children}</>;
}
function CoveLocalGate() {
  const local = useCoveLocal();
  if (!local.ready) return <SafeAreaView style={styles.screen}><View style={styles.pad}><Text variant="section" accessibilityRole="header">Puzzles</Text><Text variant="body" accessibilityLiveRegion="polite">{local.error || 'Opening Puzzles…'}</Text>{!!local.error && <><Button label="Try again" variant="secondary" target="adult" onPress={local.load}/><Button label="Start fresh · keep a copy" variant="quiet" target="adult" onPress={() => void local.reset()}/></>}</View></SafeAreaView>;
  return <CoveInterior local={local}/>;
}
type Selection = { entry: ChallengeEntry; card: ChallengeCard; replace: boolean; partner: string | null; seq: number };
const schoolOriginals = shelfGames.filter(g => (learningGroups as Partial<Record<string, 'levels' | 'originals'>>)[g.id] === 'originals').map(g => ({ id: g.id, name: g.name }));

function CoveInterior({ local }: { local: ReturnType<typeof useCoveLocal> }) {
  const store = useStore(), owner = selectedOwner(store.save), { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ game?: string }>(), entries = coveEntries(), progress = progressFor(store.save, owner) ?? emptyChallenge();
  const preferences = local.data.people[owner] ?? defaults(), people = solvingPeople(store.save), others = people.filter(p => p.id !== owner), hidden = local.data.hidden;
  const pausedIn = (game: string) => progress.paused.find(s => s.game === game && !s.result && !s.credited);
  // Every registered game resolves here, shelf or not: deep links, Continue and pins never depend on the shelf.
  const linked = entries.find(e => e.game === params.game);
  const [sheet, setSheet] = useState<ChallengeEntry | null>(linked ?? null), [sheetOpen, setSheetOpen] = useState(!!linked), [tier, setTier] = useState(() => linked ? nearestTier(linked, preferences.band) : 1), [partner, setPartner] = useState<string | null>(() => linked ? pausedIn(linked.game)?.partner ?? null : null);
  const [selection, setSelection] = useState<Selection | null>(null), [browse, setBrowse] = useState<{ entry: ChallengeEntry; tier: number } | null>(null);
  const [grownUps, setGrownUps] = useState(false), [adult, setAdult] = useState(false), [dealing, setDealing] = useState(false), [message, setMessage] = useState('');
  const seq = useRef(0);
  const openSheet = (entry: ChallengeEntry) => { setMessage(''); setSheet(entry); setSheetOpen(true); setTier(nearestTier(entry, preferences.band)); setPartner(pausedIn(entry.game)?.partner ?? null); };
  // A link that arrives while Puzzles is already open opens its game's sheet too.
  const [linkedGame, setLinkedGame] = useState(params.game);
  if (params.game !== linkedGame) { setLinkedGame(params.game); if (linked) openSheet(linked); }
  useEffect(() => { if (owner.startsWith('cove-')) void local.change({ type: 'remember-person', owner }); }, [owner]); // eslint-disable-line react-hooks/exhaustive-deps -- Remember explicit identity changes only.
  const owners = people.map(p => p.id).sort().join('|');
  useEffect(() => { void local.change({ type: 'prune', owners: owners.split('|') }); }, [owners]); // eslint-disable-line react-hooks/exhaustive-deps -- Prune only when the actual people change.

  const play = (entry: ChallengeEntry, card: ChallengeCard, replace: boolean, withPerson: string | null = null) => { setSheetOpen(false); setBrowse(null); setMessage(''); setSelection({ entry, card, replace, partner: withPerson, seq: ++seq.current }); };
  /** Packed content is verified before the round mounts; a failure keeps everything and says so calmly. */
  const deal = async (pick: () => Promise<ChallengeCard | undefined>, then: (card: ChallengeCard) => void) => {
    if (dealing) return;
    setDealing(true); setMessage('');
    try { const card = await pick(); if (card) then(card); else setMessage('This puzzle could not open. Your saved work is kept. Try again.'); }
    catch { setMessage('This puzzle could not open. Your saved work is kept. Try again.'); }
    finally { setDealing(false); }
  };
  /** A puzzle this person has not finished at this difficulty, never a hidden one, never `avoid`. */
  const fresh = (entry: ChallengeEntry, at: number, avoid?: PuzzleRef): Promise<ChallengeCard | undefined> => {
    if (entry.packed && !entry.puzzles.length) {
      const bands = entry.packed.bands, band = bands.find(b => b.tier === at && b.bank === avoid?.bank) ?? bands.find(b => b.tier === at) ?? bands.find(b => b.tier === nearestTier(entry, at));
      return band ? dealPacked(entry, band.bank, progress, hidden, avoid) : Promise.resolve(undefined);
    }
    const code = completionLookup(progress, entry), open = entry.puzzles.filter(p => !hidden.includes(p.ref.hash) && !(avoid && sameRef(p.ref, avoid))), level = open.filter(p => p.tier === at);
    return Promise.resolve(level.find(p => !isSolved(code(p.ref))) ?? level[0] ?? open[0] ?? entry.puzzles[0]);
  };
  const start = (entry: ChallengeEntry, at: number, replace: boolean, withPerson: string | null, avoid?: PuzzleRef) => void deal(() => fresh(entry, at, avoid), card => play(entry, card, replace, withPerson));
  /** Continue reopens the exact saved attempt with its own mode and partner. */
  const resume = (entry: ChallengeEntry, saved: ChallengeSession) => {
    const card = cardFor(saved.puzzle, entries);
    if (card) play(entry, card, false, saved.partner);
    else void deal(() => suggestedPacked(entry, progress, tierOf(entry, saved.puzzle) ?? 1, hidden), c => play(entry, c, false, saved.partner));
  };
  const leave = async (next: () => void) => { if (store.save.cove?.active && !await store.covePerson({ type: 'select', id: null }, store.epoch)) { setMessage('Could not leave this person yet. Your saved work is kept.'); return; } next(); };
  const goBack = () => void leave(() => router.canGoBack() ? router.back() : router.replace('/'));
  const openTile = (tile: ShelfTile) => {
    if (tile.kind === 'cove') openSheet(tile.entry);
    // Reef Sweep opens its own Challenge as the current learner, never a Puzzles-only grown-up.
    else if (tile.kind === 'shortcut') void leave(() => router.push(tile.route));
    else void leave(() => openGame(tile.id as ShelfId));
  };
  const favorite = (id: string) => void local.change({ type: 'favorite', game: id });
  const changeBand = (band: number) => void local.change({ type: 'preferences', owner, value: { band } });
  const changePreferences = (value: Partial<Preferences>) => void local.change({ type: 'preferences', owner, value });

  // Today and every new choice draw from the shelf with hidden puzzles taken out first.
  const visibleEntries = shelfEntries(entries).map(e => ({ ...e, puzzles: e.puzzles.filter(p => !hidden.includes(p.ref.hash)) }));
  const sections = shelfSections({ entries, hidden, originals: schoolOriginals, registered: game => !!challengeFor(game) });
  const today = tideTable(civilDate(new Date()), visibleEntries.filter(e => e.puzzles.length || e.packed?.bands.length)).find(p => p.size === 'Medium');
  const onToday = today && (() => { const entry = entries.find(e => e.game === today.entry.game) ?? today.entry; if (today.card) play(entry, today.card, true); else void deal(() => dealPacked(entry, today.bank!, progress, hidden), card => play(entry, card, true)); });
  const continueItems: ContinueItem[] = [
    ...progress.paused.filter(s => !s.result && !s.credited).sort((a, b) => b.ordinal - a.ordinal).flatMap(s => { const entry = entries.find(e => e.game === s.game); return entry ? [{ key: s.id, game: s.game, name: infoFor(s.game).name, pastel: pastelFor(s.game), onPress: () => resume(entry, s) }] : []; }),
    ...(local.data.pins[owner] ?? []).flatMap(pin => {
      const entry = entries.find(e => e.game === pin.ref.engine), card = cardFor(pin.ref, entries), from = people.find(p => p.id === pin.from) ?? { id: pin.from, name: 'Family' };
      return entry && card && !hidden.includes(card.ref.hash) ? [{ key: `pin-${card.ref.hash}`, game: entry.game, name: infoFor(entry.game).name, pastel: pastelFor(entry.game), from, onPress: () => play(entry, card, true), onLongPress: () => void local.change({ type: 'unpin', owner, hash: pin.ref.hash }) }] : [];
    }),
  ];
  const shelf = sections.flatMap(s => s.tiles);
  const favorites = local.data.favorites.flatMap(id => { const tile = shelf.find(t => t.id === id), entry = !tile && entries.find(e => e.game === id); return tile ? [{ ...tile, pastel: pastelFor(id) }] : entry ? [{ kind: 'cove' as const, id, name: infoFor(id).name, entry, pastel: pastelFor(id) }] : []; });

  const saved = selection && pausedIn(selection.entry.game), currentRef = saved?.puzzle ?? selection?.card.ref;
  const status = <>{!!local.error && <View style={styles.status}><Text variant="caption" accessibilityLiveRegion="polite">{local.error}</Text><Button label="Try again" variant="quiet" target="adult" onPress={local.load}/></View>}
    {(dealing || !!message) && <Text variant="caption" accessibilityLiveRegion="polite">{dealing ? 'Opening your puzzle…' : message}</Text>}</>;
  let body: React.ReactNode;
  if (browse) body = <PuzzleBrowser key={`${browse.entry.game}:${browse.tier}`} entry={browse.entry} progress={progress} initialBand={browse.tier} reader={preferences.reader} hidden={hidden} onBack={() => setBrowse(null)} onBand={changeBand} onChoose={card => play(browse.entry, card, true, selection?.partner ?? null)}/>;
  else if (selection) {
    const { entry, card } = selection, at = tierOf(entry, currentRef ?? card.ref) ?? card.tier;
    body = <>{status}<GridAdult.Provider value={adult}><GridPreferences.Provider value={preferences}>
      <CoveRound key={`${entry.game}:${card.ref.hash}:${selection.replace}:${selection.seq}`} entry={entry} card={card} replace={selection.replace} partner={selection.partner} width={Math.min(width, 960) - 2 * theme.space.lg}
        onClose={() => setSelection(null)} onBrowse={() => setBrowse({ entry, tier: at })}
        choices={{
          mistakes: preferences.mistakes, onMistakes: mistakes => changePreferences({ mistakes }),
          onNext: () => start(entry, at, false, selection.partner, card.ref),
          onNew: () => start(entry, at, true, selection.partner, currentRef),
          onKeep: () => { const s = pausedIn(entry.game); if (s) resume(entry, s); else setSelection(null); },
          onSend: (to, ref) => local.change({ type: 'pin', to, pin: { from: owner, ref } }),
          onGrownUps: () => setGrownUps(true),
        }}/>
    </GridPreferences.Provider></GridAdult.Provider></>;
  } else body = <CoveHome sections={sections} continueItems={continueItems} favorites={favorites} isFavorite={id => local.data.favorites.includes(id)} onBack={goBack} onTile={openTile} onFavorite={favorite} onToday={onToday} status={<><SaveStatus/>{status}</>}/>;

  const sheetSaved = sheet ? pausedIn(sheet.game) : undefined;
  return <SafeAreaView style={styles.screen}>
    {body}
    {sheet && <StartSheet entry={sheet} visible={sheetOpen} tier={tier} onTier={t => { setTier(t); changeBand(t); }} saved={sheetSaved} partners={others} partner={partner} onPartner={setPartner}
      favorite={local.data.favorites.includes(sheet.game)} onFavorite={() => favorite(sheet.game)} busy={dealing} onClose={() => setSheetOpen(false)}
      onPlay={() => start(sheet, tier, false, partner)} onContinue={() => sheetSaved && resume(sheet, sheetSaved)} onNew={() => start(sheet, tier, true, partner, sheetSaved?.puzzle)}/>}
    <CoveGrownUps visible={grownUps} onClose={() => setGrownUps(false)} adult={adult} onAdult={() => setAdult(true)} preferences={preferences} onPreferences={changePreferences} error={local.error}
      canHide={!!currentRef} onHide={() => { if (currentRef) void local.change({ type: 'hide', hash: currentRef.hash }).then(ok => { if (ok) { setGrownUps(false); setSelection(null); } }); }}
      hiddenCount={hidden.length} onUnhide={() => void local.change({ type: 'unhide' })}/>
  </SafeAreaView>;
}

/** Plain style objects (React Native accepts them as they are). */
const styles = {
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  pad: { padding: theme.space.xl, gap: theme.space.md },
  status: { gap: theme.space.xs },
} as const;
