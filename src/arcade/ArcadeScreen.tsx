import { terminalBelongs } from './terminal';
import { DareChoice, DareResult } from './DareCard';
import { arcadeDare, daresFor, dareMet } from './dares';
import { dareMarked } from './saveAction';
import { learningComfort } from '../state/validation';
import { BadgeResultCard } from '../badges/ResultCard';
import { theme } from '../ui/theme';
import { useNunitoLoaded } from '../ui/fonts';
import { Companion } from "../islander/Companion";
import { LearnerChip } from "../personalization/LearnerChip";
import { bestLabel, freePlayBest, nextStarGoal } from "./presentation";
import { ShellMedal } from "./games/fruit-bat-flight/Art";
import { FLIGHT_CHROME_TINT } from "./games/fruit-bat-flight/presentation";
import type { ReefState } from "./games/reef-builder/engine";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, TextInput, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { newMatch, settle } from "../games/match";
import { FamilySetup, type ArcadeFamily } from "./FamilySetup";
import { PlayScene } from "./PlayScene";
import { PlayTeaching } from "./PlayTeaching";
import { router } from "expo-router";
import { Button, Chip, Copy, Heading, IconButton, PressableScale, Sheet, ToggleRow, styles } from "../components/ui";
import { Settings } from "../components/Settings";
import { LARGE_TEXT, wordFitMultiplier } from "../components/wordFit";
import { TextFit, entryRegion } from "../components/Text";
import { SaveStatus } from "../components/SaveStatus";
import { Icon } from "../components/Icon";
import Svg, { Rect } from "react-native-svg";
import { ArcadeScene } from "./Scene";
import { Hero, StarReveal } from "./Juice";
import { ChestArt } from "./TreasureArt";
import { activeLearner } from "../learn/learners";
import { useStore } from "../state/Store";
import { GameIcon } from "../components/GameIcon";
import { ArcadeIsland, StarDisplay } from "./Art";
import { TreasureChest } from "./Chest";
import { OutfitCloset, StickerBook } from "./Collection";
import { LevelMap } from "./LevelMap";
import { Teaching } from "./Teaching";
import { useArcadeAudio } from "./audio";
import { acknowledgeArcadeBreak, arcadeBreakDue, markArcadePlaying } from "./breakClock";
import { useArcadeForeground } from "./loop";
import { arcadeShelfGames } from "./registry";
import { arcadePlays } from "./plays";
import { arcadeLearner, gameProgress, levelOpen, endlessOpen, reefSessionHelped, withReefHelp, type ChestOffer } from "./progress";
import { allLevelIds, type ArcadeGame, type ArcadeLevel, type ArcadeResult, type LevelId, starCount } from "./types";

const lobbyPaper = "#FFFDF7";
const lobbyBorder = "#E4D5BF";
const lobbyInk = theme.colors.frame;
const lobbyCard = {
  backgroundColor: lobbyPaper,
  borderRadius: 28,
  borderWidth: 1,
  borderColor: lobbyBorder,
  boxShadow: "0 4px 0 rgba(61, 43, 36, 0.16), 0 8px 18px rgba(61, 43, 36, 0.12)",
};

const SHELL_BG = "#FFF6E5";
const SHELL_PAPER = "#FFFDF8";
const SHELL_CREAM = "#FFF8EC";
const SHELL_BORDER = "#E8D8BE";
const SHELL_INK = theme.colors.frame;
const SHELL_MUTED = "#6A5246";
const SHELL_CORAL = theme.colors.coral;
const SHELL_LAGOON = theme.colors.lagoon;
const SHELL_CARD_SHADOW = "0 6px 0 rgba(61, 43, 36, 0.12), 0 12px 24px rgba(61, 43, 36, 0.08)";

/**
 * Who is playing, and their stickers. A valid name can be 24 wide letters, wider than a phone's line, so the name keeps to one
 * line in its column and ends in an ellipsis rather than breaking mid-word; the full sentence stays in the spoken label.
 * At accessibility sizes the sticker count sits on its own line under the name.
 */
function LearnerSentence({ name, stickers, large }: { name: string; stickers: number; large: boolean }) {
  const words = `${stickers} island stickers`;
  return <View testID="arcade-learner" accessible accessibilityRole="text" accessibilityLabel={`${name} · ${words}`} style={{ flexDirection: large ? "column" : "row", alignItems: large ? "stretch" : "center", maxWidth: "100%", backgroundColor: lobbyPaper, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: lobbyBorder }}>
    <Copy numberOfLines={1} style={{ color: lobbyInk, flexShrink: 1 }}>{name}</Copy><Copy style={{ color: lobbyInk, flexShrink: 0 }}>{large ? words : ` · ${words}`}</Copy>
  </View>;
}

