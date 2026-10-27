import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button, Chip, Copy, Heading, Sheet, ToggleRow, styles } from "../../components/ui";
import { Settings } from "../../components/Settings";
import { SaveStatus } from "../../components/SaveStatus";
import { useReducedMotion } from "../../components/motion";
import { activeLearner } from "../../learn/learners";
import { Celebrate } from "../../learn/Celebrate";
import { newMatch, settle, type Match } from "../../games/match";
import { useStore } from "../../state/Store";
import { StarDisplay, StickerArt } from "../Art";
import { TreasureChest } from "../Chest";
import { OutfitCloset, StickerBook } from "../Collection";
import { acknowledgeArcadeBreak, arcadeBreakDue, markArcadePlaying } from "../breakClock";
import { useArcadeAudio } from "../audio";
import { useArcadeForeground } from "../loop";
import { arcadeLearner, endlessOpen, gameProgress, levelOpen, type ChestOffer } from "../progress";
import { allLevelIds, type ArcadeGame, type ArcadeLevel, type ArcadeResult, type LevelId } from "../types";
import { createPalm, palmLevel, palmLevels } from "../games/palm-patrol/engine";
import { beachLevel, beachLevels, createBeach, type Strength } from "../games/beach-ball/engine";
import { ActionHero, BallArt, BeetleArt, ChestArt, HuskArt, Scene } from "./Art";
import { ActionMap, Bob } from "./Map";
import { BeachBoard, PalmBoard } from "./Playfield";
export const actionInstruction = (palm: boolean, learning: boolean, together = false) =>
  palm
    ? learning
      ? "Toss at the answer that matches."
      : "Slide to aim. Tap to toss beetles into nets!"
    : together
      ? "Drag your paddle. Play from opposite ends!"
      : learning
        ? "Return the ball. Count each splash together!"
        : "Drag your paddle. Bounce the ball past your buddy!";
