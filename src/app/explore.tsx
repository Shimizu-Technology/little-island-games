import React, { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { router, useIsFocused } from "expo-router";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { ExploreScreen } from "../explore/ExploreScreen";
import { useStore } from "../state/Store";
import { sources } from "../content/audioSources";
export default function Explore() {
  const store = useStore(),
    focused = useIsFocused(),
    player = useAudioPlayer(null),
    status = useAudioPlayerStatus(player);
  const [speaking, setSpeaking] = useState<string>();
  const stop = useCallback(() => {
    player.pause();
    setSpeaking(undefined);
  }, [player]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") stop();
    });
    return () => sub.remove();
  }, [stop]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- External sound/route suspension.
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
        if (!store.save.settings.sound || !sources[`explore-${id}`]) return;
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
