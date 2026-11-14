import React, { useCallback, useState } from "react";
import { registerRootComponent } from "expo";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Button, C, Copy, Heading } from "../../src/components/ui";
import { useSoundControls } from "../../src/components/Audio";
import { PartsBoard } from "../../src/learn/games/sound-boat/parts-view";
import { ChallengeBoard } from "../../src/learn/games/sound-boat/challenge-view";
import { challengeEngine, type Action as ChallengeAction } from "../../src/learn/games/sound-boat/challenge-engine";
import { createParts, tasksOf, type PartsLevel, type PartsState } from "../../src/learn/games/sound-boat/parts";
import { taskOfParts } from "../../src/learn/reading/build";
import fixture from "../../tests/fixtures/reading/sound-boat-parts.fixture.json";
import type { PartsWord } from "../../src/learn/reading/records";

// Separate entry, separate app identifier. The word-part records are TEST ONLY fixtures: no review, never shipped.
// Production Expo Router imports neither this file nor the fixture.
const records = fixture.records as unknown as PartsWord[];
const tasks = tasksOf(records);
function App() {
  const { width, height } = useWindowDimensions();
  const sound = useSoundControls(true);
  const [level, setLevel] = useState<PartsLevel>(4);
  const [mode, setMode] = useState<"school" | "challenge">("school");
  const [round, setRound] = useState(0);
  const fresh = useCallback((l: PartsLevel, n: number) => createParts(l, tasks, { skills: {}, rng: () => ((n * 7 + l) % 10) / 10, starter: 0, today: 1 }), []);
  const [state, setState] = useState<PartsState>(() => fresh(4, 0));
  const first = taskOfParts(records.find((r) => r.level === level)!);
  const [challenge, setChallenge] = useState(() => challengeEngine.create(first, { version: 1 }, { supportOff: false, ownRead: false }));
  const select = (l: PartsLevel) => { setLevel(l); setRound((n) => n + 1); setState(fresh(l, round + 1)); setChallenge(challengeEngine.create(taskOfParts(records.find((r) => r.level === l)!), { version: 1 }, { supportOff: false, ownRead: false })); };
  const session = { game: "sound-boat" as const, version: 1 as const, id: `fx-${level}-${round}`, revision: 1, options: { mode: "solo" as const, pace: "easy" as const, stage: level === 4 ? ("stretch" as const) : ("deep" as const) }, state };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <Heading maxFontSizeMultiplier={1.5}>Sound Boat parts — fixture words</Heading>
        <Copy maxFontSizeMultiplier={1.3} style={{ color: C.muted }}>Harness only. Test records, not reviewed.</Copy>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Button compact quiet={level !== 4} onPress={() => select(4)}>Level 4</Button>
          <Button compact quiet={level !== 5} onPress={() => select(5)}>Level 5</Button>
          <Button compact quiet={mode !== "school"} onPress={() => setMode("school")}>School</Button>
          <Button compact quiet={mode !== "challenge"} onPress={() => setMode("challenge")}>Challenge</Button>
        </View>
        {mode === "school" ? (
          <PartsBoard
            key={session.id}
            session={session}
            skills={{}}
            update={setState}
            practice={() => undefined}
            assistance={() => undefined}
            sound={(key) => sound.play(key)}
            stopSound={sound.stop}
            soundOn
            width={Math.min(width - 40, 560)}
            height={height}
            active
            coach={{ active: false, done: () => undefined }}
            cheer={() => sound.play("win", true)}
            tasks={tasks}
          />
        ) : (
          <ChallengeBoard
            key={session.id}
            state={challenge}
            dispatch={(a: ChallengeAction) => setChallenge((s) => challengeEngine.step(s, a, s.task)?.state ?? s)}
            active
            width={Math.min(width - 40, 560)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
registerRootComponent(() => <SafeAreaProvider><App /></SafeAreaProvider>);
