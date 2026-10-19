import React, { useEffect, useRef, useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
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
import { Button, Copy, Heading, styles } from "../components/ui";
import { Recovery } from "../components/Recovery";
import { useSounds } from "../components/Audio";
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
  const epoch = useRef(store.epoch).current;
  const expectedId = useRef(store.save.activities?.[id]?.id ?? null);
  const saved = store.save.activities?.[id];
  const [freshCard] = useState(() =>
    id === "go-fish" || id === "crazy-eights" ? createCardSession(id, defaultOptions) : null
  );
  const sound = useSounds(store.save.settings.sound);
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
  // An unpersisted initial deck is committed by the first accepted action.
  const cardChange = (next: CardSession, previous: CardSession) =>
    save(next, expectedId.current === null ? undefined : previous);
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: 20, gap: 16 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.row, { justifyContent: "space-between", paddingTop: 12 }]}>
          <Button compact quiet onPress={() => router.back()}>
            ‹ Games
          </Button>
          <Button compact quiet onPress={() => store.settings({ sound: !store.save.settings.sound })}>
            Sound {store.save.settings.sound ? "on" : "off"}
          </Button>
        </View>
        {store.error && (
          <View accessibilityRole="alert">
            <Copy>{store.error}</Copy>
          </View>
        )}
        {id === "island-mystery" ? (
          <MysteryScreen
            state={saved?.game === "island-mystery" ? saved : null}
            onSave={(next, previous) => save(next, previous)}
            active={focused}
            width={Math.min(width - 40, 1000)}
            sound={store.save.settings.sound}
            onFeedback={() => sound("tap")}
          />
        ) : id === "racer" ? (
          <RaceScreen
            session={saved?.game === "racer" ? saved : null}
            records={store.save.raceRecords}
            onSave={(next) => save(next)}
            active={focused}
          />
        ) : id === "word-imposter" ? (
          <PartyScreen
            session={saved?.game === "word-imposter" ? saved : null}
            onChange={(next, previous) => save(next, previous)}
            active={focused}
            width={Math.min(width - 40, 1000)}
            sound={store.save.settings.sound}
          />
        ) : cards ? (
          <>
            <Heading>{id === "go-fish" ? "Go Fish" : "Crazy Eights"}</Heading>
            <CardGameScreen
              state={cards}
              onChange={cardChange}
              width={Math.min(width - 40, 1000)}
              active={focused}
              sound={store.save.settings.sound}
              onFeedback={() => sound("tap")}
            />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
