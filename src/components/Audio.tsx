import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import { useCallback, useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { sources } from "../content/audioSources";
export function useSoundControls(enabled: boolean) {
  const player = useAudioPlayer(null);
  const foreground = useRef(AppState.currentState === "active" || Platform.OS === "web");
  useEffect(() => {
    const pause = () => { try { player.pause(); } catch { /* Native player may already be disposed. */ } };
    const sub = AppState.addEventListener("change", state => {
      foreground.current = state === "active";
      if (!foreground.current) pause();
    });
    const visibility = () => { if (document.hidden) pause(); };
    if (Platform.OS === "web" && typeof document !== "undefined") document.addEventListener("visibilitychange", visibility);
    return () => {
      sub.remove();
      if (Platform.OS === "web" && typeof document !== "undefined") document.removeEventListener("visibilitychange", visibility);
    };
  }, [player]);
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!enabled) { try { player.pause(); } catch { /* Transcript remains available. */ } }
  }, [enabled, player]);
  const play = useCallback(
    (key: string) => {
      if (!enabled || !foreground.current || !sources[key]) return;
      try {
        player.replace(sources[key]);
        player.play();
      } catch {
        /* All spoken instructions remain visible as text. */
      }
    },
    [enabled, player]
  );
  const stop = useCallback(() => { try { player.pause(); } catch { /* Player may already be disposed on route teardown. */ } }, [player]);
  return { play, stop };
}

export function useSounds(enabled: boolean) { return useSoundControls(enabled).play; }