export function ArcadeLobby({ nunitoLoaded = false }: { nunitoLoaded?: boolean }) {
  const store = useStore(), learner = activeLearner(store.save.learning), person = arcadeLearner(store.save.arcade, learner.id);
  const [sheet, setSheet] = useState<"book" | "settings" | null>(null);
  const lobbyHeading = nunitoLoaded
    ? { fontFamily: theme.fontFamily["800"], fontWeight: "normal", color: lobbyInk } as const
    : { fontWeight: "800", color: lobbyInk } as const;
  // At accessibility sizes the lobby's words stop at 1.5x and fit their line; each world's card stacks its picture over its words.
  const { width, fontScale } = useWindowDimensions(), large = fontScale >= LARGE_TEXT, line = Math.min(width, 1000) - 40;
  // On a narrow row the title starts below the favorite button, retaining the full width beside the art.
  const compactRow = !large && line < 380;
  return <TextFit.Provider value={entryRegion(fontScale, line)}>
    <View style={{ flex: 1, backgroundColor: "#FFF4DE" }}>
      <View pointerEvents="none" style={{ position: "absolute", inset: 0, opacity: 0.28 }}>
        <ArcadeScene game="reef-builder" active={!sheet}/>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { padding: 20, gap: 20, maxWidth: 1000 }]}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
          <Button quiet compact icon="back" onPress={() => router.replace("/")}>Home</Button>
          <Button quiet compact onPress={() => setSheet("settings")}>Settings</Button>
        </View>
        <View style={{ alignItems: "center", gap: 8 }}>
          <ArcadeIsland size={166}/>
          <Heading style={{ ...lobbyHeading, fontSize: 38, textAlign: "center" }}>Island Arcade</Heading>
          <Copy style={{ color: lobbyInk, textAlign: "center" }}>Pick a world. Let’s play.</Copy>
          <LearnerSentence name={learner.name} stickers={person.stickers.length} large={large}/>
        </View>
        <SaveStatus/>
        <TextFit.Provider value={entryRegion(fontScale, line - 64)}>
          {arcadeShelfGames().map(game => {
            const favorite = (store.save.favoriteGames ?? []).includes(game.id);
            const { stars } = gameProgress(person, game.id);
            const starredLevels = Object.keys(stars);
            const explored = game.worlds.filter(world => starredLevels.some(level => level.startsWith(`${world.id}-`))).length;
            const earned = starCount(stars);
            return <View key={game.id} style={lobbyCard}>
              <PressableScale accessibilityRole="button" accessibilityLabel={`Play ${game.name}, open level map`}
                onPress={() => router.push({ pathname: "/arcade", params: { game: game.id } })}
                style={{ padding: 18, gap: 14, borderRadius: 28, flexDirection: large ? "column" : "row", alignItems: "center" }}>
                <GameIcon id={game.id} size={120}/>
                <View style={[{ gap: 6, minWidth: 0 }, large ? { alignSelf: "stretch" } : { flex: 1 }, compactRow && { paddingTop: 38 }]}>
                  <Heading style={{ ...lobbyHeading, fontSize: 25, paddingRight: large || compactRow ? 0 : 48 }}>{game.name}</Heading>
                  <Copy style={{ color: lobbyInk }}>{game.tagline}</Copy>
                  <Copy style={{ alignSelf: "flex-start", maxWidth: "100%", backgroundColor: "#F6EDDC", borderRadius: 14,
                    paddingHorizontal: 10, paddingVertical: 5, color: lobbyInk, fontSize: 14, lineHeight: 19, fontWeight: "700" }}>
                    {`${earned} ${earned === 1 ? "star" : "stars"} · ${explored}/${game.worlds.length} worlds explored`}
                  </Copy>
                  <Copy style={{ fontSize: 17, color: game.color, fontWeight: "800" }}>Let’s play →</Copy>
                </View>
              </PressableScale>
              <View style={{ position: "absolute", right: 10, top: 10 }}>
                <IconButton label={`${favorite ? "Remove favorite" : "Favorite"} ${game.name}`}
                  icon={favorite ? "star-filled" : "star"} selected={favorite} onPress={() => store.toggleGameFavorite(game.id)}/>
              </View>
            </View>;
          })}
        </TextFit.Provider>
        <Button quiet onPress={() => setSheet("book")}>Open my sticker book</Button>
        <Copy style={{ textAlign: "center", fontSize: 13, color: lobbyInk }}>No timers to wait for. No purchases. Your own little island.</Copy>
      </ScrollView>
      <Sheet visible={sheet === "book"} title="Sticker book" onClose={() => setSheet(null)}><StickerBook person={person}/></Sheet>
      <Settings visible={sheet === "settings"} onClose={() => setSheet(null)}/>
    </View>
  </TextFit.Provider>;
}