function speechKey(palm: boolean, learning: boolean, together: boolean) {
  return palm
    ? learning
      ? "arcade-palm-math"
      : "arcade-palm-intro"
    : together
      ? "arcade-beach-together"
      : learning
        ? "arcade-beach-count"
        : "arcade-beach-intro";
}
function StarReveal({ count, onTone }: { count: number; onTone: (key: string) => void }) {
  const reduced = useReducedMotion(),
    [shown, setShown] = useState(0),
    tone = useRef(onTone);
  useEffect(() => {
    tone.current = onTone;
  }, [onTone]);
  useEffect(() => {
    const timers = Array.from({ length: count }, (_, i) =>
      setTimeout(
        () => {
          setShown(i + 1);
          tone.current("shell-" + i);
        },
        reduced ? 0 : 250 + i * 400
      )
    );
    return () => timers.forEach(clearTimeout);
  }, [count, reduced]);
  return <StarDisplay stars={shown} size={48} />;
}
function Demo({ palm, learning }: { palm: boolean; learning: boolean }) {
  return (
    <View
      style={{
        width: 290,
        height: 160,
        overflow: "hidden",
        borderRadius: 24,
        backgroundColor: "#266E78",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {palm ? (
        <>
          <View style={{ flexDirection: "row", gap: 38 }}>
            <View>
              <BeetleArt size={65} />
              {learning && <Heading style={{ color: "#FFF5CF", textAlign: "center" }}>4</Heading>}
            </View>
            <View>
              <BeetleArt size={65} />
              {learning && <Heading style={{ color: "#FFF5CF", textAlign: "center" }}>5 ✓</Heading>}
            </View>
          </View>
          <Bob>
            <HuskArt size={38} />
          </Bob>
          <Heading style={{ color: "#FFF5CF", fontSize: 20 }}>{learning ? "2 + 3 = 5" : "↑ Slide & toss ↑"}</Heading>
        </>
      ) : (
        <>
          <View style={{ backgroundColor: "#EC8177", width: 100, height: 16, borderRadius: 12 }} />
          <Bob>
            <BallArt size={60} />
          </Bob>
          <View style={{ backgroundColor: "#56D7BE", width: 100, height: 16, borderRadius: 12 }} />
          <Heading style={{ color: "#FFF5CF", fontSize: 20 }}>← Drag your paddle →</Heading>
        </>
      )}
    </View>
  );
}
export function ActionGameScreen({ game, debug }: { game: ArcadeGame; debug: boolean }) {
  const store = useStore(),
    owner = activeLearner(store.save.learning),
    expected = useMemo(() => ({ epoch: store.epoch, learner: owner.id }), [store.epoch, owner.id]),
    { arcade } = store,
    person = arcadeLearner(store.save.arcade, owner.id),
    p = gameProgress(person, game.id),
    palm = game.id === "palm-patrol",
    foreground = useArcadeForeground();
  const [level, setLevel] = useState<ArcadeLevel | "endless" | null>(null),
    [playing, setPlaying] = useState(false),
    [paused, setPaused] = useState(false),
    [result, setResult] = useState<ArcadeResult | null>(null),
    [sheet, setSheet] = useState<"book" | "outfits" | "settings" | "teach" | "chest" | "leave" | null>(null),
    [offer, setOffer] = useState<ChestOffer | null>(null),
    [round, setRound] = useState(""),
    [seed, setSeed] = useState(1),
    [mode, setMode] = useState<"solo" | "together">("solo"),
    [strength, setStrength] = useState<Strength>("gentle"),
    [match, setMatch] = useState<Match>(() => newMatch(store.save.players)),
    [name, setName] = useState(owner.id === "family" ? (store.save.players?.[0] ?? "Family") : owner.name),
    [reminder, setReminder] = useState(false);
  const credited = useRef(""),
    startAfterTeach = useRef(false),
    active = foreground && playing && !paused && !sheet,
    sound = useArcadeAudio(
      game.id,
      store.save.settings,
      store.save.arcade?.music ?? false,
      foreground && !paused,
      !!sheet
    );
  const learning = !!level && level !== "endless" && level.world === "learn",
    together = !palm && mode === "together",
    levels = palm ? palmLevels : beachLevels,
    names: [string, string] = together
      ? match.names
      : [name, { gentle: "Bibi", steady: "Bibi ••", zippy: "Bibi •••" }[strength]];
  useEffect(() => {
    arcade({ type: "visit", game: game.id }, expected);
  }, [arcade, game.id, expected]);
  useEffect(() => {
    markArcadePlaying(active);
    return () => markArcadePlaying(false);
  }, [active]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Latch visible pause after external focus/background loss.
    if (playing && !foreground) setPaused(true);
  }, [playing, foreground]);
  function choose(id: LevelId | "endless") {
    if (
      id === "endless" ? !endlessOpen(p, store.save.arcade?.unlockAll) : !levelOpen(p, id, store.save.arcade?.unlockAll)
    )
      return;
    setLevel(id === "endless" ? id : palm ? palmLevel(id) : beachLevel(id));
    setPlaying(false);
    setResult(null);
    setPaused(false);
  }
  function start() {
    setRound(`action-${Date.now().toString(36)}-${Math.floor(Math.random() * 0x1000000).toString(36)}`);
    setSeed(Math.floor(Math.random() * 0x100000000));
    setResult(null);
    setPlaying(true);
    setPaused(false);
    setSheet(null);
    if (together) setMatch((m) => ({ ...m, names: newMatch(m.names).names }));
    store.rememberPlayers(together ? match.names : [name]);
    sound.say(speechKey(palm, learning, together));
  }
  function teach(andStart: boolean) {
    startAfterTeach.current = andStart;
    setSheet("teach");
    sound.say(speechKey(palm, learning, together));
  }
  function map() {
    setPlaying(false);
    setLevel(null);
    setResult(null);
    setPaused(false);
    setSheet(null);
  }
  function openChest(chest = person.chest) {
    if (chest?.game === game.id) {
      setOffer(chest);
      setSheet("chest");
      sound.tone("sticker");
    }
  }
  function onResult(next: ArcadeResult, winner?: 0 | 1 | null, assisted = person.helper) {
    if (!level || !round || credited.current === round) return;
    credited.current = round;
    arcade(
      {
        type: "finish",
        game: game.id,
        level: level === "endless" ? level : level.id,
        stars: next.stars,
        score: next.score,
        round,
        name: together ? match.names.join(" & ").slice(0, 24) : name,
      },
      expected
    );
    if (together && winner != null) setMatch((m) => settle(m, winner));
    if (learning && palm && next.cleared) {
      const skill =
          typeof level === "object" && (level.index === 4 || level.index >= 7)
            ? "num.subtract-within-20"
            : "num.add-within-20",
        config = { enabled: true, subject: "math" as const, limit: 10 as const, operation: "mixed" as const };
      store.recordWarmup([{ skill, helped: assisted }], config, round, expected.epoch);
      store.notePractice(skill, assisted, expected.epoch);
    }
    // Beach counting is shared play rather than evidence of an independently answered math fact. Its chest records the actual practice result.
    setReminder(arcadeBreakDue(store.save.arcade?.breakMinutes ?? 0));
    setResult(next);
    setPlaying(false);
    setPaused(false);
    sound.tone(next.cleared ? "clear" : "shell-2");
    // Result binds to the active learner/restore epoch and exact round captured above.
  }
  const nextId = level && level !== "endless" ? allLevelIds[allLevelIds.indexOf(level.id) + 1] : undefined;
  function helperToggle() {
    arcade({ type: "helper", value: !person.helper }, expected);
  }
  return (
    <View style={{ flex: 1, backgroundColor: "#173F58" }}>
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 5,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 5,
          backgroundColor: "#FFF2D3",
        }}
      >
        <Button
          quiet
          compact
          icon="back"
          onPress={() => (playing ? setSheet("leave") : level ? map() : router.replace("/arcade"))}
        >
          {level ? "Map" : "Arcade"}
        </Button>
        <Heading style={{ fontSize: 20, color: "#214F59", flexShrink: 1 }}>{game.name}</Heading>
        <Button
          quiet
          compact
          label={playing ? "Pause game" : "Game settings"}
          onPress={() => (playing ? setPaused(true) : setSheet("settings"))}
        >
          {playing ? "Ⅱ Pause" : "Settings"}
        </Button>
      </View>
      {playing && level ? (
        palm ? (
          <PalmBoard
            key={round}
            initial={createPalm(level === "endless" ? level : palmLevel(level.id), seed, person.helper)}
            active={active}
            helper={person.helper}
            outfit={p.outfit}
            onResult={(r, assisted) => onResult(r, undefined, assisted)}
            onTone={sound.tone}
            debug={debug || __DEV__}
          />
        ) : (
          <BeachBoard
            key={round}
            initial={createBeach(
              level === "endless" ? level : beachLevel(level.id),
              seed,
              person.helper,
              mode,
              strength
            )}
            active={active}
            helper={person.helper}
            onResult={onResult}
            onTone={sound.tone}
            debug={debug || __DEV__}
            names={names}
          />
        )
      ) : (
        <ScrollView
          key={result ? "result" : level ? "start" : "map"}
          contentContainerStyle={{ padding: 14, gap: 16, alignItems: "center", flexGrow: 1 }}
        >
          <SaveStatus />
          {!level ? (
            <>
              <ActionMap
                game={game}
                person={person}
                levels={levels}
                unlockAll={store.save.arcade?.unlockAll ?? false}
                onLevel={choose}
                onOutfits={() => setSheet("outfits")}
              />
              {person.chest?.game === game.id && (
                <Button onPress={() => openChest()}>Your sticker chest is waiting</Button>
              )}
              <Button quiet onPress={() => setSheet("book")}>
                My sticker book
              </Button>
              {!!store.save.arcade?.scores.some((s) => s.game === game.id) && (
                <View
                  style={{
                    width: "100%",
                    maxWidth: 600,
                    backgroundColor: "#FFF1CE",
                    borderRadius: 22,
                    padding: 16,
                    gap: 6,
                  }}
                >
                  <Heading style={{ fontSize: 23 }}>Family free-play board</Heading>
                  {store.save.arcade.scores
                    .filter((s) => s.game === game.id)
                    .map((s) => (
                      <Copy key={s.name}>
                        {s.name} · {s.score}
                      </Copy>
                    ))}
                </View>
              )}
            </>
          ) : result ? (
            <View
              style={{
                maxWidth: 620,
                width: "100%",
                gap: 16,
                alignItems: "center",
                padding: 20,
                borderRadius: 30,
                backgroundColor: "#FFF1CE",
              }}
            >
              <View>
                <Bob>
                  <ActionHero palm={palm} size={140} outfit={p.outfit} happy={result.cleared} />
                </Bob>
                {result.cleared && <Celebrate burst={1} big />}
              </View>
              <Heading style={{ fontSize: 30, textAlign: "center" }}>
                {result.cleared
                  ? palm
                    ? "Happy palms!"
                    : "What a splash!"
                  : level === "endless"
                    ? "A lovely place to stop"
                    : "Another sunny try?"}
              </Heading>
              {result.cleared && <StarReveal count={result.stars} onTone={sound.tone} />}
              <Copy>{result.detail}</Copy>
              <Copy>
                {result.score} points · {result.cleared ? "stars saved" : "your earlier stars are safe"}
              </Copy>
              {together && (
                <Heading style={{ fontSize: 21, textAlign: "center" }}>
                  {match.names[0]} {match.wins[0]} : {match.wins[1]} {match.names[1]}
                </Heading>
              )}
              {reminder && (
                <View style={{ gap: 8 }}>
                  <Heading>A little island break?</Heading>
                  <Copy>Your stars are saved. Stretch, drink some water, or keep playing.</Copy>
                  <Button
                    onPress={() => {
                      acknowledgeArcadeBreak();
                      setReminder(false);
                    }}
                  >
                    Thanks · I’m comfortable
                  </Button>
                </View>
              )}
              {result.cleared && person.chest?.round === round && (
                <PressChest sticker={person.chest.sticker} onPress={() => openChest()} />
              )}
              {result.cleared && nextId && levelOpen(p, nextId, store.save.arcade?.unlockAll) && (
                <Button onPress={() => choose(nextId)}>Next level →</Button>
              )}
              <Button onPress={start}>Play again</Button>
              <Button quiet onPress={map}>
                Back to level map
              </Button>
            </View>
          ) : (
            <View
              style={{
                maxWidth: 620,
                width: "100%",
                gap: 13,
                alignItems: "center",
                borderRadius: 30,
                backgroundColor: "#FFF1CE",
                overflow: "hidden",
                paddingBottom: 20,
              }}
            >
              <View
                style={{
                  height: 160,
                  width: "100%",
                  overflow: "hidden",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Scene palm={palm} world={level === "endless" ? "w3" : level.world} width={620} height={240} />
                <Bob>
                  <ActionHero palm={palm} size={135} outfit={p.outfit} />
                </Bob>
              </View>
              <Copy style={{ fontSize: 14 }}>
                {level === "endless"
                  ? "Free play ∞"
                  : `${game.worlds.find((w) => w.id === level.world)?.name} · ${level.index}`}
              </Copy>
              <Heading style={{ fontSize: 28 }}>{level === "endless" ? "A beach of your own" : level.name}</Heading>
              <Heading style={{ textAlign: "center", fontSize: 20, paddingHorizontal: 12 }}>
                {actionInstruction(palm, learning, together)}
              </Heading>
              <View style={{ gap: 8, width: "100%", paddingHorizontal: 20 }}>
                {level === "endless" ? (
                  <Copy>Finish whenever you like. Your best stays on this device.</Copy>
                ) : (
                  level.goals.map((goal, i) => (
                    <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                      <StarDisplay stars={i + 1} size={18} />
                      <Copy style={{ fontSize: 15, flex: 1 }}>{goal}</Copy>
                    </View>
                  ))
                )}
              </View>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                <Chip selected={person.helper} onPress={helperToggle}>
                  ♧ Helper {person.helper ? "on" : "off"}
                </Chip>
                <Button quiet compact onPress={() => teach(false)}>
                  Show me
                </Button>
              </View>
              {!palm && (
                <View style={{ gap: 10, width: "100%", paddingHorizontal: 18 }}>
                  <View style={{ flexDirection: "row", gap: 8, justifyContent: "center" }}>
                    <Chip selected={mode === "solo"} onPress={() => setMode("solo")}>
                      With Bibi
                    </Chip>
                    <Chip selected={mode === "together"} onPress={() => setMode("together")}>
                      2 players
                    </Chip>
                  </View>
                  {together ? (
                    <>
                      <Copy style={{ textAlign: "center" }}>Sit at opposite ends. Both paddles move at once.</Copy>
                      {match.names.map((n, i) => (
                        <TextInput
                          key={i}
                          accessibilityLabel={`Player ${i + 1} name`}
                          value={n}
                          maxLength={16}
                          onChangeText={(value) =>
                            setMatch((m) => {
                              const next = newMatch(m.names.map((n, j) => (i === j ? value : n)));
                              return {
                                ...next,
                                names: next.names.map((n, j) => (i === j ? value : n)) as [string, string],
                              };
                            })
                          }
                          onEndEditing={() => setMatch((m) => newMatch(m.names))}
                          style={styles.input}
                        />
                      ))}
                      <Copy style={{ textAlign: "center" }}>
                        Family match · {match.wins[0]} : {match.wins[1]}
                      </Copy>
                    </>
                  ) : (
                    <View style={{ flexDirection: "row", gap: 7, justifyContent: "center", flexWrap: "wrap" }}>
                      {(["gentle", "steady", "zippy"] as const).map((s) => (
                        <Chip key={s} selected={strength === s} onPress={() => setStrength(s)}>
                          {s === "gentle" ? "• Gentle" : s === "steady" ? "•• Steady" : "••• Zippy"}
                        </Chip>
                      ))}
                    </View>
                  )}
                </View>
              )}
              {level === "endless" && !together && (
                <TextInput
                  accessibilityLabel="Free-play player name"
                  value={name}
                  maxLength={24}
                  onChangeText={setName}
                  style={[styles.input, { width: "85%" }]}
                />
              )}
              <Button onPress={() => (p.coached ? start() : teach(true))}>Let’s play →</Button>
            </View>
          )}
        </ScrollView>
      )}
      <Sheet visible={paused && !sheet} title="A little breather" onClose={() => setPaused(false)}>
        <Copy>Everything is waiting right here.</Copy>
        <ToggleRow
          label="Helper"
          detail={
            palm ? "Slower beetles & automatic husk tosses. Same stars." : "Wider paddles & a slower ball. Same stars."
          }
          value={person.helper}
          onChange={helperToggle}
        />
        <Button onPress={() => setPaused(false)}>Resume play</Button>
        <Button
          quiet
          onPress={() => {
            setPaused(false);
            teach(false);
          }}
        >
          Show me
        </Button>
        <Button quiet onPress={map}>
          Back to level map
        </Button>
      </Sheet>
      <Sheet visible={sheet === "leave"} title="Back to the map?" onClose={() => setSheet(null)}>
        <Copy>This round starts fresh next time. Your stars and stickers are safe.</Copy>
        <Button onPress={map}>Leave round · back to map</Button>
        <Button quiet onPress={() => setSheet(null)}>
          Keep playing
        </Button>
      </Sheet>
      <Sheet
        visible={sheet === "teach"}
        title="Show me"
        onClose={() => {
          startAfterTeach.current = false;
          setSheet(null);
        }}
      >
        <View style={{ alignItems: "center", gap: 16 }}>
          <Demo palm={palm} learning={learning} />
          <Heading style={{ fontSize: 24, textAlign: "center" }}>{actionInstruction(palm, learning, together)}</Heading>
          <Copy style={{ textAlign: "center" }}>
            {palm
              ? learning
                ? "The matching number catches a husk. Other numbers bounce it back. Take as long as you like."
                : "Slide anywhere to move Coco. Tap to toss. Fronds bounce beetles back; each frond can take 3 bumps. Beetles fly away dizzy into nets."
              : together
                ? "Player 1 is ● at the bottom. Player 2 is ◆ at the top. Drag in your own half. First to the star goal wins!"
                : "You are ● at the bottom. Drag in your half to return the ball. Hit with the paddle’s edge to angle the ball."}
          </Copy>
          <Copy style={{ fontSize: 14 }}>
            Helper {palm ? "slows beetles and tosses for you" : "widens paddles and slows the ball"}. Stars stay
            earnable.
          </Copy>
          <Button quiet onPress={() => sound.say(speechKey(palm, learning, together))}>
            Hear the goal
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
        </View>
      </Sheet>
      <Sheet
        visible={sheet === "chest"}
        title="A little treasure"
        onClose={() => {
          setSheet(null);
          setOffer(null);
        }}
      >
        {offer?.game === game.id && (
          <>
            <View style={{ alignItems: "center" }}>
              <Bob wiggle>
                <ChestArt size={110} open />
              </Bob>
              <Celebrate burst={1} />
            </View>
            <TreasureChest
              key={offer.round}
              offer={offer}
              game={game}
              expected={expected}
              active={foreground && sheet === "chest"}
              onClose={() => {
                setSheet(null);
                setOffer(null);
              }}
            />
          </>
        )}
      </Sheet>
      <Sheet visible={sheet === "outfits"} title={game.hero} onClose={() => setSheet(null)}>
        <OutfitCloset
          game={game}
          person={person}
          onSelect={(outfit) => arcade({ type: "outfit", game: game.id, outfit }, expected)}
        />
      </Sheet>
      <Sheet visible={sheet === "book"} title="Sticker book" onClose={() => setSheet(null)}>
        <StickerBook person={person} />
      </Sheet>
      <Settings visible={sheet === "settings"} onClose={() => setSheet(null)} />
    </View>
  );
}
function PressChest({ sticker, onPress }: { sticker: ChestOffer["sticker"]; onPress: () => void }) {
  return (
    <View style={{ alignItems: "center", gap: 4 }}>
      <Bob wiggle>
        <View>
          <ChestArt size={125} />
          <View pointerEvents="none" style={{ position: "absolute", top: 33, left: 43 }}>
            <StickerArt id={sticker} size={40} />
          </View>
        </View>
      </Bob>
      <Button onPress={onPress}>Open my sticker chest</Button>
    </View>
  );
}
