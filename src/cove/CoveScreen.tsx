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
import { Button, Sheet, Text, theme } from '../ui';
import { solvingPeople } from './PeoplePicker';
import { cardFor, completionLookup, coveEntries, hiddenIn, infoFor, isSolved, packedOpen, sameRef, suggestedPacked, tideTable } from './catalog';
import { civilDate } from '../puzzles/today';
import { defaults, type Preferences } from './local';
import { useCoveLocal } from './useCoveLocal';
import { CoveRound } from './CoveRound';
import { GridPreferences, GridAdult } from '../puzzles/grid/preferences';
import { PuzzleBrowser } from './PuzzleBrowser';
import { CoveHome, type ContinueItem } from './CoveHome';
import { StartSheet } from './StartSheet';
import { CoveGrownUps } from './CoveGrownUps';
import { nearestTier, pastelFor, playLabel, shelfEntries, shelfSections, tierOf, type ShelfTile } from './shelf';

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
/** A calm line for the sheet or screen that owns the action; `choose` offers Choose a puzzle when a difficulty has nothing new left. */
type Notice = { text: string; choose?: { entry: ChallengeEntry; tier: number } };
const schoolOriginals = shelfGames.filter(g => (learningGroups as Partial<Record<string, 'levels' | 'originals'>>)[g.id] === 'originals').map(g => ({ id: g.id, name: g.name }));
const COULD_NOT_OPEN = 'This puzzle could not open. Your saved work is kept. Try again.';

