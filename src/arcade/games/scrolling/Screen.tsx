import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, ScrollView, TextInput, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import Svg, { Path, Rect } from "react-native-svg";
import { Settings } from "../../../components/Settings";
import { SaveStatus } from "../../../components/SaveStatus";
import { Text } from "../../../components/Text";
import { Button, Copy, Heading, PressableScale, Sheet, ToggleRow, styles } from "../../../components/ui";
import { easeInOut, nativeDriver, useReducedMotion } from "../../../components/motion";
import { activeLearner } from "../../../learn/learners";
import { Celebrate } from "../../../learn/Celebrate";
import { useStore } from "../../../state/Store";
import { StarDisplay, StickerArt, stickerNames } from "../../Art";
import { TreasureChest } from "../../Chest";
import { OutfitCloset, StickerBook } from "../../Collection";
import { useArcadeAudio } from "../../audio";
import { acknowledgeArcadeBreak, arcadeBreakDue, markArcadePlaying } from "../../breakClock";
import { useArcadeForeground } from "../../loop";
import { arcadeLearner, endlessOpen, gameProgress, levelOpen, type ArcadeLearner, type ChestOffer } from "../../progress";
import { allLevelIds, starCount, type ArcadeGame, type ArcadeResult, type LevelId } from "../../types";
import { ChestArt, Fruit, Hazard, Scenery, ScrollHero, palette } from "./Art";
import { createFlight, flightStep, flightTransition } from "../fruit-bat-flight/engine";
import { createRun, runStep, runTransition } from "../lagoon-run/engine";
import { ScrollBoard } from "./Board";
import { flightLevels, runLevels, type ScrollGame, type ScrollLevel } from "./content";
const ink = "#29314C";
export const scrollSpeech = (game: ScrollGame, learning: boolean) => game === "fruit-bat-flight" ? learning ? "arcade-flight-math" : "arcade-flight-intro" : learning ? "arcade-run-math" : "arcade-run-intro";
export const scrollGoal = (game: ScrollGame, learning: boolean) => learning ? game === "fruit-bat-flight" ? "Fly through the answer." : "Run into the answer lane." : game === "fruit-bat-flight" ? "Tap to flap. Follow the glowing fruit." : "Swipe to steer. Jump up. Duck down.";
/** Ambient movement is isolated from React and suspended with the scene. */
function Float({ children, active = true, wiggle = false }: { children: React.ReactNode; active?: boolean; wiggle?: boolean }) {
  const reduced = useReducedMotion(), [motion] = useState(() => new Animated.Value(0));
  useEffect(() => {
    motion.setValue(0); if (reduced || !active) return;
    const loop = Animated.loop(Animated.sequence([Animated.timing(motion, { toValue: 1, duration: wiggle ? 550 : 1250, easing: easeInOut, useNativeDriver: nativeDriver }), Animated.timing(motion, { toValue: 0, duration: wiggle ? 550 : 1250, easing: easeInOut, useNativeDriver: nativeDriver })])); loop.start(); return () => loop.stop();
  }, [motion, reduced, active, wiggle]);
  return <Animated.View style={{ transform: [{ translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }, { rotate: motion.interpolate({ inputRange: [0, 1], outputRange: [wiggle ? "-3deg" : "0deg", wiggle ? "3deg" : "0deg"] }) }] }}>{children}</Animated.View>;
}
function Reveal({ stars, onTone, active }: { stars: number; onTone: (key: string) => void; active: boolean }) {
  const [shown, setShown] = useState(0);
  useEffect(() => { if (!active || shown >= stars) return; const id = setTimeout(() => { setShown(shown + 1); onTone("clear"); }, 280); return () => clearTimeout(id); }, [stars, shown, onTone, active]);
  return <StarDisplay stars={shown} size={48}/>;
}
/** A safe rehearsal driven by the same pure movement rules as the full game. */
function Rehearsal({ game, onTone }: { game: ScrollGame; onTone: (key: string) => void }) {
  const bat = game === "fruit-bat-flight", reduced = useReducedMotion(), [motion] = useState(() => new Animated.Value(0)), [duck, setDuck] = useState(false);
  const trajectory = useMemo(() => {
    let flight = flightTransition(createFlight(flightLevels[0], 1), { type: "flap" });
    let run = runTransition(createRun(runLevels[0], 1), { type: "jump" });
    const y: number[] = [], t: number[] = [];
    for (let i = 0; i <= 66; i++) {
      t.push(i / 66); y.push(bat ? (flight.y - .5) * 170 : -Math.sin((1.1 - run.jump) / 1.1 * Math.PI) * 54);
      flight = flightStep(flight, { type: "idle" }, 1 / 60); run = runStep(run, { type: "idle" }, 1 / 60);
    }
    return { y, t };
  }, [bat]);
  useEffect(() => () => motion.stopAnimation(), [motion]);
  function tryMove(down = false) { setDuck(down); motion.stopAnimation(); motion.setValue(0); onTone(down ? "shell-1" : "shell-4"); Animated.timing(motion, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: nativeDriver }).start(); }
  return <View style={{ width: "100%", gap: 10 }}><View style={{ height: 150, borderRadius: 25, overflow: "hidden", backgroundColor: bat ? "#263C5C" : "#A6DED9" }}>
    <Animated.View style={{ position: "absolute", left: "28%", top: 55, transform: [{ translateY: reduced ? 0 : duck ? 25 : motion.interpolate({ inputRange: trajectory.t, outputRange: trajectory.y }) }, { scale: duck ? .65 : 1 }] }}><ScrollHero game={game} size={80}/></Animated.View>
    <View style={{ position: "absolute", left: "66%", top: 56 }}>{bat ? <Fruit size={65}/> : <Hazard kind={duck ? "frond" : "coconut"} size={75}/>}</View>
    <Text style={{ position: "absolute", left: 14, top: 12, color: bat ? "#FFF2CD" : ink, fontWeight: "800" }}>{bat ? "Tap ↑ then glide" : duck ? "↓ Duck under" : "↑ Jump over"}</Text>
  </View><View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}><Button quiet compact onPress={() => tryMove()}>{bat ? "Try a flap ↑" : "Try a jump ↑"}</Button>{!bat && <Button quiet compact onPress={() => tryMove(true)}>Try a duck ↓</Button>}</View></View>;
}
function Padlock() { return <Svg width={28} height={30} viewBox="0 0 28 30" accessible={false}><Path d="M7 13V8Q7 0 14 0Q21 0 21 8V13" fill="none" stroke="#FFF2D0" strokeWidth={4}/><Rect x={2} y={11} width={24} height={18} rx={5} fill="#FFF2D0"/><Path d="M14 17V23" stroke="#5E536B" strokeWidth={4}/></Svg>; }
function WorldMap({ game, person, unlockAll, onChoose, onOutfits, onChest, active }: { game: ArcadeGame; person: ArcadeLearner; unlockAll: boolean; onChoose: (id: LevelId | "endless") => void; onOutfits: () => void; onChest: () => void; active: boolean }) {
  const id = game.id as ScrollGame, p = gameProgress(person, id), { width } = useWindowDimensions(), cols = width > 800 ? 2 : 1, worlds = game.worlds, levels = id === "fruit-bat-flight" ? flightLevels : runLevels;
  const current = levels.find(l => levelOpen(p, l.id, unlockAll) && !p.stars[l.id])?.id;
  return <View style={{ gap: 18 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 10 }}><Float active={active}><ScrollHero game={id} outfit={p.outfit} size={105}/></Float><View style={{ flex: 1, gap: 6 }}><Heading style={{ color: ink, fontSize: 29 }}>{game.name}</Heading><Copy>{starCount(p.stars)} stars · {person.stickers.length} stickers</Copy><Button quiet compact onPress={onOutfits}>Dress {game.hero.split(" the ")[0]}</Button></View></View>
    {person.chest?.game === id && <PressableScale accessibilityRole="button" accessibilityLabel={`Open waiting chest: ${stickerNames[person.chest.sticker]}`} onPress={onChest} style={{ backgroundColor: "#F8E5B4", borderRadius: 26, padding: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}><Float active={active} wiggle><ChestArt size={95}/></Float><StickerArt id={person.chest.sticker} size={62}/><Text style={{ color: ink, fontSize: 18, fontWeight: "800" }}>Your treasure →</Text></PressableScale>}
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
      {worlds.map(world => { const open = unlockAll || p.openWorlds.includes(world.id), color = palette(id, world.id), own = levels.filter(l => l.world === world.id);
        return <View key={world.id} style={{ width: cols === 1 ? "100%" : "48.8%", height: 420, overflow: "hidden", borderRadius: 30, backgroundColor: color[0], borderWidth: 3, borderColor: "#EAC889" }}><View style={{ position: "absolute", inset: 0 }}><Scenery game={id} world={world.id}/></View>
          <View style={{ padding: 16, flexDirection: "row", alignItems: "center", gap: 6 }}><View style={{ flex: 1, gap: 3 }}><Text style={{ color: "#FFF9E4", backgroundColor: "#233650", borderRadius: 13, paddingHorizontal: 9, paddingVertical: 5, fontSize: 23, fontWeight: "900", alignSelf: "flex-start" }}>{world.name}</Text><Text style={{ color: "#FFF9E4", backgroundColor: "#233650", padding: 5, borderRadius: 10, alignSelf: "flex-start", fontSize: 14 }}>{open ? world.learning ? "Slow math adventure" : world.id === "w3" ? "Storm trails from level 5" : world.detail : `${world.stars} stars to explore`}</Text></View><ScrollHero game={id} outfit={p.outfit} size={76}/></View>
          <View style={{ position: "absolute", left: 8, right: 8, top: 110, height: 292 }}>
            <Svg width="100%" height="100%" viewBox="0 0 400 280" preserveAspectRatio="none" accessible={false}><Path d="M50 62Q95 5 150 62T250 62T350 62Q410 135 350 185Q300 250 250 185T150 185T50 185" fill="none" stroke="#FDE6AD" strokeWidth={14} strokeLinecap="round"/><Path d="M50 62Q95 5 150 62T250 62T350 62Q410 135 350 185Q300 250 250 185T150 185T50 185" fill="none" stroke="#BE975E" strokeWidth={3} strokeDasharray="3 11"/></Svg>
            {own.map((l, i) => { const available = levelOpen(p, l.id, unlockAll), stars = p.stars[l.id] ?? 0, col = i < 4 ? i : 7 - i, row = i < 4 ? 0 : 1, node = <PressableScale disabled={!available} accessibilityRole="button" accessibilityLabel={`${world.name}, level ${l.index}, ${l.name}, ${stars} stars${available ? "" : ", locked"}`} accessibilityState={{ disabled: !available }} onPress={() => onChoose(l.id)} style={{ width: 60, height: 62, justifyContent: "center", alignItems: "center", borderRadius: available ? 25 : 30, backgroundColor: available ? stars ? "#F4C76C" : "#FFF7DA" : "#665E77", borderWidth: 3, borderBottomWidth: 7, borderColor: available ? "#805C63" : "#433F5C" }}>{available ? <Text style={{ fontSize: 28, fontWeight: "900", color: ink }}>{l.index}</Text> : <Padlock/>}</PressableScale>;
              return <View key={l.id} style={{ position: "absolute", width: "25%", left: `${col * 25}%`, top: row * 129 + 24, alignItems: "center" }}>{l.id === current ? <Float active={active}>{node}</Float> : node}<StarDisplay stars={stars} size={17}/>{l.id === current && <Text style={{ color: "#FFF6D3", backgroundColor: "#343250", paddingHorizontal: 8, borderRadius: 10, fontSize: 13, fontWeight: "900" }}>Next ↑</Text>}</View>;
            })}
          </View>
        </View>;
      })}
    </View>
    <Button disabled={!endlessOpen(p, unlockAll)} onPress={() => onChoose("endless")}>{endlessOpen(p, unlockAll) ? id === "fruit-bat-flight" ? "Free flight ∞" : "Free run ∞" : "Free play opens after World 1"}</Button>
  </View>;
}
export function ScrollingGameScreen({ game, debug = false }: { game: ArcadeGame; debug?: boolean }) {
  const id = game.id as ScrollGame, bat = id === "fruit-bat-flight", store = useStore(), owner = activeLearner(store.save.learning), expected = useMemo(() => ({ epoch: store.epoch, learner: owner.id }), [store.epoch, owner.id]);
  const foreground = useArcadeForeground(), person = arcadeLearner(store.save.arcade, owner.id), p = gameProgress(person, id), { arcade } = store;
  const levels = bat ? flightLevels : runLevels;
  const [level, setLevel] = useState<ScrollLevel | "endless" | null>(null), [playing, setPlaying] = useState(false), [paused, setPaused] = useState(false), [result, setResult] = useState<ArcadeResult | null>(null);
  const [sheet, setSheet] = useState<"settings" | "outfits" | "book" | "chest" | "teach" | "leave" | null>(null), [offer, setOffer] = useState<ChestOffer | null>(null), [round, setRound] = useState(""), [seed, setSeed] = useState(1), [name, setName] = useState(owner.id === "family" ? store.save.players?.[0] ?? "Family" : owner.name), [reminder, setReminder] = useState(false);
  const [teachStart, setTeachStart] = useState(false), credited = useRef(""), scroll = useRef<ScrollView>(null);
  const active = playing && foreground && !paused && !sheet, sound = useArcadeAudio(id, store.save.settings, store.save.arcade?.music ?? false, foreground && !paused, !!sheet);
  const learning = level !== null && level !== "endless" && level.world === "learn";
  useEffect(() => { arcade({ type: "visit", game: id }, expected); }, [arcade, expected, id]);
  useEffect(() => { markArcadePlaying(active); return () => markArcadePlaying(false); }, [active]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Background/focus loss latches an explicit Resume screen.
  useEffect(() => { if (playing && !foreground) setPaused(true); }, [playing, foreground]);
  function top() { scroll.current?.scrollTo({ y: 0, animated: false }); }
  function choose(next: LevelId | "endless") { if (next === "endless" ? !endlessOpen(p, store.save.arcade?.unlockAll) : !levelOpen(p, next, store.save.arcade?.unlockAll)) return; setLevel(next === "endless" ? next : levels.find(l => l.id === next)!); setResult(null); setPlaying(false); setPaused(false); top(); }
  function start() {
    // eslint-disable-next-line react-hooks/purity -- Entropy belongs to this user-invoked new-round action.
    const token = `arcade-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffff).toString(36)}`;
    // eslint-disable-next-line react-hooks/purity -- User-invoked action, never a render calculation.
    setSeed(Math.floor(Math.random() * 0xffffffff)); setRound(token); setResult(null); setPaused(false); setPlaying(true); setSheet(null); if (level === "endless") store.rememberPlayers([name]); top(); sound.tone("coral");
  }
  function teach(startAfter: boolean) { setTeachStart(startAfter); setSheet("teach"); sound.say(scrollSpeech(id, learning)); }
  function chest() { if (person.chest?.game === id) { setOffer(person.chest); setSheet("chest"); sound.tone("sticker"); sound.say("arcade-chest"); } }
  function closeChest() { setSheet(null); setOffer(null); }
  function map() { setLevel(null); setPlaying(false); setPaused(false); setResult(null); setSheet(null); top(); }
  const onResult = useCallback((next: ArcadeResult, helped: boolean) => {
    if (!level || credited.current === round) return; credited.current = round;
    const accepted = arcade({ type: "finish", game: id, level: level === "endless" ? level : level.id, score: next.score, stars: next.stars, round, name }, expected);
    if (!accepted) return;
    if (level !== "endless" && level.world === "learn" && next.cleared) {
      const skill = `num.${level.index >= 5 && level.index % 2 === 0 ? "subtract" : "add"}-within-${level.index < 5 ? 10 : 20}`;
      const config = { enabled: true, subject: "math" as const, operation: "mixed" as const, limit: level.index < 5 ? 10 as const : 20 as const };
      store.recordWarmup([{ skill, helped }], config, round, expected.epoch); store.notePractice(skill, helped, expected.epoch);
    }
    setResult(next); setPlaying(false); setPaused(false); setReminder(arcadeBreakDue(store.save.arcade?.breakMinutes ?? 0)); top(); sound.tone(next.cleared ? "clear" : "shell-0");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Bind the result to this round's learner and restore epoch.
  }, [arcade, id, level, round, name, expected]);
  const nextId = level && level !== "endless" ? allLevelIds[allLevelIds.indexOf(level.id) + 1] : undefined, nextOpen = nextId && levelOpen(p, nextId, store.save.arcade?.unlockAll);
  return <View style={{ flex: 1, backgroundColor: "#FFF7E5" }}>
    {playing && level ? <ScrollBoard key={round} game={id} level={level} seed={seed} active={active} helper={person.helper} outfit={p.outfit} onResult={onResult} onTone={sound.tone} onPause={() => setPaused(true)} debug={debug || __DEV__}/> : <>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "#FFF6DF" }}><Button quiet compact icon="back" onPress={() => level ? map() : router.replace("/arcade")}>{level ? "Map" : "Arcade"}</Button><Text style={{ color: ink, fontSize: 16, fontWeight: "800" }}>{level ? game.name : "Island adventures"}</Text><Button quiet compact onPress={() => setSheet("settings")}>Settings</Button></View>
      <ScrollView ref={scroll} contentContainerStyle={[styles.content, { maxWidth: 1180, paddingHorizontal: 12, paddingTop: 8, gap: 12, flexGrow: 1 }]}>
        <SaveStatus/>
        {!level ? <><WorldMap game={game} person={person} unlockAll={store.save.arcade?.unlockAll ?? false} onChoose={choose} onOutfits={() => setSheet("outfits")} onChest={chest} active={foreground && !sheet}/><Button quiet onPress={() => setSheet("book")}>My sticker book</Button>{store.save.arcade?.scores.some(s => s.game === id) && <View style={{ padding: 18, gap: 8, borderRadius: 22, backgroundColor: game.surface }}><Heading>Family free-play board</Heading>{store.save.arcade.scores.filter(s => s.game === id).sort((a, b) => b.score - a.score).map(s => <Copy key={s.name}>{s.name} · {s.score} points</Copy>)}</View>}</> : <View style={{ flex: 1, minHeight: 620, borderRadius: 28, overflow: "hidden" }}>
          <View style={{ position: "absolute", inset: 0 }}><Scenery game={id} world={level === "endless" ? "w3" : level.world} storm={level !== "endless" && level.storm}/></View>
          <View style={{ alignItems: "center", padding: 16, gap: 12, width: "100%", maxWidth: 550, alignSelf: "center" }}>
            <Float active={foreground && !sheet}><ScrollHero game={id} size={150} outfit={p.outfit} happy={result?.cleared}/></Float>
            <View style={{ width: "100%", borderRadius: 26, padding: 20, gap: 13, backgroundColor: "#FFF7E5", borderWidth: 3, borderColor: "#E5C28A", alignItems: "center" }}>
              {result ? <><Heading style={{ color: ink, fontSize: 30, textAlign: "center" }}>{result.cleared ? bat ? "Golden wings!" : "What a run!" : level === "endless" ? "Your island adventure" : "One more adventure?"}</Heading>{result.cleared && <><Reveal stars={result.stars} onTone={sound.tone} active={foreground && !sheet}/><Celebrate burst={1}/></>}<Copy style={{ textAlign: "center" }}>{result.detail}</Copy><Copy>{result.score} points · {level === "endless" ? `best ${p.best}` : result.cleared ? "stars saved" : "earlier stars are safe"}</Copy>
                {reminder && <View style={{ gap: 8 }}><Copy>A little stretch or a drink? Your stars are saved.</Copy><Button quiet onPress={() => { acknowledgeArcadeBreak(); setReminder(false); }}>Thanks · I’m comfortable</Button></View>}
                {result.cleared && person.chest?.round === round && <PressableScale accessibilityRole="button" accessibilityLabel={`Open sticker chest: ${stickerNames[person.chest.sticker]}`} onPress={chest} style={{ alignItems: "center", padding: 4, width: "100%", borderRadius: 22, backgroundColor: "#F4DEAE" }}><View style={{ flexDirection: "row", alignItems: "center" }}><Float active={foreground && !sheet} wiggle><ChestArt size={110}/></Float><StickerArt id={person.chest.sticker} size={72}/></View><Text style={{ fontWeight: "900", fontSize: 18, color: ink }}>Open your treasure →</Text></PressableScale>}
                {result.cleared && nextOpen && <Button onPress={() => choose(nextId!)}>Next level →</Button>}<Button onPress={start}>{result.cleared || level === "endless" ? "Play again" : "Try again"}</Button><Button quiet onPress={map}>Back to level map</Button>
              </> : <><Copy style={{ fontSize: 14 }}>{level === "endless" ? "Free play ∞" : `${game.worlds.find(w => w.id === level.world)?.name} · ${level.index}`}</Copy><Heading style={{ color: ink, fontSize: 28, textAlign: "center" }}>{level === "endless" ? "Your own adventure" : level.name}</Heading><Copy style={{ textAlign: "center", color: ink, fontSize: 19 }}>{scrollGoal(id, learning)}</Copy><Button quiet compact onPress={() => sound.say(scrollSpeech(id, learning))}>Hear the goal</Button>
                {level === "endless" ? <Copy>Finish whenever you like. Your best stays on this device.</Copy> : <View style={{ gap: 7, width: "100%" }}>{level.goals.map((goal, i) => <View key={goal} style={{ flexDirection: "row", alignItems: "center", gap: 9 }}><StarDisplay stars={i + 1} size={19}/><Copy style={{ flex: 1, fontSize: 16 }}>{goal}</Copy></View>)}</View>}
                <View style={{ width: "100%" }}><ToggleRow label="Helper" value={person.helper} detail={bat ? "Wider gaps. Gentle flaps. Bumps cost a fruit and a moment." : "Slower running. A stumble costs a moment."} onChange={value => arcade({ type: "helper", value }, expected)}/></View>
                {level === "endless" && <TextInput accessibilityLabel="Free-play player name" maxLength={24} value={name} onChangeText={setName} style={[styles.input, { width: "100%" }]}/>}
                <Button onPress={() => p.coached ? start() : teach(true)}>{p.coached ? "Let’s play" : "Show me & play"}</Button><Button quiet compact onPress={() => teach(false)}>Show me</Button>
              </>}
            </View>
          </View>
        </View>}
      </ScrollView>
    </>}
    <Sheet visible={paused && !sheet} title="Taking a breather" onClose={() => setPaused(false)}><Copy>Your adventure is waiting.</Copy><ToggleRow label="Helper" value={person.helper} detail={bat ? "Wider gaps and gentle bumps. Same stars." : "Slower running and gentle stumbles. Same stars."} onChange={value => arcade({ type: "helper", value }, expected)}/><Button onPress={() => setPaused(false)}>Resume play</Button><Button quiet onPress={() => teach(false)}>Show me</Button><Button quiet onPress={() => setSheet("settings")}>Settings</Button><Button quiet onPress={() => setSheet("leave")}>Back to level map</Button></Sheet>
    <Sheet visible={sheet === "teach"} title="Watch our island friend" onClose={() => setSheet(null)}><View style={{ alignItems: "center", gap: 15 }}><Float active={foreground && sheet === "teach"}><ScrollHero game={id} size={145} outfit={p.outfit}/></Float><Heading style={{ textAlign: "center" }}>{scrollGoal(id, learning)}</Heading><Rehearsal game={id} onTone={sound.tone}/><Copy style={{ textAlign: "center" }}>{learning ? "The three shapes carry numbers. Follow the one that answers the sum. A wrong answer comes around again." : bat ? "Tap, then let your wings glide. Stay between the palm leaves. Fruit gives extra stars." : "Swipe left or right, or tap a lane. Swipe up to jump coconuts and crabs. Swipe down to duck leaves and lines. The arrow buttons work too."}</Copy><Button quiet onPress={() => sound.say(scrollSpeech(id, learning))}>Hear it</Button><Button onPress={() => { arcade({ type: "coached", game: id }, expected); if (teachStart) start(); else setSheet(null); }}>I’m ready</Button></View></Sheet>
    <Sheet visible={sheet === "leave"} title="Back to the map?" onClose={() => setSheet(null)}><Copy>This run starts fresh next time. Your stars are safe.</Copy><Button onPress={map}>Leave round · back to map</Button><Button quiet onPress={() => setSheet(null)}>Keep playing</Button></Sheet>
    <Sheet visible={sheet === "outfits"} title={game.hero} onClose={() => setSheet(null)}><OutfitCloset game={game} person={person} onSelect={outfit => arcade({ type: "outfit", game: id, outfit }, expected)}/></Sheet>
    <Sheet visible={sheet === "book"} title="Sticker book" onClose={() => setSheet(null)}><StickerBook person={person}/></Sheet>
    <Sheet visible={sheet === "chest"} title="Your island treasure" onClose={closeChest}><View style={{ alignItems: "center" }}><ChestArt open size={130}/><Celebrate burst={1}/></View>{offer && <TreasureChest key={offer.round} offer={offer} game={game} expected={expected} active={foreground && sheet === "chest"} onClose={closeChest}/>}</Sheet>
    <Settings visible={sheet === "settings"} onClose={() => setSheet(null)}/>
  </View>;
}
