import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button, C, Chip, Copy, Heading, IconButton, PressableScale, Sheet, ToggleRow, styles } from "../components/ui";
import { Settings } from "../components/Settings";
import { SaveStatus } from "../components/SaveStatus";
import { Celebrate } from "../learn/Celebrate";
import { activeLearner } from "../learn/learners";
import { wordEntry } from "../learn/kit/reading";
import { useStore } from "../state/Store";
import { ArcadeArt, ArcadeIsland, StarDisplay } from "./Art";
import { TreasureChest } from "./Chest";
import { OutfitCloset, StickerBook } from "./Collection";
import { LevelMap } from "./LevelMap";
import { Teaching } from "./Teaching";
import { useArcadeAudio } from "./audio";
import { acknowledgeArcadeBreak, arcadeBreakDue, markArcadePlaying } from "./breakClock";
import { useArcadeForeground } from "./loop";
import { arcadeGames } from "./registry";
import { arcadeLearner, gameProgress, levelOpen, endlessOpen, type ChestOffer } from "./progress";
import { allLevelIds, type ArcadeGame, type ArcadeLevel, type ArcadeResult, type LevelId, starCount } from "./types";
import { createReef, reefLevel, reefLevels } from "./games/reef-builder/engine";
import { ReefBoard } from "./games/reef-builder/View";
import { createSong, songLevel, songLevels } from "./games/shell-song/engine";
import { SongBoard } from "./games/shell-song/View";
import { ActionGameScreen } from "./action/Screen";
export function ArcadeGameScreen({ game, debug = false }: { game: ArcadeGame; debug?: boolean }) {
  return game.id === "palm-patrol" || game.id === "beach-ball" ? <ActionGameScreen game={game} debug={debug}/> : <KitGameScreen game={game} debug={debug}/>;
}
export function ArcadeLobby() {
  const store = useStore(), person = arcadeLearner(store.save.arcade, activeLearner(store.save.learning).id);
  const [sheet, setSheet] = useState<"book" | "settings" | null>(null);
  return <><ScrollView contentContainerStyle={[styles.content, { padding: 20, gap: 20 }]}>
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}><Button quiet compact icon="back" onPress={() => router.replace("/")}>Home</Button><Button quiet compact onPress={() => setSheet("settings")}>Settings</Button></View>
    <View style={{ alignItems: "center", gap: 8 }}><ArcadeIsland size={166}/><Heading style={{ fontSize: 34 }}>Island Arcade</Heading><Copy style={{ textAlign: "center" }}>Little worlds to play in. New friends to discover.</Copy><Copy style={{ color: C.teal }}>{activeLearner(store.save.learning).name} · {person.stickers.length} island stickers</Copy></View>
    <SaveStatus/>
    {arcadeGames.map(game => <View key={game.id} style={{ borderRadius: 28, overflow: "hidden", backgroundColor: game.surface, borderWidth: 1, borderColor: C.line }}>
      <PressableScale accessibilityRole="button" accessibilityLabel={`Play ${game.name}, open level map`} onPress={() => router.push({ pathname: "/arcade", params: { game: game.id } })} style={{ padding: 20, gap: 14, flexDirection: "row", alignItems: "center" }}>
        <ArcadeArt game={game.id} size={110} outfit={gameProgress(person, game.id).outfit}/><View style={{ flex: 1, gap: 7 }}><Heading style={{ fontSize: 25 }}>{game.name}</Heading><Copy>{game.tagline}</Copy><Copy style={{ fontSize: 14, color: game.color }}>{starCount(gameProgress(person, game.id).stars)} stars · 4 worlds</Copy><Heading style={{ fontSize: 18, color: game.color }}>Let’s play →</Heading></View>
      </PressableScale><View style={{ position: "absolute", right: 8, top: 8 }}><IconButton label={`${(store.save.favoriteGames ?? []).includes(game.id) ? "Remove favorite" : "Favorite"} ${game.name}`} icon={(store.save.favoriteGames ?? []).includes(game.id) ? "star-filled" : "star"} onPress={() => store.toggleGameFavorite(game.id)}/></View>
    </View>)}
    <Button quiet onPress={() => setSheet("book")}>Open my sticker book</Button><Copy style={{ textAlign: "center", fontSize: 13 }}>No timers to wait for. No purchases. Your own little island.</Copy>
  </ScrollView><Sheet visible={sheet === "book"} title="Sticker book" onClose={() => setSheet(null)}><StickerBook person={person}/></Sheet><Settings visible={sheet === "settings"} onClose={() => setSheet(null)}/></>;
}
function KitGameScreen({ game, debug = false }: { game: ArcadeGame; debug?: boolean }) {
  const store = useStore(), owner = activeLearner(store.save.learning), expected = useMemo(() => ({ epoch: store.epoch, learner: owner.id }), [store.epoch, owner.id]);
  const person = arcadeLearner(store.save.arcade, owner.id), p = gameProgress(person, game.id), foreground = useArcadeForeground();
  const [level, setLevel] = useState<ArcadeLevel | "endless" | null>(null), [playing, setPlaying] = useState(false), [paused, setPaused] = useState(false);
  const [sheet, setSheet] = useState<"book" | "outfits" | "settings" | "teach" | "chest" | "leave" | null>(null), [result, setResult] = useState<ArcadeResult | null>(null);
  const [round, setRound] = useState(""), [seed, setSeed] = useState(1), [name, setName] = useState(owner.id === "family" ? store.save.players?.[0] ?? "Family" : owner.name);
  const [chestOffer, setChestOffer] = useState<ChestOffer | null>(null);
  function openChest() { setChestOffer(person.chest); setSheet("chest"); }
  function closeChest() { setSheet(null); setChestOffer(null); }
  const startAfterTeach = useRef(false), credited = useRef(""), [reminder, setReminder] = useState(false), scroll = useRef<ScrollView>(null);
  const active = foreground && playing && !paused && !sheet, sound = useArcadeAudio(game.id, store.save.settings, store.save.arcade?.music ?? false, foreground && !paused, !!sheet);
  useEffect(() => { markArcadePlaying(active); return () => markArcadePlaying(false); }, [active]);
  const { arcade } = store;
  useEffect(() => { arcade({ type: "visit", game: game.id }, expected); }, [arcade, expected, game.id]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Latch a visible pause after external focus/background loss; returning never silently resumes a round.
  useEffect(() => { if (playing && !foreground) setPaused(true); }, [playing, foreground]);
  function toTop() { scroll.current?.scrollTo({ y: 0, animated: false }); }
  function choose(id: LevelId | "endless") {
    if (id === "endless" ? !endlessOpen(p, store.save.arcade?.unlockAll) : !levelOpen(p, id, store.save.arcade?.unlockAll)) return;
    setLevel(id === "endless" ? id : game.id === "reef-builder" ? reefLevel(id) : songLevel(id)); setResult(null); setPlaying(false); setPaused(false); setSheet(null); toTop();
  }
  function start() {
    // eslint-disable-next-line react-hooks/purity -- This user-invoked Start handler creates round entropy, never called by render.
    const round = `arcade-${Date.now().toString(36)}-${Math.floor(Math.random() * 0x1000000).toString(36)}`;
    // eslint-disable-next-line react-hooks/purity -- User-invoked Start handler, not a render calculation.
    setRound(round); setSeed(Math.floor(Math.random() * 0x100000000)); setResult(null); setPaused(false); setPlaying(true); setSheet(null);
    if (level === "endless") store.rememberPlayers([name]); toTop();
  }
  function teach(andStart: boolean) { startAfterTeach.current = andStart; setSheet("teach"); sound.say(game.id === "reef-builder" ? level !== "endless" && level?.world === "learn" ? "arcade-reef-ten" : "arcade-reef-intro" : level !== "endless" && level?.world === "learn" ? "arcade-song-word" : "arcade-song-intro"); }
  const onResult = useCallback((next: ArcadeResult, helped = false) => {
    if (!level || credited.current === round) return;
    credited.current = round;
    arcade({ type: "finish", game: game.id, level: level === "endless" ? level : level.id, stars: next.stars, score: next.score, round, name }, expected);
    if (level !== "endless" && level.world === "learn" && next.cleared) {
      const word = game.id === "shell-song" ? songLevel(level.id).word : undefined, skill = word ? wordEntry(word)!.skill : "num.make-ten";
      const config = { enabled: true, subject: word ? "reading" as const : "math" as const, limit: 10 as const, operation: "mixed" as const };
      store.recordWarmup([{ skill, helped: helped || person.helper }], config, round, expected.epoch); store.notePractice(skill, helped || person.helper, expected.epoch);
    }
    setReminder(arcadeBreakDue(store.save.arcade?.breakMinutes ?? 0)); setResult(next); setPlaying(false); setPaused(false); toTop();
    // Store entry points are stable; these snapshots deliberately bind a result to this exact owned round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arcade, game.id, level, round, name, expected, person.helper]);
  const isLearning = !!level && level !== "endless" && level.world === "learn", levels = game.id === "reef-builder" ? reefLevels : songLevels;
  const nextId = level && level !== "endless" ? allLevelIds[allLevelIds.indexOf(level.id) + 1] : undefined;
  const nextOpen = nextId && levelOpen(p, nextId, store.save.arcade?.unlockAll);
  return <>
    <View style={{ paddingHorizontal: 16, paddingVertical: 9, gap: 8, backgroundColor: C.cream, borderBottomWidth: 1, borderColor: C.line }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
        <Button quiet compact icon="back" onPress={() => { if (playing) setSheet("leave"); else if (level) { setLevel(null); setResult(null); toTop(); } else router.replace("/arcade"); }}>{level ? "Map" : "Arcade"}</Button>
        <Heading style={{ fontSize: 20, flexShrink: 1 }}>{game.name}</Heading>
        {playing ? <Button quiet compact onPress={() => setPaused(true)}>Pause</Button> : <Button quiet compact onPress={() => setSheet("settings")}>Settings</Button>}
      </View>
    </View>
    <ScrollView ref={scroll} contentContainerStyle={[styles.content, { padding: 18, gap: 18, maxWidth: 680 }]}>
      <SaveStatus/>
      {!level ? <><LevelMap game={game} person={person} levels={levels} unlockAll={store.save.arcade?.unlockAll ?? false} onLevel={choose} onOutfits={() => setSheet("outfits")} onChest={openChest}/>
        <Button quiet onPress={() => setSheet("book")}>My sticker book</Button>
        {!!store.save.arcade?.scores.some(s => s.game === game.id) && <View style={{ padding: 16, gap: 8, borderRadius: 20, backgroundColor: C.sand }}><Heading style={{ fontSize: 21 }}>Family free-play board</Heading>{store.save.arcade.scores.filter(s => s.game === game.id).sort((a, b) => b.score - a.score).map(s => <Copy key={s.name}>{s.name} · {s.score} points</Copy>)}</View>}
      </> : result ? <View style={{ gap: 18, alignItems: "center", paddingTop: 10 }}>
        <View><ArcadeArt game={game.id} size={138} outfit={p.outfit}/>{result.cleared && <Celebrate burst={1} big/>}</View><Heading style={{ textAlign: "center", fontSize: 30 }}>{result.cleared ? game.id === "reef-builder" ? "A happier little reef" : "A song worth sharing" : level === "endless" ? "A lovely place to stop" : "Let’s try a fresh start"}</Heading>
        {result.cleared && <StarDisplay stars={result.stars} size={46}/>}<Copy style={{ textAlign: "center" }}>{result.detail}</Copy><Copy>{result.score} points{level === "endless" ? ` · best ${p.best}` : result.cleared ? " · stars saved" : " · your earlier stars are safe"}</Copy>
        {reminder && <View style={{ padding: 18, gap: 10, backgroundColor: "#F6EACD", borderRadius: 20 }}><Heading style={{ fontSize: 23 }}>A little island break?</Heading><Copy>Your stars are saved. Stretch, have a drink, or keep playing together.</Copy><Button quiet onPress={() => { acknowledgeArcadeBreak(); setReminder(false); }}>Thanks · I’m comfortable</Button></View>}
        {result.cleared && person.chest?.round === round && <Button onPress={() => { sound.say("arcade-chest"); openChest(); }}>A sticker chest · see what’s inside</Button>}
        {nextOpen && result.cleared && <Button onPress={() => choose(nextId!)}>Next level</Button>}<Button quiet onPress={start}>Play again</Button><Button quiet onPress={() => { setLevel(null); setResult(null); toTop(); }}>Back to level map</Button>
      </View> : !playing ? <View style={{ gap: 16, alignItems: "center" }}>
        <ArcadeArt game={game.id} size={140} outfit={p.outfit}/><Copy style={{ color: game.color }}>{level === "endless" ? "Free play" : `${game.worlds.find(w => w.id === level.world)?.name} · Level ${level.index}`}</Copy><Heading style={{ textAlign: "center", fontSize: 28 }}>{level === "endless" ? "Make it your own" : level.name}</Heading>
        <View style={{ width: "100%", padding: 18, borderRadius: 24, gap: 12, backgroundColor: game.surface }}><Heading style={{ fontSize: 21 }}>{level === "endless" ? "Your own pace" : "Your star goals"}</Heading>{level === "endless" ? <Copy>No level goal. Finish when you like. Your best stays on this device.</Copy> : level.goals.map((goal, i) => <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><StarDisplay stars={i + 1} size={20}/><Copy style={{ flex: 1 }}>{goal}</Copy></View>)}</View>
        <View style={{ width: "100%" }}><ToggleRow label="Helper" detail={game.id === "reef-builder" ? "A smaller piece whenever you need one. Stars stay earnable." : "Slower singing, a guide to the next shell, and gentle retries. Stars stay earnable."} value={person.helper} onChange={value => arcade({ type: "helper", value }, expected)}/></View>
        {level === "endless" && <View style={{ width: "100%", gap: 10 }}><Copy>Name for the local family board</Copy><TextInput accessibilityLabel="Free-play player name" value={name} maxLength={24} onChangeText={setName} style={styles.input}/><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{store.save.players?.map(n => <Chip key={n} selected={name === n} onPress={() => setName(n)}>{n}</Chip>)}</View></View>}
        <Button onPress={() => p.coached ? start() : teach(true)}>{p.coached ? "Let’s play" : "Show me & play"}</Button><Button quiet onPress={() => teach(false)}>How to play · show me</Button>
      </View> : <>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><Copy style={{ fontSize: 14 }}>{level === "endless" ? "Free play" : `Level ${level.index} · ${level.name}`}</Copy><Button quiet compact selected={person.helper} onPress={() => arcade({ type: "helper", value: !person.helper }, expected)}>Helper {person.helper ? "on" : "off"}</Button></View>
        {game.id === "reef-builder" ? <ReefBoard key={round} initial={createReef(level === "endless" ? level : reefLevel(level.id), seed, person.helper)} active={active} helper={person.helper} onResult={onResult} onTone={sound.tone}/> : <SongBoard key={round} initial={createSong(level === "endless" ? level : songLevel(level.id), seed, person.helper)} active={active} helper={person.helper} outfit={p.outfit} onResult={onResult} onTone={sound.tone} onSay={sound.say} debug={debug || __DEV__}/>}
        <Button quiet onPress={() => teach(false)}>How to play</Button>
      </>}
    </ScrollView>
    <Sheet visible={paused && !sheet} title="Your game is paused" onClose={() => setPaused(false)}><Copy>Everything is waiting right here. You can take your time.</Copy><Button onPress={() => setPaused(false)}>Resume play</Button><Button quiet onPress={() => { setPaused(false); setLevel(null); setResult(null); setPlaying(false); }}>Back to level map</Button></Sheet>
    <Sheet visible={sheet === "leave"} title="Back to the map?" onClose={() => setSheet(null)}><Copy>This round will start fresh next time. Your earned stars and stickers are saved.</Copy><Button onPress={() => { setSheet(null); setPlaying(false); setLevel(null); setResult(null); }}>Leave round · back to map</Button><Button quiet onPress={() => setSheet(null)}>Keep playing</Button></Sheet>
    <Sheet visible={sheet === "teach"} title="Show me" onClose={() => { startAfterTeach.current = false; setSheet(null); }}><Teaching game={game} learning={isLearning} onHear={() => sound.say(game.id === "reef-builder" ? isLearning ? "arcade-reef-ten" : "arcade-reef-intro" : isLearning ? "arcade-song-word" : "arcade-song-intro")} onPlay={() => { arcade({ type: "coached", game: game.id }, expected); if (startAfterTeach.current) start(); else setSheet(null); }}/></Sheet>
    <Sheet visible={sheet === "book"} title="Sticker book" onClose={() => setSheet(null)}><StickerBook person={person}/></Sheet>
    <Sheet visible={sheet === "outfits"} title={game.hero} onClose={() => setSheet(null)}><OutfitCloset game={game} person={person} onSelect={outfit => arcade({ type: "outfit", game: game.id, outfit }, expected)}/></Sheet>
    <Sheet visible={sheet === "chest"} title="A little treasure" onClose={closeChest}>{chestOffer?.game === game.id && <TreasureChest key={chestOffer.round} offer={chestOffer} game={game} expected={expected} active={foreground && sheet === "chest"} onClose={closeChest}/>}</Sheet>
    <Settings visible={sheet === "settings"} onClose={() => setSheet(null)}/>
  </>;
}
