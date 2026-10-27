import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, ScrollView, TextInput, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Copy, Heading, Sheet, ToggleRow, styles } from "../../../components/ui";
import { Text } from "../../../components/Text";
import { Settings } from "../../../components/Settings";
import { SaveStatus } from "../../../components/SaveStatus";
import { nativeDriver, useReducedMotion } from "../../../components/motion";
import { Celebrate } from "../../../learn/Celebrate";
import { activeLearner } from "../../../learn/learners";
import { wordEntry } from "../../../learn/kit/reading";
import { useStore } from "../../../state/Store";
import { StarDisplay } from "../../Art";
import { TreasureChest } from "../../Chest";
import { OutfitCloset, StickerBook } from "../../Collection";
import { useArcadeAudio } from "../../audio";
import { acknowledgeArcadeBreak, arcadeBreakDue, markArcadePlaying } from "../../breakClock";
import { useArcadeForeground } from "../../loop";
import { arcadeLearner, endlessOpen, gameProgress, levelOpen, type ChestOffer } from "../../progress";
import { allLevelIds, type ArcadeGame, type ArcadeLevel, type ArcadeResult, type LevelId } from "../../types";
import { createRail, railLevel, railLevels } from "../rail-parade/engine";
import { RailBoard } from "../rail-parade/View";
import { createCrab, crabLevel, crabLevels } from "../crab-crossing/engine";
import { CrabBoard } from "../crab-crossing/View";
import { ChestArt, GridHero } from "./Art";
import { Bob } from "./Controls";
import { ChestButton, GridMap } from "./Map";
const speech = (crab: boolean, learning: boolean) => `arcade-${crab ? "crab" : "rail"}-${learning ? "learn" : "intro"}`;
export function GridGameScreen({ game, debug = false }: { game: ArcadeGame; debug?: boolean }) {
  const store = useStore(),
    owner = activeLearner(store.save.learning),
    expected = useMemo(() => ({ epoch: store.epoch, learner: owner.id }), [store.epoch, owner.id]),
    person = arcadeLearner(store.save.arcade, owner.id),
    progress = gameProgress(person, game.id),
    foreground = useArcadeForeground(),
    crab = game.id === "crab-crossing";
  const [level, setLevel] = useState<ArcadeLevel | "endless" | null>(null),
    [playing, setPlaying] = useState(false),
    [paused, setPaused] = useState(false),
    [result, setResult] = useState<ArcadeResult | null>(null),
    [sheet, setSheet] = useState<"settings" | "book" | "outfits" | "teach" | "chest" | "leave" | null>(null),
    [offer, setOffer] = useState<ChestOffer | null>(null),
    [seed, setSeed] = useState(1),
    [round, setRound] = useState(""),
    [name, setName] = useState(owner.id === "family" ? (store.save.players?.[0] ?? "Family") : owner.name),
    [reminder, setReminder] = useState(false);
  const credited = useRef(""),
    helped = useRef(false),
    startAfterTeach = useRef(false),
    scroll = useRef<ScrollView>(null),
    { width, height } = useWindowDimensions(),
    insets = useSafeAreaInsets(),
    availableWidth = width - insets.left - insets.right,
    availableHeight = height - insets.top - insets.bottom,
    wide = availableWidth > availableHeight,
    active = foreground && playing && !paused && !sheet,
    learning = !!level && level !== "endless" && level.world === "learn";
  const sound = useArcadeAudio(
      game.id,
      store.save.settings,
      store.save.arcade?.music ?? false,
      foreground && !paused,
      !!sheet
    ),
    { arcade } = store;
  useEffect(() => {
    arcade({ type: "visit", game: game.id }, expected);
  }, [arcade, game.id, expected]);
  useEffect(() => {
    markArcadePlaying(active);
    return () => markArcadePlaying(false);
  }, [active]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- External focus loss must latch a visible pause.
    if (playing && !foreground) setPaused(true);
  }, [playing, foreground]);
  useEffect(() => {
    if (playing && person.helper) helped.current = true;
  }, [playing, person.helper]);
  const toTop = () => scroll.current?.scrollTo({ y: 0, animated: false });
  function choose(id: LevelId | "endless") {
    if (
      id === "endless"
        ? !endlessOpen(progress, store.save.arcade?.unlockAll)
        : !levelOpen(progress, id, store.save.arcade?.unlockAll)
    )
      return;
    setLevel(id === "endless" ? id : crab ? crabLevel(id) : railLevel(id));
    setResult(null);
    setPlaying(false);
    setPaused(false);
    setSheet(null);
    toTop();
  }
  function start() {
    // eslint-disable-next-line react-hooks/purity -- Entropy is created only in this user-triggered round start.
    setRound(`grid-${Date.now().toString(36)}-${Math.floor(Math.random() * 0x1000000).toString(36)}`);
    // eslint-disable-next-line react-hooks/purity -- Pure engines receive this explicit seed.
    setSeed(Math.floor(Math.random() * 0x100000000));
    helped.current = person.helper;
    setResult(null);
    setPlaying(true);
    setPaused(false);
    setSheet(null);
    if (level === "endless") store.rememberPlayers([name]);
    sound.say(speech(crab, learning));
    toTop();
  }
  const onResult = useCallback(
    (r: ArcadeResult) => {
      if (!level || credited.current === round) return;
      credited.current = round;
      if (
        !arcade(
          {
            type: "finish",
            game: game.id,
            level: level === "endless" ? level : level.id,
            stars: r.stars,
            score: r.score,
            round,
            name,
          },
          expected
        )
      )
        return;
      if (level !== "endless" && level.world === "learn" && r.cleared) {
        const word = !crab ? railLevel(level.id).word : undefined,
          skill = word ? wordEntry(word)!.skill : crab ? "num.number-line" : "num.count-on",
          config = {
            enabled: true,
            subject: word ? ("reading" as const) : ("math" as const),
            limit: 10 as const,
            operation: "mixed" as const,
          },
          assistance = helped.current || r.stars < 3;
        store.recordWarmup([{ skill, helped: assistance }], config, round, expected.epoch);
        store.notePractice(skill, assistance, expected.epoch);
      }
      setResult(r);
      setPlaying(false);
      setPaused(false);
      setReminder(arcadeBreakDue(store.save.arcade?.breakMinutes ?? 0));
      sound.tone(r.cleared ? "clear" : "shell-0");
      toTop();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Bind writes to this round, owner and restore epoch; callback services are stable.
    [arcade, game.id, level, round, name, expected, crab]
  );
  function openChest() {
    setOffer(person.chest);
    setSheet("chest");
    sound.say("arcade-chest");
  }
  function closeChest() {
    setSheet(null);
    setOffer(null);
  }
  function leave() {
    setSheet(null);
    setPaused(false);
    setPlaying(false);
    setLevel(null);
    setResult(null);
  }
  function teach(andStart: boolean) {
    startAfterTeach.current = andStart;
    setSheet("teach");
    sound.say(speech(crab, learning));
  }
  const next = level && level !== "endless" ? allLevelIds[allLevelIds.indexOf(level.id) + 1] : undefined,
    nextOpen = next && levelOpen(progress, next, store.save.arcade?.unlockAll),
    maxBoardHeight = availableHeight - (wide ? 115 : 270),
    size = Math.max(160, Math.min(availableWidth - (wide ? 275 : 20), maxBoardHeight * (crab ? 9 / 11 : 1), 830));
  const goal = learning
    ? crab
      ? `${crabLevel((level as ArcadeLevel).id).name}. Hop to the next number.`
      : railLevel((level as ArcadeLevel).id).word
        ? `Spell ${railLevel((level as ArcadeLevel).id).word}. Find each letter.`
        : "Collect the numbers in order."
    : crab
      ? "Look, hop, ride. Reach the seaside burrow!"
      : "Lead the chicks home. Watch for the tree snake!";
  return (
    <View style={{ flex: 1, backgroundColor: crab ? "#123D55" : "#233F43" }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 7,
          minHeight: 62,
          gap: 8,
        }}
      >
        <Button
          quiet
          compact
          icon="back"
          onPress={() => (playing ? setSheet("leave") : level ? leave() : router.replace("/arcade"))}
        >
          {level ? "Map" : "Arcade"}
        </Button>
        <Text style={{ color: "#FFF0C7", fontSize: 19, fontWeight: "900", flexShrink: 1 }}>
          {playing ? (level === "endless" ? "Free play" : `Level ${level?.index}`) : game.name}
        </Text>
        <Button quiet compact onPress={() => (playing ? setPaused(true) : setSheet("settings"))}>
          {playing ? "Ⅱ Pause" : "Settings"}
        </Button>
      </View>
      {playing && level ? (
        <View style={{ flex: 1, paddingHorizontal: 7, paddingBottom: 8 }}>
          <SaveStatus />
          {crab ? (
            <CrabBoard
              key={round}
              initial={createCrab(level === "endless" ? level : crabLevel(level.id), seed, person.helper)}
              active={active}
              helper={person.helper}
              outfit={progress.outfit}
              onResult={onResult}
              onTone={sound.tone}
              size={size}
              wide={wide}
              debug={debug || __DEV__}
            />
          ) : (
            <RailBoard
              key={round}
              initial={createRail(level === "endless" ? level : railLevel(level.id), seed, person.helper)}
              active={active}
              helper={person.helper}
              outfit={progress.outfit}
              onResult={onResult}
              onTone={sound.tone}
              size={size}
              wide={wide}
              debug={debug || __DEV__}
            />
          )}
        </View>
      ) : (
        <ScrollView
          ref={scroll}
          contentContainerStyle={{ alignItems: "center", padding: 12, gap: 12, paddingBottom: 30 }}
        >
          <SaveStatus />
          {!level ? (
            <GridMap
              game={game}
              person={person}
              levels={crab ? crabLevels : railLevels}
              unlockAll={store.save.arcade?.unlockAll ?? false}
              onLevel={choose}
              onOutfits={() => setSheet("outfits")}
              onChest={openChest}
              onBook={() => setSheet("book")}
            />
          ) : result ? (
            <View
              style={{
                width: "100%",
                maxWidth: 680,
                gap: 16,
                alignItems: "center",
                padding: 18,
                backgroundColor: "#FFEFCA",
                borderRadius: 30,
              }}
            >
              <Bob>
                <GridHero crab={crab} size={155} outfit={progress.outfit} happy={result.cleared} />
              </Bob>
              {result.cleared && <Celebrate burst={1} big />}
              <Heading style={{ fontSize: 30, textAlign: "center" }}>
                {result.cleared
                  ? crab
                    ? "Home by the sea!"
                    : "Parade party!"
                  : level === "endless"
                    ? "What an adventure!"
                    : "One more adventure?"}
              </Heading>
              {result.cleared && <StarReveal stars={result.stars} onTone={sound.tone} />}
              <Copy>
                {result.score} points · {result.detail}
              </Copy>
              <Copy style={{ fontSize: 14 }}>
                {result.cleared ? "Stars saved. Helper earns the same stars." : "Your earlier stars are safe."}
              </Copy>
              {reminder && (
                <>
                  <Heading>A little island break?</Heading>
                  <Copy>Stretch or have a drink. Your stars are saved.</Copy>
                  <Button
                    quiet
                    onPress={() => {
                      acknowledgeArcadeBreak();
                      setReminder(false);
                    }}
                  >
                    Thanks · I’m comfortable
                  </Button>
                </>
              )}
              {result.cleared && person.chest?.round === round && (
                <ChestButton sticker={person.chest.sticker} onPress={openChest} />
              )}
              <View style={{ gap: 9, width: "100%" }}>
                {nextOpen && result.cleared && <Button onPress={() => choose(next!)}>Next adventure →</Button>}
                <Button onPress={start}>Play again</Button>
                <Button quiet onPress={leave}>
                  Back to level map
                </Button>
              </View>
            </View>
          ) : (
            <View
              style={{
                width: "100%",
                maxWidth: 620,
                alignItems: "center",
                gap: 14,
                padding: 20,
                backgroundColor: "#FFF0CE",
                borderRadius: 30,
              }}
            >
              <Bob>
                <GridHero crab={crab} size={wide ? 110 : 145} outfit={progress.outfit} />
              </Bob>
              <Copy style={{ fontSize: 14 }}>
                {level === "endless"
                  ? "FREE PLAY"
                  : `${game.worlds.find((w) => w.id === level.world)?.name} · ${level.index}`}
              </Copy>
              <Heading style={{ fontSize: 29, textAlign: "center" }}>
                {level === "endless" ? "Your own adventure" : level.name}
              </Heading>
              <Copy style={{ textAlign: "center", color: "#34585A" }}>{goal}</Copy>
              <Button quiet compact onPress={() => sound.say(speech(crab, learning))}>
                Hear the goal
              </Button>
              {level === "endless" ? (
                <>
                  <Copy>Finish whenever you like. Your best stays here.</Copy>
                  <TextInput
                    accessibilityLabel="Free-play player name"
                    maxLength={24}
                    value={name}
                    onChangeText={setName}
                    style={[styles.input, { width: "100%" }]}
                  />
                </>
              ) : (
                <View style={{ width: "100%", gap: 7 }}>
                  {level.goals.map((g, i) => (
                    <View key={i} style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                      <StarDisplay stars={i + 1} size={16} />
                      <Copy style={{ flex: 1, fontSize: 14 }}>{g}</Copy>
                    </View>
                  ))}
                </View>
              )}
              <View style={{ width: "100%" }}>
                <ToggleRow
                  label="Helper"
                  detail={
                    crab
                      ? "Slower lanes, safe retries, and an extra island."
                      : "Slower parade. A bump costs a chick; keep going."
                  }
                  value={person.helper}
                  onChange={(value) => arcade({ type: "helper", value }, expected)}
                />
              </View>
              <Button onPress={() => (progress.coached ? start() : teach(true))}>
                {progress.coached ? "Let’s play!" : "Show me & play"}
              </Button>
              <Button quiet compact onPress={() => teach(false)}>
                Show me how
              </Button>
            </View>
          )}
          {!level && !!store.save.arcade?.scores.some((s) => s.game === game.id) && (
            <View style={{ backgroundColor: "#FFF0CF", borderRadius: 22, padding: 15, gap: 6 }}>
              <Heading>Family free-play board</Heading>
              {store.save.arcade.scores
                .filter((s) => s.game === game.id)
                .map((s) => (
                  <Copy key={s.name}>
                    {s.name} · {s.score} points
                  </Copy>
                ))}
            </View>
          )}
        </ScrollView>
      )}
      <Sheet visible={paused && !sheet} title="Taking a breather" onClose={() => setPaused(false)}>
        <Copy>Your adventure is waiting.</Copy>
        <ToggleRow
          label="Helper"
          detail={crab ? "Slower lanes and safe retries." : "Slower steps and gentle bumps."}
          value={person.helper}
          onChange={(value) => arcade({ type: "helper", value }, expected)}
        />
        <Button onPress={() => setPaused(false)}>Resume play</Button>
        <Button quiet onPress={() => teach(false)}>
          Show me how
        </Button>
        <Button quiet onPress={leave}>
          Back to level map
        </Button>
      </Sheet>
      <Sheet visible={sheet === "leave"} title="Back to the map?" onClose={() => setSheet(null)}>
        <Copy>This round starts fresh next time. Your stars and stickers are saved.</Copy>
        <Button onPress={leave}>Leave round · back to map</Button>
        <Button quiet onPress={() => setSheet(null)}>
          Keep playing
        </Button>
      </Sheet>
      <Sheet
        visible={sheet === "teach"}
        title="Show me"
        onClose={() => {
          setSheet(null);
          startAfterTeach.current = false;
        }}
      >
        <GridTeaching crab={crab} learning={learning} />
        <Copy style={{ textAlign: "center" }}>{goal}</Copy>
        <Copy>
          {learning
            ? "The world waits for your next swipe. Take all the time you need."
            : crab
              ? "Tap an arrow to hop. Wait on the sand, look for traffic gaps, and ride the wide logs."
              : "Mama walks on her own. Swipe or tap to turn. Avoid the edge, the parade, and the brown tree snake."}
        </Copy>
        <Button quiet onPress={() => sound.say(speech(crab, learning))}>
          Hear how to play
        </Button>
        <Button
          onPress={() => {
            arcade({ type: "coached", game: game.id }, expected);
            if (startAfterTeach.current) start();
            else setSheet(null);
          }}
        >
          I’m ready · let’s play
        </Button>
      </Sheet>
      <Sheet visible={sheet === "book"} title="Sticker book" onClose={() => setSheet(null)}>
        <StickerBook person={person} />
      </Sheet>
      <Sheet visible={sheet === "outfits"} title={game.hero} onClose={() => setSheet(null)}>
        <OutfitCloset
          game={game}
          person={person}
          onSelect={(outfit) => arcade({ type: "outfit", game: game.id, outfit }, expected)}
        />
      </Sheet>
      <Sheet visible={sheet === "chest"} title="A little treasure" onClose={closeChest}>
        <View style={{ alignItems: "center" }}>
          <Bob>
            <ChestArt size={110} open />
          </Bob>
          <Celebrate burst={1} />
        </View>
        {offer?.game === game.id && (
          <TreasureChest
            key={offer.round}
            offer={offer}
            game={game}
            expected={expected}
            active={foreground && sheet === "chest"}
            onClose={closeChest}
          />
        )}
      </Sheet>
      <Settings visible={sheet === "settings"} onClose={() => setSheet(null)} />
    </View>
  );
}
function StarReveal({ stars, onTone }: { stars: number; onTone: (s: string, haptic?: boolean) => void }) {
  const [shown, setShown] = useState(0),
    reduced = useReducedMotion(),
    tone = useRef(onTone);
  useEffect(() => {
    tone.current = onTone;
  }, [onTone]);
  useEffect(() => {
    const timers = Array.from({ length: stars }, (_, i) =>
      setTimeout(
        () => {
          setShown(i + 1);
          tone.current("shell-" + (i + 2));
        },
        reduced ? 0 : 200 + i * 280
      )
    );
    return () => timers.forEach(clearTimeout);
  }, [stars, reduced]);
  return <StarDisplay stars={shown} size={48} />;
}
function GridTeaching({ crab, learning }: { crab: boolean; learning: boolean }) {
  const reduced = useReducedMotion(),
    [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) {
      v.setValue(1);
      return;
    }
    const a = Animated.loop(
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(v, { toValue: 1, duration: 550, useNativeDriver: nativeDriver }),
        Animated.delay(900),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: nativeDriver }),
      ])
    );
    a.start();
    return () => a.stop();
  }, [v, reduced]);
  return (
    <View
      style={{
        width: 280,
        height: 130,
        alignSelf: "center",
        borderRadius: 24,
        backgroundColor: crab ? "#65AFB3" : "#6E9864",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <Text style={{ position: "absolute", left: 140, color: "#FFF0C1", fontSize: 35 }}>→</Text>
      <View
        style={{
          position: "absolute",
          left: 200,
          width: 60,
          height: 60,
          backgroundColor: "#FFE6AA",
          borderRadius: 20,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {learning ? <Heading>1</Heading> : <GridHero chick={!crab} crab={crab} size={50} />}
      </View>
      <Animated.View
        style={{
          width: 75,
          transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [20, 120] }) }],
        }}
      >
        <GridHero crab={crab} size={75} />
      </Animated.View>
    </View>
  );
}
