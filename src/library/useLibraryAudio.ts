import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { voiceSources } from "../content/neuralAudio";
import { learnSources } from "../content/learnAudio";
import { readingSpeech } from "../learn/kit/readingSpeech";
import { librarySpeech } from "./speech.generated";
import { libraryAssets } from "./assets.generated";
import type { Sentence } from "./schema";

type CleanupFn = () => void;

/** Bounded preloaded players. Replaying a line never reloads it with replace(). */
export function useLibraryAudio(enabled: boolean, volume: number, scope: string) {
  const players = useRef(new Map<string, AudioPlayer>());
  const active = useRef(true);
  const playback = useRef(0);
  const sequenceCleanup = useRef<CleanupFn | null>(null);
  const [selected, setSelected] = useState("");
  const [notice, setNotice] = useState("");
  const [readingSequence, setReadingSequence] = useState(false);

  const clearSequence = useCallback(() => {
    if (sequenceCleanup.current) {
      sequenceCleanup.current();
      sequenceCleanup.current = null;
    }
    setReadingSequence(false);
  }, []);

  const stop = useCallback(() => {
    playback.current++;
    clearSequence();
    for (const player of players.current.values()) {
      try {
        player.pause();
      } catch {
        /* Released native object. */
      }
    }
    setSelected("");
  }, [clearSequence]);

  const dispose = useCallback(() => {
    playback.current++;
    clearSequence();
    for (const player of players.current.values()) {
      try {
        player.remove();
      } catch {
        /* Already released. */
      }
    }
    players.current.clear();
  }, [clearSequence]);

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

  const resolveSource = useCallback((key: string, sentence?: Sentence) => {
    return sentence?.audio.status === "ready"
      ? libraryAssets[sentence.audio.path]
      : (librarySpeech[key] ?? voiceSources.warm[key] ?? learnSources[key]);
  }, []);

  const acquirePlayer = useCallback(
    (key: string, source: Parameters<typeof createAudioPlayer>[0]) => {
      let player = players.current.get(key);
      if (!player) {
        if (players.current.size >= 6) {
          const [oldKey, oldPlayer] = players.current.entries().next().value!;
          try {
            oldPlayer.remove();
          } catch {
            /* Already released. */
          }
          players.current.delete(oldKey);
        }
        player = createAudioPlayer(source);
        players.current.set(key, player);
      }
      player.volume = volume;
      return player;
    },
    [volume]
  );

  const speak = useCallback(
    (key: string, sentence?: Sentence) => {
      stop();
      if (!enabled) {
        setNotice("Sound is off. You can keep reading.");
        return false;
      }
      if (!active.current) return false;
      const source = resolveSource(key, sentence);
      if (!source) {
        setNotice("This recording is not installed. The words are here to read together.");
        setSelected(sentence?.id ?? key);
        return false;
      }
      try {
        const player = acquirePlayer(key, source);
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
    [enabled, stop, resolveSource, acquirePlayer]
  );

  const speakSequence = useCallback(
    (sentences: readonly Sentence[]) => {
      stop();
      if (!enabled) {
        setNotice("Sound is off. You can keep reading.");
        return false;
      }
      if (!active.current || sentences.length === 0) return false;

      const ticket = playback.current;
      setReadingSequence(true);
      setNotice("");

      const playStep = (index: number) => {
        if (!active.current || ticket !== playback.current) return;
        if (index >= sentences.length) {
          clearSequence();
          setSelected("");
          return;
        }
        const sentence = sentences[index];
        const source = resolveSource(sentence.speechKey, sentence);
        if (!source) {
          setSelected(sentence.id);
          setNotice("This recording is not installed. The words are here to read together.");
          const fallbackTimer = setTimeout(() => {
            if (active.current && ticket === playback.current) playStep(index + 1);
          }, 1600);
          sequenceCleanup.current = () => clearTimeout(fallbackTimer);
          return;
        }
        try {
          const player = acquirePlayer(sentence.speechKey, source);
          setSelected(sentence.id);

          let done = false;
          let breathTimer: ReturnType<typeof setTimeout> | null = null;
          let safetyTimer: ReturnType<typeof setTimeout> | null = null;
          let subscription: { remove?: () => void } | null = null;

          const teardown = () => {
            if (breathTimer) clearTimeout(breathTimer);
            if (safetyTimer) clearTimeout(safetyTimer);
            breathTimer = null;
            safetyTimer = null;
            try {
              subscription?.remove?.();
            } catch {
              /* Listener already removed. */
            }
            subscription = null;
          };

          const advance = () => {
            if (done) return;
            done = true;
            teardown();
            if (!active.current || ticket !== playback.current) return;
            if (index + 1 >= sentences.length) {
              clearSequence();
              setSelected("");
              return;
            }
            breathTimer = setTimeout(() => {
              if (active.current && ticket === playback.current) playStep(index + 1);
            }, 240);
            sequenceCleanup.current = () => {
              if (breathTimer) clearTimeout(breathTimer);
            };
          };

          if (typeof player.addListener === "function") {
            subscription = player.addListener("playbackStatusUpdate", (status: AudioStatus) => {
              if (!active.current || ticket !== playback.current) {
                teardown();
                return;
              }
              if (status?.didJustFinish) advance();
            });
          }

          const estimatedMs = Math.max(3500, Math.min(20000, sentence.text.length * 95 + 2500));
          const safetyMs =
            typeof player.addListener === "function"
              ? Math.max(14000, (player.duration || 0) * 1000 + 3000)
              : estimatedMs;
          safetyTimer = setTimeout(advance, safetyMs);
          sequenceCleanup.current = teardown;

          void player
            .seekTo(0)
            .then(() => {
              if (active.current && ticket === playback.current) player.play();
            })
            .catch(() => {
              if (active.current && ticket === playback.current) {
                setNotice("Audio could not start. Try again.");
                clearSequence();
              }
            });
        } catch {
          setNotice("Audio could not start. Try again.");
          clearSequence();
        }
      };

      playStep(0);
      return true;
    },
    [enabled, stop, clearSequence, resolveSource, acquirePlayer]
  );

  const word = useCallback(
    (text: string) => {
      const clean = text.toLowerCase().replace(/[^a-z0-9'-]/g, "");
      const candidates = [`library-word-${clean}`, clean, readingSpeech(clean)];
      const key = candidates.find(
        (candidate) => librarySpeech[candidate] || voiceSources.warm[candidate] || learnSources[candidate]
      );
      return speak(key ?? candidates[0]);
    },
    [speak]
  );

  return { speak, speakSequence, word, stop, selected, notice, readingSequence };
}
