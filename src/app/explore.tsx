import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Recovery } from "../components/Recovery";
import { Copy, styles } from "../components/ui";
import { AppState } from "react-native";
import { router, useIsFocused } from "expo-router";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { ExploreScreen } from "../explore/ExploreScreen";
import { useStore } from "../state/Store";
import { sources } from "../content/audioSources";
export default function Explore() {
  const store = useStore();
  if (!store.ready)
    return (
      <SafeAreaView style={styles.page}>
        <Copy>Opening your discoveries…</Copy>
      </SafeAreaView>
    );
  if (store.recovery)
    return (
      <SafeAreaView style={styles.page}>
        <Recovery />
      </SafeAreaView>
    );
  return <ExploreReady key={store.epoch} />;
}
function ExploreReady() {
  const store = useStore(),
    focused = useIsFocused(),
    player = useAudioPlayer(null),
    status = useAudioPlayerStatus(player);
  const [speaking, setSpeaking] = useState<string>();
  const ownedPlayer = useRef<typeof player | null>(player);
  useLayoutEffect(() => {
    ownedPlayer.current = player;
    // Mark disposed before the audio hook releases its native shared object and child passive cleanups run.
    return () => {
      ownedPlayer.current = null;
    };
  }, [player]);
  const stop = useCallback(() => {
    if (ownedPlayer.current !== player) return;
    try {
      player.pause();
    } catch {
      /* The transcript stays available when native audio is unavailable. */
    }
    setSpeaking(undefined);
  }, [player]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") stop();
    });
    return () => sub.remove();
  }, [stop]);
  useEffect(() => {
    if (!focused || !store.save.settings.sound || status.didJustFinish) stop();
  }, [focused, store.save.settings.sound, status.didJustFinish, stop]);
  return (
    <ExploreScreen
      key={store.epoch}
      favorites={store.save.explore?.favorites ?? []}
      onToggleFavorite={store.toggleFavorite}
      onBack={() => router.back()}
      onStop={stop}
      narrationEnabled={store.save.settings.sound}
      speakingTopicId={speaking}
      onSpeak={(id) => {
        if (ownedPlayer.current !== player || !store.save.settings.sound || !sources[`explore-${id}`]) return;
        try {
          player.replace(sources[`explore-${id}`]);
          player.play();
          setSpeaking(id);
        } catch {
          setSpeaking(undefined);
        }
      }}
    />
  );
}