function CoveInterior({ local }: { local: ReturnType<typeof useCoveLocal> }) {
  const store = useStore(), owner = selectedOwner(store.save), { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ game?: string; resume?: string }>(), entries = coveEntries(), progress = progressFor(store.save, owner) ?? emptyChallenge();
  const preferences = local.data.people[owner] ?? defaults(), people = solvingPeople(store.save), others = people.filter(p => p.id !== owner), hidden = local.data.hidden;
  const pausedIn = (game: string) => progress.paused.find(s => s.game === game && !s.result && !s.credited);
  // Every registered game resolves here, shelf or not: deep links, Continue and pins never depend on the shelf.
  const linked = entries.find(e => e.game === params.game);
  /** An explicit Continue link (`resume=1`) reopens that game's exact paused attempt; a plain game link opens its sheet. */
  const resumable = (entry: ChallengeEntry): Selection | null => { const s = pausedIn(entry.game), c = s && cardFor(s.puzzle, entries); return s && c ? { entry, card: c, replace: false, partner: s.partner, seq: 0 } : null; };
  const [first] = useState(() => linked && params.resume === '1' ? resumable(linked) : null);
  const [sheet, setSheet] = useState<ChallengeEntry | null>(first ? null : linked ?? null), [sheetOpen, setSheetOpen] = useState(!!linked && !first), [tier, setTier] = useState(() => linked ? nearestTier(linked, preferences.band) : 1), [partner, setPartner] = useState<string | null>(() => linked ? pausedIn(linked.game)?.partner ?? null : null);
  const [selection, setSelection] = useState<Selection | null>(first), [browse, setBrowse] = useState<{ entry: ChallengeEntry; tier: number } | null>(null);
  const [grownUps, setGrownUps] = useState(false), [adult, setAdult] = useState(false), [dealing, setDealing] = useState(false), [notice, setNotice] = useState<Notice | null>(null);
  const seq = useRef(0), dealToken = useRef(0);
  /** Closing a sheet or changing its choices cancels an opening deal: a dismissed sheet never opens a board later. */
  const cancelDeal = () => { dealToken.current++; setDealing(false); };
  const openSheet = (entry: ChallengeEntry) => { cancelDeal(); setNotice(null); setSheet(entry); setSheetOpen(true); setTier(nearestTier(entry, preferences.band)); setPartner(pausedIn(entry.game)?.partner ?? null); };
  const closeSheet = () => { cancelDeal(); setNotice(null); setSheetOpen(false); };
  // A link that arrives while Puzzles is already open opens its game too (Continue reopens, a game link shows its sheet).
  const linkKey = `${params.game ?? ''}|${params.resume ?? ''}`, seenLink = useRef(linkKey);
  useEffect(() => {
    if (seenLink.current === linkKey) return;
    seenLink.current = linkKey;
    const again = linked && params.resume === '1' ? resumable(linked) : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- A new route link is an outside event; it opens its game once.
    if (again) { closeSheet(); setSelection({ ...again, seq: ++seq.current }); } else if (linked) openSheet(linked);
  }, [linkKey]); // eslint-disable-line react-hooks/exhaustive-deps -- React to a new link only.
  useEffect(() => { if (owner.startsWith('cove-')) void local.change({ type: 'remember-person', owner }); }, [owner]); // eslint-disable-line react-hooks/exhaustive-deps -- Remember explicit identity changes only.
  const owners = people.map(p => p.id).sort().join('|');
  useEffect(() => { void local.change({ type: 'prune', owners: owners.split('|') }); }, [owners]); // eslint-disable-line react-hooks/exhaustive-deps -- Prune only when the actual people change.

  const play = (entry: ChallengeEntry, card: ChallengeCard, replace: boolean, withPerson: string | null = null) => { cancelDeal(); setSheetOpen(false); setBrowse(null); setNotice(null); setSelection({ entry, card, replace, partner: withPerson, seq: ++seq.current }); };
  /**
   * Packed content is verified before the round mounts. `null` means this difficulty has nothing new to offer, which
   * says so and offers Choose a puzzle; a failure keeps everything and says so calmly. A superseded deal is dropped.
   */
  const deal = async (pick: () => Promise<ChallengeCard | null | undefined>, then: (card: ChallengeCard) => void, empty?: Notice['choose']) => {
    if (dealing) return;
    const token = ++dealToken.current;
    setDealing(true); setNotice(null);
    try {
      const card = await pick();
      if (token !== dealToken.current) return;
      if (card) then(card);
      else setNotice(card === null ? { text: 'No other puzzle here.', choose: empty } : { text: COULD_NOT_OPEN });
    } catch { if (token === dealToken.current) setNotice({ text: COULD_NOT_OPEN }); }
    finally { if (token === dealToken.current) setDealing(false); }
  };
  /**
   * A puzzle this person has not finished at this difficulty, never a hidden one and never `avoid`. Packed games try
   * the preferred bank first, then every other bank at the same difficulty. Every card a chooser returns is checked
   * again before it is offered, so a chooser's own fallback can never reopen a hidden or identical puzzle; with nothing
   * left the answer is `null`, never another difficulty or the paused puzzle. A hidden-row lookup that fails throws.
   */
  const fresh = async (entry: ChallengeEntry, at: number, avoid?: PuzzleRef, prefer = avoid?.bank): Promise<ChallengeCard | null> => {
    const allowed = (c: ChallengeCard | undefined): c is ChallengeCard => !!c && c.tier === at && !hidden.includes(c.ref.hash) && !(avoid && sameRef(c.ref, avoid));
    if (!entry.packed || entry.puzzles.length) {
      const code = completionLookup(progress, entry), level = entry.puzzles.filter(allowed);
      return level.find(p => !isSolved(code(p.ref))) ?? level[0] ?? null;
    }
    const packed = entry.packed, opener = packedOpen(entry), bands = packed.bands.filter(b => b.tier === at).sort((a, b) => Number(b.bank === prefer) - Number(a.bank === prefer));
    for (const band of bands) {
      const skip = await hiddenIn(entry, band.bank, hidden);
      if (skip.size >= band.count) continue;
      const ref = skip.size && opener?.chooseVisible ? await opener.chooseVisible(band.bank, progress, skip, avoid) : await packed.choose(band.bank, progress, avoid), next = packed.card(ref);
      if (allowed(next)) return next;
    }
    return null;
  };
  const start = (entry: ChallengeEntry, at: number, replace: boolean, withPerson: string | null, avoid?: PuzzleRef) => void deal(() => fresh(entry, at, avoid), card => play(entry, card, replace, withPerson), { entry, tier: at });
  /** Continue reopens the exact saved attempt with its own mode and partner, hidden or not. */
  const resume = (entry: ChallengeEntry, saved: ChallengeSession) => {
    const card = cardFor(saved.puzzle, entries);
    if (card) play(entry, card, false, saved.partner);
    else void deal(() => suggestedPacked(entry, progress, tierOf(entry, saved.puzzle) ?? 1, hidden), c => play(entry, c, false, saved.partner));
  };
  const choose = (entry: ChallengeEntry, at: number) => { closeSheet(); setBrowse({ entry, tier: at }); };
  const leave = async (next: () => void) => { if (store.save.cove?.active && !await store.covePerson({ type: 'select', id: null }, store.epoch)) { setNotice({ text: 'Could not leave this person yet. Your saved work is kept.' }); return; } next(); };
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
  const onToday = today && (() => {
    const entry = entries.find(e => e.game === today.entry.game) ?? today.entry, at = entry.packed?.bands.find(b => b.bank === today.bank)?.tier;
    if (today.card) play(entry, today.card, true);
    else if (at) void deal(() => fresh(entry, at, undefined, today.bank), card => play(entry, card, true), { entry, tier: at });
  });
  // Every paused puzzle and every pin, newest pause first. A pin resolves by its exact ref across the whole registry,
  // even when that puzzle is hidden from new choices or its game is not on the shelf.
  const continueItems: ContinueItem[] = [
    ...progress.paused.filter(s => !s.result && !s.credited).sort((a, b) => b.ordinal - a.ordinal).flatMap(s => { const entry = entries.find(e => e.game === s.game); return entry ? [{ key: s.id, game: s.game, name: infoFor(s.game).name, pastel: pastelFor(s.game), onPress: () => resume(entry, s) }] : []; }),
    ...(local.data.pins[owner] ?? []).flatMap(pin => {
      const entry = entries.find(e => e.game === pin.ref.engine), card = cardFor(pin.ref, entries), from = people.find(p => p.id === pin.from) ?? { id: pin.from, name: 'Family' };
      return entry && card ? [{ key: `pin-${card.ref.hash}`, game: entry.game, name: infoFor(entry.game).name, pastel: pastelFor(entry.game), from, onPress: () => play(entry, card, true), onLongPress: () => void local.change({ type: 'unpin', owner, hash: pin.ref.hash }) }] : [];
    }),
  ];
  const shelf = sections.flatMap(s => s.tiles);
  const favorites = local.data.favorites.flatMap(id => { const tile = shelf.find(t => t.id === id), entry = !tile && entries.find(e => e.game === id); return tile ? [{ ...tile, pastel: pastelFor(id) }] : entry ? [{ kind: 'cove' as const, id, name: infoFor(id).name, entry, pastel: pastelFor(id) }] : []; });

  const saved = selection && pausedIn(selection.entry.game), currentRef = saved?.puzzle ?? selection?.card.ref;
  const noticeLine = (dealing || !!notice) && <View style={styles.status}>
    <Text variant="caption" accessibilityLiveRegion="polite">{dealing ? 'Opening your puzzle…' : notice!.text}</Text>
    {!dealing && notice?.choose && <Button label="Choose a puzzle" variant="quiet" target="adult" onPress={() => choose(notice.choose!.entry, notice.choose!.tier)}/>}
  </View>;
  // While the start sheet is up, its own status line speaks for it; the screen behind stays quiet.
  const status = <>{!!local.error && <View style={styles.status}><Text variant="caption" accessibilityLiveRegion="polite">{local.error}</Text><Button label="Try again" variant="quiet" target="adult" onPress={local.load}/></View>}
    {!sheetOpen && noticeLine}</>;
  let body: React.ReactNode;
  if (selection) {
    const { entry, card } = selection, at = tierOf(entry, currentRef ?? card.ref) ?? card.tier;
    // The round stays mounted under Choose a puzzle, so closing the chooser returns to exactly what was there.
    body = <>{status}<GridAdult.Provider value={adult}><GridPreferences.Provider value={preferences}>
      <CoveRound key={`${entry.game}:${card.ref.hash}:${selection.replace}:${selection.seq}`} entry={entry} card={card} replace={selection.replace} partner={selection.partner} width={Math.min(width, 960) - 2 * theme.space.lg}
        onClose={() => setSelection(null)} onBrowse={() => setBrowse({ entry, tier: at })} choosing={!!browse}
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
  const savedLabel = sheet && sheetSaved ? [playLabel(sheet, sheetSaved.puzzle, tierOf(sheet, sheetSaved.puzzle) ?? 1), sheetSaved.partner ? `with ${people.find(p => p.id === sheetSaved.partner)?.name ?? 'family'}` : 'On my own'].filter(Boolean).join(' · ') : undefined;
  return <SafeAreaView style={styles.screen}>
    {body}
    {sheet && <StartSheet entry={sheet} visible={sheetOpen} tier={tier} onTier={t => { cancelDeal(); setNotice(null); setTier(t); changeBand(t); }} saved={sheetSaved} savedLabel={savedLabel} partners={others} partner={partner} onPartner={p => { cancelDeal(); setNotice(null); setPartner(p); }}
      favorite={local.data.favorites.includes(sheet.game)} onFavorite={() => favorite(sheet.game)} busy={dealing} onClose={closeSheet}
      status={dealing ? 'Opening your puzzle…' : notice?.text} onChoose={!dealing && notice?.choose ? () => choose(notice.choose!.entry, notice.choose!.tier) : undefined}
      onPlay={() => start(sheet, tier, false, partner)} onContinue={() => sheetSaved && resume(sheet, sheetSaved)} onNew={() => start(sheet, tier, true, partner, sheetSaved?.puzzle)}/>}
    {/* Choose a puzzle: a large sheet of its own over whatever is open (a round stays mounted under it). */}
    <Sheet mode="large" visible={!!browse} title="Choose a puzzle" onClose={() => setBrowse(null)}>
      {browse && <PuzzleBrowser key={`${browse.entry.game}:${browse.tier}`} entry={browse.entry} progress={progress} initialBand={browse.tier} reader={preferences.reader} hidden={hidden} onBand={changeBand} onChoose={card => play(browse.entry, card, true, selection?.partner ?? null)}/>}
    </Sheet>
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
