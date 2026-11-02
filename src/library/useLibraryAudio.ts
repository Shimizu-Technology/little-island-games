import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { voiceSources } from "../content/neuralAudio";
import { learnSources } from "../content/learnAudio";
import { readingSpeech } from "../learn/kit/readingSpeech";
import { librarySpeech } from "./speech.generated";
import { libraryAssets } from "./assets.generated";
import type { Sentence } from "./schema";

/** Bounded preloaded players. Replaying a line never reloads it with replace(). */
export function useLibraryAudio(enabled: boolean, volume: number, scope: string) {
  const players = useRef(new Map<string, AudioPlayer>());
  const active = useRef(true);
  const playback = useRef(0);
  const [selected, setSelected] = useState("");
  const [notice, setNotice] = useState("");
  const stop = useCallback(() => {
    playback.current++;
    for (const player of players.current.values()) {
      try {
        player.pause();
      } catch {
        /* Released native object. */
      }
    }
    setSelected("");
  }, []);
  const dispose = useCallback(() => {
    playback.current++;
    for (const player of players.current.values()) {
      try {
        player.remove();
      } catch {
        /* Already released. */
      }
    }
    players.current.clear();
  }, []);
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
    const sub = AppState.addEventListener("change", (state) => {
      active.current = state === "active";
      if (!active.current) stop();
    });
    const visibility = () => {
      active.current = !document.hidden;
      if (!active.current) stop();
    };
    if (Platform.OS === "web") document.addEventListener("visibilitychange", visibility);
    return () => {
      sub.remove();
      if (Platform.OS === "web") document.removeEventListener("visibilitychange", visibility);
      active.current = false;
      dispose();
    };
  }, [stop, dispose]);
  useEffect(() => {
    // Stop the native resource immediately when its owning route/preferences change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    stop();
    dispose();
  }, [scope, enabled, volume, stop, dispose]);
  const speak = useCallback(
    (key: string, sentence?: Sentence) => {
      stop();
      if (!enabled) {
        setNotice("Sound is off. You can keep reading.");
        return false;
      }
      if (!active.current) return false;
      const source =
        sentence?.audio.status === "ready"
          ? libraryAssets[sentence.audio.path]
          : (librarySpeech[key] ?? voiceSources.warm[key] ?? learnSources[key]);
      if (!source) {
        setNotice("This recording is not installed. The words are here to read together.");
        setSelected(sentence?.id ?? key);
        return false;
      }
      try {
        let player = players.current.get(key);
        if (!player) {
          if (players.current.size >= 6) {
            const [oldKey, oldPlayer] = players.current.entries().next().value!;
            oldPlayer.remove();
            players.current.delete(oldKey);
          }
          player = createAudioPlayer(source);
          players.current.set(key, player);
        }
        player.volume = volume;
        const ticket = playback.current;
        void player
          .seekTo(0)
          .then(() => {
            if (active.current && ticket === playback.current) player.play();
          })
          .catch(() => setNotice("Audio could not start. Try again."));
        setSelected(sentence?.id ?? key);
        setNotice("");
        return true;
      } catch {
        setNotice("Audio could not start. Try again.");
        return false;
      }
    },
    [enabled, volume, stop]
  );
  const word = useCallback(
    (text: string) => {
      const clean = text.toLowerCase().replace(/[^a-z0-9'-]/g, "");
      const candidates = [`library-word-${clean}`, clean, readingSpeech(clean)];
      const key = candidates.find((candidate) => librarySpeech[candidate] || voiceSources.warm[candidate] || learnSources[candidate]);
      return speak(key ?? candidates[0]);
    },
    [speak]
  );
  return { speak, word, stop, selected, notice };
}