export function ArcadeGameScreen({ game, debug = false }: { game: ArcadeGame; debug?: boolean }) {
  const nunitoLoaded = useNunitoLoaded();
  const headingFace = nunitoLoaded
    ? ({ fontFamily: theme.fontFamily["800"], fontWeight: "normal" } as const)
    : ({ fontWeight: "800" } as const);
  const titleFace = nunitoLoaded
    ? ({ fontFamily: theme.fontFamily["700"], fontWeight: "normal" } as const)
    : ({ fontWeight: "700" } as const);
  const { width, height, fontScale } = useWindowDimensions(), insets = useSafeAreaInsets(), play = arcadePlays[game.id];
  const [headerHeight, setHeaderHeight] = useState(62);
  const [arena, setArena] = useState({ width: width - insets.left - insets.right, height: height - insets.top - insets.bottom - 62 });
  const store = useStore(), owner = activeLearner(store.save.learning), expected = useMemo(() => ({ epoch: store.epoch, learner: owner.id }), [store.epoch, owner.id]);
  const person = arcadeLearner(store.save.arcade, owner.id), p = gameProgress(person, game.id), foreground = useArcadeForeground();
  const comfort = learningComfort(store.save, owner.id), marked = (slot: number) => dareMarked(store.save, owner.id, slot);
  const [level, setLevel] = useState<ArcadeLevel | "endless" | null>(null), [playing, setPlaying] = useState(false), [paused, setPaused] = useState(false);
  const [sheet, setSheet] = useState<"book" | "outfits" | "settings" | "teach" | "chest" | "leave" | null>(null), [result, setResult] = useState<ArcadeResult | null>(null);
  const [savedReef, setSavedReef] = useState<ReefState | undefined>(undefined);
  const [round, setRound] = useState(""), [seed, setSeed] = useState(1), [name, setName] = useState(owner.id === "family" ? store.save.players?.[0] ?? "Family" : owner.name);
  const [mode, setMode] = useState<ArcadeFamily["mode"]>("solo"), [strength, setStrength] = useState<ArcadeFamily["strength"]>("gentle");
  const [match, setMatch] = useState(() => newMatch(store.save.players));
  const together = !!play.familyMatch && mode === "together";
  const family: ArcadeFamily = { mode, strength, names: together ? match.names : [name, { gentle: "Bibi", steady: "Bibi ••", zippy: "Bibi •••" }[strength]] };
  const helperUsed = useRef(person.helper);
  const startAfterTeach = useRef(false), credited = useRef(""), [reminder, setReminder] = useState(false), scroll = useRef<ScrollView>(null);
  const [finishError, setFinishError] = useState(""), [invalidResult,setInvalidResult]=useState(false);
  const failedResult = useRef<{ result: ArcadeResult; helped: boolean; winner?: 0 | 1 | null } | null>(null);
  const [chestOffer, setChestOffer] = useState<ChestOffer | null>(null);
  const identity = `${owner.id}:${store.epoch}`;
  const lastIdentity = useRef(identity), liveRound = useRef('');
  // The launch descriptor's dare: chosen before Start, bound to the round, never saved mid-round (except inside a paused reef).
  const [dare, setDare] = useState<number | null>(null), launchDare = useRef<number | null>(null), [roundDare, setRoundDare] = useState<number | null>(null);
  useEffect(() => {
    if (lastIdentity.current === identity) return;
    lastIdentity.current = identity; liveRound.current = ''; launchDare.current = null; setDare(null); setRoundDare(null);
    // Invalidate the old round without closing Settings or moving the map.
    setPlaying(false); setPaused(false); setResult(null); setRound(""); setLevel(null);
    startAfterTeach.current = false; credited.current = ""; failedResult.current = null; setFinishError("");
    setSheet(current => current === "settings" ? current : null);
    setSavedReef(undefined); setChestOffer(null);
    setName(owner.id === "family" ? "Family" : owner.name);
  }, [identity, owner.id, owner.name]);
  function openChest() { if (person.chest?.game !== game.id) return; setChestOffer(person.chest); setSheet("chest"); }
  function closeChest() { setSheet(null); setChestOffer(null); }
  const active = foreground && playing && !paused && !sheet && !finishError, sound = useArcadeAudio(game.id, store.save.settings, store.save.arcade?.music ?? false, foreground && !paused, !!sheet);
  useEffect(() => { markArcadePlaying(active); return () => markArcadePlaying(false); }, [active]);
  const { arcade } = store;
  useEffect(() => {
    if (!playing || !person.helper) return;
    helperUsed.current = true;
    // Helper switched on from the pause sheet reaches no reef move, so mark the saved round helped now.
    const session = person.session;
    if (session && session.round === liveRound.current && !session.state.helped) arcade({ type: "save-round", session: { ...session, state: withReefHelp(session.state, true) } }, expected);
    // Only a change of Helper or play state latches; the session is read fresh each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, person.helper]);
  useEffect(() => { arcade({ type: "visit", game: game.id }, expected); }, [arcade, expected, game.id]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Latch a visible pause after external focus/background loss; returning never silently resumes a round.
  useEffect(() => { if (playing && !foreground) setPaused(true); }, [playing, foreground]);
  function toTop() { scroll.current?.scrollTo({ y: 0, animated: false }); }
  function choose(id: LevelId | "endless") {
    liveRound.current = ''; setDare(null);
    if (id === "endless" ? !endlessOpen(p) : !levelOpen(p, id)) return;
    setLevel(id === "endless" ? id : play.level(id)); setResult(null); setPlaying(false); setPaused(false); setSheet(null); toTop();
  }
  function start() {
    if (lastIdentity.current !== identity || !level || (level === 'endless' ? !endlessOpen(p) : !levelOpen(p,level.id))) {
      startAfterTeach.current = false; setLevel(null); setSheet(null); return;
    }
    failedResult.current = null; setFinishError('');
    // eslint-disable-next-line react-hooks/purity -- This user-invoked Start handler creates round entropy, never called by render.
    const round = `arcade-${Date.now().toString(36)}-${Math.floor(Math.random() * 0x1000000).toString(36)}`;
    // eslint-disable-next-line react-hooks/purity -- User-invoked Start handler, not a render calculation.
    const nextSeed = Math.floor(Math.random() * 0x100000000);
    liveRound.current = round;
    // Dares are personal marks: none in a two-player match, and young-child mode hides them.
    launchDare.current = !together && !comfort.youngChild && dare !== null && level !== "endless" && arcadeDare(dare)?.level === level.id ? dare : null; setRoundDare(launchDare.current);
    setSavedReef(undefined); setRound(round); setSeed(nextSeed === seed ? (seed + 1) >>> 0 : nextSeed); setResult(null); setPaused(false); setPlaying(true); setSheet(null);
    helperUsed.current = person.helper;
    if (together) setMatch(previous => ({ ...previous, names: newMatch(previous.names).names }));
    if (level === "endless" || play.familyMatch) store.rememberPlayers(together ? newMatch(match.names).names : [name]);
    sound.say((play.startSpeech ?? play.speech)(level !== "endless" && level?.world === "learn", together)); toTop();
  }
  const onSaveReef = useCallback((state: ReefState) => {
    if (round) arcade({ type: "save-round", session: { version: 1, game: "reef-builder", round, state: withReefHelp(state, helperUsed.current), ...(launchDare.current !== null && liveRound.current === round ? { dare: launchDare.current } : {}) } }, expected);
  }, [arcade, round, expected]);
  function resumeReef() {
    const session = person.session;
    if (!session || session.game !== game.id) return;
    liveRound.current = session.round; launchDare.current = session.dare ?? null; setDare(session.dare ?? null); setRoundDare(session.dare ?? null);
    setSavedReef(session.state); setRound(session.round); setLevel(session.state.level);
    helperUsed.current = reefSessionHelped(session);
    setResult(null); setPaused(false); setPlaying(true); setSheet(null); toTop();
  }
  function teach(andStart: boolean) { startAfterTeach.current = andStart; setSheet("teach"); sound.say(play.speech(level !== "endless" && level?.world === "learn", together)); }
  const onResult = useCallback((next: ArcadeResult, helped = false, winner?: 0 | 1 | null) => {
    if (lastIdentity.current !== `${expected.learner}:${expected.epoch}` || !level || !round || liveRound.current!==round || credited.current === round) return;
    if (!terminalBelongs(liveRound.current,round,next)) { setInvalidResult(true); failedResult.current=null; setPaused(true); setFinishError("This result could not be checked. Return to the level map to start another round. Your earned progress is kept."); return; }
    setInvalidResult(false);
    if (!arcade({ type: "finish", game: game.id, level: level === "endless" ? level : level.id, stars: next.cleared ? next.stars : 0, score: next.score, round, name: together ? match.names.join(" & ").slice(0, 24) : name, ...(launchDare.current !== null ? { dare: launchDare.current, helped: helped || helperUsed.current } : {}), ...(next.facts ? { facts: next.facts } : {}) }, expected)) {
      failedResult.current = { result: next, helped, winner }; setPaused(true);
      setFinishError("Your result could not be saved. Keep this round open and try again, or return to your map."); return;
    }
    credited.current = round; failedResult.current = null; setFinishError('');
    if (together && winner != null) setMatch(previous => settle(previous, winner));
    if (level !== "endless" && level.world === "learn" && next.cleared) {
      const credit = play.learningSkill(level);
      if (credit) {
        const { skill, config } = credit, assisted = helped || helperUsed.current;
        store.recordWarmup([{ skill, helped: assisted }], config, round, expected.epoch); store.notePractice(skill, assisted, expected.epoch);
      }
    }
    if (game.id !== "fruit-bat-flight" || next.outcome === "stopped") sound.tone(next.cleared ? "clear" : "shell-0");
    setReminder(arcadeBreakDue(store.save.arcade?.breakMinutes ?? 0)); setResult(next); setPlaying(false); setPaused(false); toTop();
    // Store entry points are stable; these snapshots deliberately bind a result to this exact owned round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arcade, game.id, level, round, name, expected, together, match.names, play]);
  const isLearning = !!level && level !== "endless" && level.world === "learn", levels = play.levels;
  const nextId = level && level !== "endless" ? allLevelIds[allLevelIds.indexOf(level.id) + 1] : undefined;
  const nextOpen = nextId && levelOpen(p, nextId);
  const goal = level ? play.goal?.(level, together) ?? (level === "endless" ? "Make it your own." : level.goals[0]) : "";
  const onTeachPlay = () => { if (lastIdentity.current !== identity) return; arcade({ type: "coached", game: game.id }, expected); if (startAfterTeach.current) start(); else setSheet(null); };
  const onHear = () => sound.say(play.speech(isLearning, together));
  // Crab and Lagoon draw under a translucent header and place their HUDs below its measured height.
  // Header and start-dock text stop growing at 2x: at the largest sizes they otherwise fill the screen and leave the
  // start card, with its Helper and Dare choices, only a sliver to scroll in.
  // A wider start card in landscape wraps large text into fewer lines, so Helper and the Dare are fewer scrolls away.
  const cardMax = width > height ? 640 : 480;
  // In landscape at large text the hero would fill most of the short scroll window above the card.
  const cardHero = width > height && fontScale >= 2 ? 72 : 108;
  const overlaid = (game.id === "crab-crossing" || game.id === "lagoon-run") && playing, headerTextMax = 2;
  const flightChrome = playing && game.id === "fruit-bat-flight";
  const lagoonGame = game.id === "lagoon-run", lagoonChrome = playing && lagoonGame;
  const darkOverlayHeader = overlaid || lagoonChrome;
  const headerBg = lagoonChrome ? "#204946CE" : overlaid ? "#173D4AAA" : flightChrome ? FLIGHT_CHROME_TINT : SHELL_BG;
  const headerInk = darkOverlayHeader ? "#FFFDF8" : flightChrome ? "#173D3A" : SHELL_INK;
  const headerSubInk = darkOverlayHeader ? "#EBF6F2" : flightChrome ? "#47645D" : SHELL_MUTED;
  const board = level && playing ? <play.Board key={round} savedReef={savedReef} onSaveReef={onSaveReef} level={level} seed={seed} helper={person.helper} active={active} outfit={p.outfit} onResult={onResult} onTone={sound.tone} onSay={sound.say} debug={debug || (__DEV__ && !flightChrome)} {...arena} overlayTop={overlaid ? headerHeight : 0} overlayInsets={lagoonChrome ? insets : undefined} family={family}/> : null;
  const showNextPrimary = !!(nextOpen && result?.cleared);

  return <View style={[{ flex: 1, backgroundColor: playing ? game.color : SHELL_BG }, lagoonGame && !playing && {
    paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right,
  }]}>
    {playing && !flightChrome && <PlayScene Scene={play.Scene} game={game.id} world={level && level !== "endless" ? level.world : "w1"} active={foreground && !paused && !sheet}/>}

    {/* Clean Sunlit Floating Header */}
    <View
      testID="arcade-header"
      onLayout={overlaid ? event => { const next = Math.ceil(event.nativeEvent.layout.height); setHeaderHeight(previous => previous === next ? previous : next); } : undefined}
      style={[
        {
          paddingHorizontal: 14,
          paddingVertical: 8,
          gap: 8,
          backgroundColor: headerBg,
          borderBottomWidth: darkOverlayHeader || flightChrome ? 0 : 1,
          borderBottomColor: "#EFE2CB",
        },
        overlaid && { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
        lagoonChrome && {
          paddingTop: 8 + insets.top,
          paddingLeft: 14 + insets.left,
          paddingRight: 14 + insets.right,
        },
      ]}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={level ? "Map" : "Arcade"}
          onPress={() => { if (playing) setSheet("leave"); else if (level) { setLevel(null); setResult(null); toTop(); } else router.replace("/arcade"); }}
          style={{
            minWidth: 44,
            minHeight: 44,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: flightChrome ? "#F2E6D6" : SHELL_PAPER,
            borderWidth: 1.5,
            borderColor: darkOverlayHeader ? "rgba(255, 253, 248, 0.45)" : SHELL_BORDER,
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 0 rgba(61, 43, 36, 0.1)",
          }}
        >
          <Icon name="back" color={SHELL_INK} />
        </PressableScale>

        <View style={{ flex: 1, alignItems: "center" }}>
          <Heading maxFontSizeMultiplier={headerTextMax} style={{ ...headingFace, fontSize: playing ? 17 : 19, color: headerInk, textAlign: "center" }}>
            {game.name}
          </Heading>
          {playing && (
            <Copy maxFontSizeMultiplier={headerTextMax} style={[{ color: headerSubInk, fontSize: 12, lineHeight: 16, textAlign: "center" }]}>
              {level === "endless" ? "Free play" : `${game.worlds.find(w => w.id === level?.world)?.name ?? ""} · Level\u00a0${level?.index}${roundDare !== null ? `\u00a0· Dare: ${arcadeDare(roundDare)?.title ?? ""}` : ""}`}
            </Copy>
          )}
        </View>

        {playing ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Pause"
            onPress={() => setPaused(true)}
            style={{
              minWidth: 44,
              minHeight: 44,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: flightChrome ? "#F2E6D6" : SHELL_PAPER,
              borderWidth: 1.5,
              borderColor: darkOverlayHeader ? "rgba(255, 253, 248, 0.45)" : SHELL_BORDER,
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 0 rgba(61, 43, 36, 0.1)",
            }}
          >
            <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}>
              <Rect x={5} y={4} width={5} height={16} rx={2} fill={SHELL_INK} />
              <Rect x={14} y={4} width={5} height={16} rx={2} fill={SHELL_INK} />
            </Svg>
          </PressableScale>
        ) : (
          <Button
            quiet
            compact
            maxFontSizeMultiplier={headerTextMax}
            onPress={() => setSheet("settings")}
            style={{
              minHeight: 44,
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 8,
              backgroundColor: SHELL_PAPER,
              borderWidth: 1.5,
              borderColor: SHELL_BORDER,
              boxShadow: "0 2px 0 rgba(61, 43, 36, 0.08)",
            }}
            textStyle={{ color: SHELL_INK, fontSize: 14, fontWeight: "700" }}
          >
            Settings
          </Button>
        )}
      </View>
    </View>

    {!!finishError && !paused && <View style={{ padding: 12, gap: 8, backgroundColor: "#FFF5D8", borderBottomWidth: 1, borderBottomColor: SHELL_BORDER }}><Copy style={{ color: SHELL_INK }}>{finishError}</Copy><Button onPress={() => setPaused(true)}>{invalidResult ? 'Result options' : 'Save my result'}</Button></View>}

    {playing ? <View testID="arcade-arena" style={{ flex: 1, minHeight: 0, overflow: "hidden" }} onLayout={event => {
      const { width, height } = event.nativeEvent.layout;
      setArena(previous => previous.width === width && previous.height === height ? previous : { width, height });
    }}><SaveStatus/>{board}</View> : <ScrollView ref={scroll} contentContainerStyle={{ flexGrow: 1, width: "100%", paddingTop: 10, paddingBottom: 24, gap: 12 }}>
      <SaveStatus/>
      {!level ? <>
        {person.session?.game === game.id && (
          <View style={{ paddingHorizontal: 16, maxWidth: 740, width: "100%", alignSelf: "center", gap: 6 }}>
            <View style={{ backgroundColor: SHELL_PAPER, borderRadius: 24, borderWidth: 1.5, borderColor: SHELL_BORDER, padding: 16, gap: 8, boxShadow: SHELL_CARD_SHADOW }}>
              <Button onPress={resumeReef} style={{ backgroundColor: SHELL_CORAL, borderColor: "#D95D42", borderRadius: 18, boxShadow: "0 4px 0 #C8573D" }} textStyle={{ ...headingFace, color: SHELL_INK, fontSize: 17 }}>
                Continue saved Reef Builder round
              </Button>
              <Copy style={{ color: SHELL_MUTED, textAlign: "center", fontSize: 14 }}>Your reef, pieces and moves are saved.</Copy>
            </View>
          </View>
        )}
        <LevelMap
          learnerChip={<LearnerChip/>}
          game={game}
          person={person}
          levels={levels}
          onLevel={choose}
          onOutfits={() => setSheet("outfits")}
          onChest={openChest}
          freeBest={freePlayBest(store.save.arcade, game.id)}
          active={foreground && !sheet}
          Scene={play.Scene}
          worldNote={play.worldNote}
          dareMark={comfort.youngChild ? undefined : id => { const own = daresFor(game.id, id); return !own.length ? null : own.some(d => marked(d.slot)) ? "earned" : "open"; }}
        />
        <View style={{ paddingHorizontal: 16, gap: 12, maxWidth: 740, width: "100%", alignSelf: "center" }}>
          <Button
            quiet
            onPress={() => setSheet("book")}
            style={{ backgroundColor: SHELL_PAPER, borderColor: SHELL_BORDER, borderWidth: 1.5, borderRadius: 22, minHeight: 50, boxShadow: "0 3px 0 rgba(61, 43, 36, 0.08)" }}
            textStyle={{ color: SHELL_INK, fontSize: 16, fontWeight: "800" }}
          >
            My sticker book
          </Button>
          {!!store.save.arcade?.scores.some(s => s.game === game.id) && (
            <View style={{ padding: 18, gap: 8, borderRadius: 24, backgroundColor: SHELL_PAPER, borderWidth: 1.5, borderColor: SHELL_BORDER, boxShadow: SHELL_CARD_SHADOW }}>
              <Heading style={{ ...headingFace, fontSize: 21, color: SHELL_INK }}>Family free-play board</Heading>
              {store.save.arcade.scores.filter(s => s.game === game.id).sort((a, b) => b.score - a.score).map(s => (
                <Copy key={s.name} style={{ color: SHELL_INK, fontWeight: "700" }}>{s.name} · {s.score} points</Copy>
              ))}
            </View>
          )}
        </View>
      </> : result ? (
        /* Elevated Warm Storybook Result Screen */
        <View testID="arcade-result-screen" style={{ flex: 1, minHeight: Math.max(0, height - insets.top - insets.bottom - 96), justifyContent: "center", gap: 14, alignItems: "center", paddingHorizontal: 16, maxWidth: 580, width: "100%", alignSelf: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 16 }}>
            <Companion event={result.cleared ? "complete" : result.outcome === "stopped" ? "draw" : "loss"} size={120} active={foreground && !sheet} />
            {game.id !== "lagoon-run" && (
              <Hero game={game.id} size={108} outfit={p.outfit} mood={result.cleared ? "happy" : result.outcome === "stopped" ? "idle" : "dizzy"} active={foreground && !sheet} />
            )}
          </View>

          <View
            testID="arcade-result-card"
            style={{
              width: "100%",
              backgroundColor: SHELL_PAPER,
              borderRadius: 28,
              borderWidth: 1.5,
              borderColor: SHELL_BORDER,
              padding: 22,
              gap: 14,
              alignItems: "center",
              boxShadow: SHELL_CARD_SHADOW,
            }}
          >
            <Heading style={{ ...headingFace, textAlign: "center", fontSize: 28, lineHeight: 33, color: SHELL_INK }}>
              {result.cleared ? play.clearedTitle : result.outcome === "stopped" ? "A lovely place to stop" : "Game over"}
            </Heading>

            {result.cleared && <StarReveal stars={result.stars} onTone={sound.tone} active={foreground && !sheet} />}

            <View style={{ width: "100%", gap: 10, backgroundColor: SHELL_CREAM, padding: 14, borderRadius: 20, borderWidth: 1, borderColor: "#EFE0C6" }}>
              {game.id === "fruit-bat-flight" ? (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18 }}>
                  <ShellMedal score={result.score} />
                  <View style={{ gap: 2 }}>
                    <Copy style={{ color: SHELL_INK, fontWeight: "900", fontSize: 24, lineHeight: 28 }}>Score {result.score}</Copy>
                    <Copy style={{ color: SHELL_LAGOON, fontWeight: "800", fontSize: 18, lineHeight: 22 }}>Best {Math.max(p.best, result.score)}</Copy>
                    <Copy style={{ color: SHELL_MUTED, fontSize: 12, lineHeight: 16 }}>Best across all modes</Copy>
                  </View>
                </View>
              ) : (
                <>
                  <Copy style={{ textAlign: "center", color: SHELL_INK, fontSize: 16, lineHeight: 22, fontWeight: "700" }}>{result.detail}</Copy>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
                    <View style={{ backgroundColor: SHELL_PAPER, borderRadius: 14, borderWidth: 1, borderColor: SHELL_BORDER, paddingHorizontal: 12, paddingVertical: 6 }}>
                      <Copy style={{ color: SHELL_INK, fontWeight: "800", fontSize: 15, lineHeight: 20 }}>Score {result.score}</Copy>
                    </View>
                    <View style={{ backgroundColor: SHELL_PAPER, borderRadius: 14, borderWidth: 1, borderColor: SHELL_BORDER, paddingHorizontal: 12, paddingVertical: 6 }}>
                      <Copy style={{ color: SHELL_INK, fontWeight: "800", fontSize: 15, lineHeight: 20 }}>{bestLabel} {Math.max(p.best, result.score)}</Copy>
                    </View>
                  </View>
                </>
              )}
            </View>

            {level !== "endless" && (
              <View style={{ width: "100%", backgroundColor: "#FFF5D8", borderRadius: 16, borderWidth: 1, borderColor: "#E8CF96", paddingHorizontal: 14, paddingVertical: 10 }}>
                <Copy style={{ color: "#5A3E24", textAlign: "center", fontSize: 14, lineHeight: 20, fontWeight: "700" }}>
                  {nextStarGoal(level.goals, Math.max(result.stars, p.stars[level.id] ?? 0))}
                </Copy>
              </View>
            )}

            {roundDare !== null && arcadeDare(roundDare) && <DareResult dare={arcadeDare(roundDare)!} proved={dareMet(arcadeDare(roundDare)!, result.cleared, result.facts)} marked={marked(roundDare)}/>}

            {together && (
              <View style={{ width: "100%", backgroundColor: SHELL_CREAM, borderRadius: 16, borderWidth: 1, borderColor: SHELL_BORDER, padding: 10 }}>
                <Heading style={{ ...headingFace, fontSize: 20, textAlign: "center", color: SHELL_INK }}>
                  {match.names[0]} {match.wins[0]} : {match.wins[1]} {match.names[1]}
                </Heading>
              </View>
            )}
          </View>

          {reminder && (
            <View style={{ width: "100%", padding: 18, gap: 10, backgroundColor: "#FFF5D8", borderRadius: 24, borderWidth: 1.5, borderColor: "#E8CF96" }}>
              <Heading style={{ ...headingFace, fontSize: 22, color: SHELL_INK }}>A little island break?</Heading>
              <Copy style={{ color: SHELL_MUTED }}>Your stars are saved. Stretch, have a drink, or keep playing together.</Copy>
              <Button quiet onPress={() => { acknowledgeArcadeBreak(); setReminder(false); }} style={{ backgroundColor: SHELL_PAPER, borderColor: SHELL_BORDER, borderRadius: 16 }} textStyle={{ color: SHELL_INK }}>
                Thanks · I’m comfortable
              </Button>
            </View>
          )}

          {result.cleared && person.chest?.round === round && (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="A sticker chest · see what’s inside"
              onPress={() => { sound.say("arcade-chest"); openChest(); }}
              style={{
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                padding: 12,
                borderRadius: 26,
                backgroundColor: "#FFF5D8",
                borderWidth: 2,
                borderColor: "#E5B552",
                boxShadow: "0 4px 0 rgba(196, 142, 42, 0.25)",
              }}
            >
              <ChestArt sticker={person.chest.sticker} size={104} active={foreground && !sheet} />
              <View style={{ flexShrink: 1 }}>
                <Heading style={{ ...headingFace, fontSize: 21, color: SHELL_INK }}>A sticker chest!</Heading>
                <Copy style={{ fontSize: 14, color: SHELL_MUTED, fontWeight: "700" }}>See what’s inside →</Copy>
              </View>
            </PressableScale>
          )}

          <BadgeResultCard round={round} />

          <View style={{ width: "100%", gap: 10 }}>
            {showNextPrimary && (
              <Button
                onPress={() => choose(nextId!)}
                style={{ width: "100%", minHeight: 54, borderRadius: 20, backgroundColor: SHELL_CORAL, borderWidth: 1.5, borderColor: "#D95D42", boxShadow: "0 4px 0 #C8573D" }}
                textStyle={{ ...headingFace, color: SHELL_INK, fontSize: 18 }}
              >
                Next level
              </Button>
            )}
            {game.id === "fruit-bat-flight" && (
              <Button
                quiet={showNextPrimary}
                onPress={start}
                style={showNextPrimary
                  ? { width: "100%", minHeight: 48, borderRadius: 18, backgroundColor: SHELL_PAPER, borderWidth: 1.5, borderColor: SHELL_BORDER }
                  : { width: "100%", minHeight: 54, borderRadius: 20, backgroundColor: SHELL_CORAL, borderWidth: 1.5, borderColor: "#D95D42", boxShadow: "0 4px 0 #C8573D" }}
                textStyle={{ ...headingFace, color: SHELL_INK, fontSize: showNextPrimary ? 16 : 18 }}
              >
                Fly again
              </Button>
            )}
            {game.id !== "fruit-bat-flight" && !showNextPrimary && (
              <Button
                onPress={start}
                style={{ width: "100%", minHeight: 54, borderRadius: 20, backgroundColor: SHELL_CORAL, borderWidth: 1.5, borderColor: "#D95D42", boxShadow: "0 4px 0 #C8573D" }}
                textStyle={{ ...headingFace, color: SHELL_INK, fontSize: 18 }}
              >
                {result.cleared || result.outcome === "stopped" ? "Play again" : "Try again"}
              </Button>
            )}
            <View style={{ flexDirection: "row", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              {game.id !== "fruit-bat-flight" && showNextPrimary && (
                <Button
                  quiet
                  compact
                  onPress={start}
                  style={{ minHeight: 46, paddingHorizontal: 20, borderRadius: 999, backgroundColor: SHELL_PAPER, borderWidth: 1.5, borderColor: SHELL_BORDER, boxShadow: "0 2px 0 rgba(61, 43, 36, 0.08)" }}
                  textStyle={{ color: SHELL_INK, fontSize: 15, fontWeight: "800" }}
                >
                  Play again
                </Button>
              )}
              <Button
                quiet
                compact
                onPress={() => { setLevel(null); setResult(null); toTop(); }}
                style={{ minHeight: 46, paddingHorizontal: 20, borderRadius: 999, backgroundColor: SHELL_PAPER, borderWidth: 1.5, borderColor: SHELL_BORDER, boxShadow: "0 2px 0 rgba(61, 43, 36, 0.08)" }}
                textStyle={{ color: SHELL_INK, fontSize: 15, fontWeight: "800" }}
              >
                Map
              </Button>
            </View>
          </View>
        </View>
      ) : !playing ? (
        /* Elevated Warm Storybook Start Card */
        <View style={{ flexGrow: 1, minHeight: Math.max(0, height - insets.top - insets.bottom - 162), justifyContent: "center", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, gap: 12 }}>
          <Hero game={game.id} size={cardHero} outfit={p.outfit} active={foreground && !sheet} />
          <View
            testID="arcade-start-card"
            style={{
              width: "100%",
              maxWidth: cardMax,
              backgroundColor: SHELL_PAPER,
              borderRadius: 28,
              borderWidth: 1.5,
              borderColor: SHELL_BORDER,
              padding: 22,
              gap: 14,
              alignItems: "center",
              boxShadow: SHELL_CARD_SHADOW,
            }}
          >
            <View style={{ backgroundColor: SHELL_BG, borderRadius: 999, borderWidth: 1, borderColor: SHELL_BORDER, paddingHorizontal: 14, paddingVertical: 4 }}>
              <Copy maxFontSizeMultiplier={headerTextMax} style={{ color: SHELL_LAGOON, fontSize: 13, lineHeight: 18, fontWeight: "800", textAlign: "center" }}>
                {level === "endless" ? "Free play" : `${game.worlds.find(w => w.id === level.world)?.name} · Level\u00a0${level.index}`}
              </Copy>
            </View>

            <Heading
              maxFontSizeMultiplier={wordFitMultiplier(level === "endless" ? "Make it your own" : level.name, 28, Math.min(cardMax, width - insets.left - insets.right - 32) - 50, headerTextMax)}
              style={{ ...headingFace, textAlign: "center", fontSize: 28, lineHeight: 33, color: SHELL_INK }}
            >
              {level === "endless" ? "Make it your own" : level.name}
            </Heading>

            <Heading maxFontSizeMultiplier={headerTextMax} style={{ ...titleFace, textAlign: "center", fontSize: 20, lineHeight: 25, color: SHELL_MUTED }}>
              {goal}
            </Heading>

            {person.session?.game === game.id && (
              <Copy style={{ textAlign: "center", fontSize: 14, color: SHELL_MUTED }}>Starting a new round replaces your saved reef. Use Map to continue it instead.</Copy>
            )}

            <View style={{ width: "100%", gap: 10, backgroundColor: SHELL_CREAM, borderRadius: 20, borderWidth: 1, borderColor: "#EFE0C6", padding: 14 }}>
              {level === "endless" ? (
                <Copy style={{ textAlign: "center", color: SHELL_INK }}>Your own pace. Finish whenever you like.</Copy>
              ) : (
                level.goals.map((goalLine, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <StarDisplay stars={i + 1} size={18} />
                    <Copy style={{ flex: 1, color: i === 0 ? SHELL_INK : SHELL_MUTED, fontSize: i === 0 ? 17 : 14, lineHeight: i === 0 ? 22 : 19, fontWeight: i === 0 ? "800" : "600" }}>
                      {goalLine}
                    </Copy>
                  </View>
                ))
              )}
            </View>

            <View style={{ width: "100%" }}>
              <ToggleRow
                label="Helper"
                detail={level === "endless" ? (game.id === "fruit-bat-flight" ? "Slower flight. One heart in free play. No level stars." : "Slower play. No level stars in free play.") : play.helperDetail ?? "Slower play. Five hearts. Same stars."}
                value={person.helper}
                onChange={value => arcade({ type: "helper", value }, expected)}
              />
            </View>

            {level !== "endless" && !together && !comfort.youngChild && daresFor(game.id, level.id).length > 0 && (
              <DareChoice dares={daresFor(game.id, level.id)} selected={dare} marked={marked} onSelect={slot => { setDare(slot); if (slot !== null) setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 0); }} />
            )}

            {play.familyMatch && <FamilySetup mode={mode} strength={strength} match={match} onMode={setMode} onStrength={setStrength} onMatch={setMatch} />}

            {level === "endless" && !together && (
              <View style={{ width: "100%", gap: 10 }}>
                <Copy style={{ color: SHELL_INK, fontWeight: "700" }}>Name for the local family board</Copy>
                <TextInput accessibilityLabel="Free-play player name" value={name} maxLength={24} onChangeText={setName} style={[styles.input, { borderColor: SHELL_BORDER, backgroundColor: SHELL_PAPER, color: SHELL_INK }]} />
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{store.save.players?.map(n => <Chip key={n} selected={name === n} onPress={() => setName(n)}>{n}</Chip>)}</View>
              </View>
            )}

            <View style={{ width: "100%" }}>
              <Button
                quiet
                compact
                onPress={() => teach(false)}
                style={{ width: "100%", minHeight: 46, borderRadius: 16, backgroundColor: SHELL_CREAM, borderWidth: 1.5, borderColor: SHELL_BORDER }}
                textStyle={{ color: SHELL_INK, fontSize: 15, fontWeight: "700" }}
              >
                How to play · show me
              </Button>
            </View>
          </View>
        </View>
      ) : board}
    </ScrollView>}

    {/* Coral Primary CTA Start Dock */}
    {!playing && level && !result && (
      <View
        testID="arcade-start-dock"
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: SHELL_BG,
          borderTopWidth: 1.5,
          borderColor: SHELL_BORDER,
        }}
      >
        <View style={{ width: "100%", maxWidth: cardMax, alignSelf: "center" }}>
          <Button
            maxFontSizeMultiplier={headerTextMax}
            onPress={() => { if (p.coached) start(); else teach(true); }}
            style={{
              width: "100%",
              minHeight: 54,
              borderRadius: 20,
              backgroundColor: SHELL_CORAL,
              borderWidth: 1.5,
              borderColor: "#D95D42",
              boxShadow: "0 4px 0 #C8573D",
            }}
            textStyle={{ ...headingFace, color: SHELL_INK, fontSize: 18 }}
          >
            {p.coached ? "Let’s play" : "Show me & play"}
          </Button>
        </View>
      </View>
    )}

    <Sheet visible={paused && !sheet} title={finishError ? "Keep your result" : "Your game is paused"} onClose={() => setPaused(false)}>
      <View style={{ alignItems: "center" }}><Hero game={game.id} size={96} outfit={p.outfit} active={false} /></View>
      {finishError ? (
        <>
          <Copy style={{ color: SHELL_INK }}>{finishError}</Copy>
          {!invalidResult && (
            <Button onPress={() => { const pending = failedResult.current; if (pending) onResult(pending.result, pending.helped, pending.winner); }} style={{ backgroundColor: SHELL_CORAL, borderColor: "#D95D42", borderRadius: 18, boxShadow: "0 4px 0 #C8573D" }} textStyle={{ ...headingFace, color: SHELL_INK, fontSize: 17 }}>
              Try saving again
            </Button>
          )}
        </>
      ) : (
        <Button onPress={() => setPaused(false)} style={{ backgroundColor: SHELL_CORAL, borderColor: "#D95D42", borderRadius: 18, boxShadow: "0 4px 0 #C8573D" }} textStyle={{ ...headingFace, color: SHELL_INK, fontSize: 17 }}>
          Resume play
        </Button>
      )}
      <ToggleRow label="Helper" detail={level === "endless" ? (game.id === "fruit-bat-flight" ? "Slower flight. One heart in free play. No level stars." : "Slower play. No level stars in free play.") : play.helperDetail ?? "Slower play. Five hearts. Same stars."} value={person.helper} onChange={value => arcade({ type: "helper", value }, expected)} />
      <Button quiet onPress={() => teach(false)} style={{ backgroundColor: SHELL_PAPER, borderColor: SHELL_BORDER, borderRadius: 16 }} textStyle={{ color: SHELL_INK }}>How to play</Button>
      <Button quiet onPress={() => { failedResult.current = null; setFinishError(""); setPaused(false); setLevel(null); setResult(null); setPlaying(false); }} style={{ backgroundColor: SHELL_PAPER, borderColor: SHELL_BORDER, borderRadius: 16 }} textStyle={{ color: SHELL_INK }}>Back to level map</Button>
    </Sheet>

    <Sheet visible={sheet === "leave"} title="Back to the map?" onClose={() => setSheet(null)}>
      <Copy style={{ color: SHELL_MUTED }}>{person.session?.round === round ? "Your reef is saved. Continue this round from the map next time." : "This round will start fresh next time. Your earned stars and stickers are saved."}</Copy>
      <Button onPress={() => { setSheet(null); setPlaying(false); setLevel(null); setResult(null); }} style={{ backgroundColor: SHELL_CORAL, borderColor: "#D95D42", borderRadius: 18, boxShadow: "0 4px 0 #C8573D" }} textStyle={{ ...headingFace, color: SHELL_INK, fontSize: 17 }}>Leave round · back to map</Button>
      <Button quiet onPress={() => setSheet(null)} style={{ backgroundColor: SHELL_PAPER, borderColor: SHELL_BORDER, borderRadius: 16 }} textStyle={{ color: SHELL_INK }}>Keep playing</Button>
    </Sheet>

    <Sheet visible={sheet === "teach"} title="Show me" onClose={() => { startAfterTeach.current = false; setSheet(null); }}>{play.Teach ? <PlayTeaching goal={goal} detail={play.teachingDetail?.(isLearning, together) ?? ""} onHear={onHear} onPlay={onTeachPlay}><play.Teach learning={isLearning} together={together} goal={goal} onTone={sound.tone}/></PlayTeaching> : <Teaching game={game} learning={isLearning} onHear={onHear} onPlay={onTeachPlay}/>}</Sheet>
    <Sheet visible={sheet === "book"} title="Sticker book" onClose={() => setSheet(null)}><StickerBook person={person}/></Sheet>
    <Sheet visible={sheet === "outfits"} title={game.hero} onClose={() => setSheet(null)}><OutfitCloset game={game} person={person} onSelect={outfit => arcade({ type: "outfit", game: game.id, outfit }, expected)}/></Sheet>
    <Sheet visible={sheet === "chest"} title="A little treasure" onClose={closeChest}>{chestOffer?.game === game.id && <TreasureChest key={chestOffer.round} offer={chestOffer} game={game} expected={expected} active={foreground && sheet === "chest"} onClose={closeChest}/>}</Sheet>
    <Settings visible={sheet === "settings"} onClose={() => setSheet(null)}/>
  </View>;
}
