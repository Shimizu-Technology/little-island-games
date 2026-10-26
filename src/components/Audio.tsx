import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { AppState, Platform } from "react-native";
import { sources as baseSources } from "../content/audioSources";
import { learnSources } from "../content/learnAudio";
import { voiceSources } from "../content/neuralAudio";
import type { Settings } from "../state/validation";
import { feel, toneFeel } from "./feel";
export const AudioPreferences = createContext<Partial<Settings> & { epoch?: number }>({});
const sources: Record<string, number> = { ...baseSources, ...learnSources };
// expo-audio's web player calls HTMLMediaElement.play() without handling its promise. A quick
// second tone interrupts the first and the browser rejects it with AbortError; that is expected.
if (Platform.OS === "web" && typeof window !== "undefined")
  window.addEventListener("unhandledrejection", (event) => {
    if ((event.reason as { name?: string } | undefined)?.name === "AbortError") event.preventDefault();
  });
export function useSoundControls(enabled: boolean) {
  const player = useAudioPlayer(null);
  const prefs = useContext(AudioPreferences);
  const context = useMemo(() => ({ enabled, narration: prefs.narration ?? true, effects: prefs.effects ?? true, automatic: prefs.automaticSpeech ?? false, volume: prefs.narrationVolume ?? 0.75, voice: prefs.voice ?? "warm", epoch: prefs.epoch ?? 0 }), [enabled, prefs.narration, prefs.effects, prefs.automaticSpeech, prefs.narrationVolume, prefs.voice, prefs.epoch]);
  const live = useRef<typeof context | null>(context);
  useLayoutEffect(() => {
    live.current = context;
    try { player.pause(); } catch { /* A setting change also cancels any old spoken line. */ }
    return () => { live.current = null; try { player.pause(); } catch { /* Disposed native player. */ } };
  }, [context, player]);
  const foreground = useRef(AppState.currentState === "active" || Platform.OS === "web");
  useEffect(() => {
    const pause = () => { try { player.pause(); } catch { /* Native player may already be disposed. */ } };
    const sub = AppState.addEventListener("change", state => {
      foreground.current = state === "active";
      if (!foreground.current) pause();
    });
    const visibility = () => { foreground.current = !document.hidden; if (document.hidden) pause(); };
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
    // eslint-disable-next-line react-hooks/immutability -- Expo AudioPlayer is a native object with documented mutable properties.
    (key: string, automatic = false) => {
      // Feedback tones also give a light haptic, even with sound off.
      if (live.current === context && foreground.current && toneFeel[key]) feel(toneFeel[key]);
      const tone = !!toneFeel[key];
      if (live.current !== context || !context.enabled || !foreground.current || (tone ? !context.effects : !context.narration || (automatic && !context.automatic))) return false;
      const source = tone ? sources[key] : (voiceSources[context.voice][key] ?? sources[key]);
      if (!source) return false;
      try {
        // eslint-disable-next-line react-hooks/immutability -- Native AudioPlayer volume is set through this SDK property.
        player.volume = tone ? 1 : context.volume;
        player.replace(source);
        player.play();
        return true;
      } catch {
        /* All spoken instructions remain visible as text. */
        return false;
      }
    },
    [context, player]
  );
  const stop = useCallback(() => { try { player.pause(); } catch { /* Player may already be disposed on route teardown. */ } }, [player]);
  return { play, stop, player };
}

export function useSounds(enabled: boolean) { return useSoundControls(enabled).play; }
