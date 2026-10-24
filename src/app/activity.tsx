import { SaveStatus } from "../components/SaveStatus";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router, useLocalSearchParams, useIsFocused } from "expo-router";
import { ActivityId, activityIds } from "../state/activities";
import { useStore } from "../state/Store";
import { CardGameScreen } from "../cards/CardGameScreen";
import { CardSession, createCardSession } from "../cards/engine";
import { RaceScreen } from "../racer/RaceScreen";
import { MysteryScreen } from "../mystery/MysteryScreen";
import { PartyScreen } from "../party/PartyScreen";
import { defaultOptions } from "../games/types";
import { Copy, GameHeader, styles } from "../components/ui";
import { Recovery } from "../components/Recovery";
import { useSoundControls } from "../components/Audio";
export default function Activity() {
  const { game } = useLocalSearchParams<{ game?: string }>(),
    store = useStore();
  if (!activityIds.includes(game as ActivityId)) return <Redirect href="/" />;
  if (!store.ready)
    return (
      <SafeAreaView style={styles.page}>
        <Copy>Opening your game…</Copy>
      </SafeAreaView>
    );
  if (store.recovery)
    return (
      <SafeAreaView style={styles.page}>
        <Recovery />
      </SafeAreaView>
    );
  return <ActivityGame key={`${game}:${store.epoch}`} id={game as ActivityId} />;
}
function ActivityGame({ id }: { id: ActivityId }) {
  const store = useStore(),
    focused = useIsFocused(),
    { width } = useWindowDimensions();
  const [epoch] = useState(store.epoch);
  const mysteryScroll = useRef<ScrollView>(null);
  const expectedId = useRef(store.save.activities?.[id]?.id ?? null);
  const saved = store.save.activities?.[id];
  const [freshCard] = useState(() =>
    id === "go-fish" || id === "crazy-eights" ? createCardSession(id, defaultOptions, undefined, undefined, { round: "quick", pace: "step" }) : null
  );
  const { play: sound, stop: stopSound } = useSoundControls(store.save.settings.sound && focused);
  const activityUpdate = store.activityUpdate;
  useEffect(() => {
    if (freshCard && !saved && activityUpdate(id, freshCard, { id: null, epoch })) expectedId.current = freshCard.id;
  }, [activityUpdate, id, freshCard, saved, epoch]);
  const save = (
    next: Parameters<typeof store.activityUpdate>[1],
    previous?: { id: string; revision: number } | null
  ) => {
    const accepted = store.activityUpdate(id, next, {
      id: previous?.id ?? expectedId.current,
      ...(previous ? { revision: previous.revision } : {}),
      epoch,
    });
    if (accepted) expectedId.current = next.id;
    return accepted;
  };
  const cards = saved?.game === "go-fish" || saved?.game === "crazy-eights" ? saved : freshCard;
  // The first action can race the initial-deal effect, so both use the same missing-save guard.
  const cardChange = (next: CardSession, previous: CardSession) =>
    save(next, expectedId.current === null ? undefined : previous);
  const mysterySound = { on: store.save.settings.sound, toggle: () => store.settings({ sound: !store.save.settings.sound }) };
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView
        ref={id === "island-mystery" ? mysteryScroll : undefined}
        contentContainerStyle={[styles.content, { paddingHorizontal: 20, gap: 16 }]}
        keyboardShouldPersistTaps="handled"
      >
        <SaveStatus />
        {id === "island-mystery" ? (
          <MysteryScreen
            menuHeader={
              <GameHeader
                title="Picnic Mystery"
                onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))}
                sound={mysterySound}
              />
            }
            soundControl={mysterySound}
            onActionFocus={() => mysteryScroll.current?.scrollTo({ y: 0, animated: false })}
            state={saved?.game === "island-mystery" ? saved : null}
            onSave={(next, previous) => save(next, previous)}
            active={focused}
            width={Math.min(width - 40, 1000)}
            sound={store.save.settings.sound}
            onFeedback={() => sound("tap")}
            onSpeakInstruction={(key) => sound(key)}
            onStopInstruction={stopSound}
          />
        ) : id === "racer" ? (
          <RaceScreen
            session={saved?.game === "racer" ? saved : null}
            records={store.save.raceRecords}
            onSave={(next) => save(next)}
            onExit={() => (router.canGoBack() ? router.back() : router.replace("/"))}
            sound={store.save.settings.sound}
            onToggleSound={() => store.settings({ sound: !store.save.settings.sound })}
            active={focused}
            onFeedback={(event) => sound(event === "finish" ? "win" : event === "checkpoint" ? "match" : "tap")}
          />
        ) : id === "word-imposter" ? (
          <PartyScreen
            session={saved?.game === "word-imposter" ? saved : null}
            onChange={(next, previous) => save(next, previous)}
            active={focused}
            width={Math.min(width - 40, 1000)}
            sound={store.save.settings.sound}
            onSpeakInstructions={() => sound("instructions-word-imposter")}
            onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))}
            onToggleSound={() => store.settings({ sound: !store.save.settings.sound })}
          />
        ) : cards ? (
          <>
            <CardGameScreen
              state={cards}
              onChange={cardChange}
              width={Math.min(width - 40, 1000)}
              active={focused}
              sound={store.save.settings.sound}
              onFeedback={() => sound("tap")}
              onSpeakInstruction={(key) => sound(key)}
              onStopInstruction={stopSound}
              onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))}
              onToggleSound={() => store.settings({ sound: !store.save.settings.sound })}
            />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
