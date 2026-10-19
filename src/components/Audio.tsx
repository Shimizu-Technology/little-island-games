import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import { useCallback, useEffect } from "react";
import { sources } from "../content/audioSources";
export function useSounds(enabled: boolean) {
  const player = useAudioPlayer(null);
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!enabled) player.pause();
  }, [enabled, player]);
  return useCallback(
    (key: string) => {
      if (!enabled || !sources[key]) return;
      try {
        player.replace(sources[key]);
        player.play();
      } catch {
        /* All spoken instructions remain visible as text. */
      }
    },
    [enabled, player]
  );
}
