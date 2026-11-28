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

/** Bounded preloaded players. Replaying a line never reloads it with replace().
 * Sequential narration is purely event-driven (zero reading timers) with per-step
 * monotonic tickets so delayed seekTo(0) callbacks can never overlap the next clip.
 */
export function useLibraryAudio(enabled: boolean, volume: number, scope: string) {
  const players = useRef(new Map<string, AudioPlayer>());
  const active = useRef(true);
  const playback = useRef(0);
  const stepTicket = useRef(0);
  const currentStepPlayer = useRef<AudioPlayer | null>(null);
  const sequenceCleanup = useRef<CleanupFn | null>(null);
  const [selected, setSelected] = useState("");
  const [notice, setNotice] = useState("");
  const [readingSequence, setReadingSequence] = useState(false);

  const releaseCurrentStep = useCallback(() => {
    stepTicket.current++;
    if (sequenceCleanup.current) {
      sequenceCleanup.current();
      sequenceCleanup.current = null;
    }
    if (currentStepPlayer.current) {
      try {
        currentStepPlayer.current.pause();
      } catch {
        /* Released native object. */
      }
      currentStepPlayer.current = null;
    }
  }, []);

  const clearSequence = useCallback(() => {
    releaseCurrentStep();
    setReadingSequence(false);
  }, [releaseCurrentStep]);

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
        const myStep = ++stepTicket.current;
        currentStepPlayer.current = player;
        void player
          .seekTo(0)
          .then(() => {
            if (active.current && ticket === playback.current && myStep === stepTicket.current) {
              player.play();
            }
          })
          .catch(() => {
            if (active.current && ticket === playback.current && myStep === stepTicket.current) {
              setNotice("Audio could not start. Try again.");
            }
          });
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

      const playable = sentences
        .map((sentence) => ({ sentence, source: resolveSource(sentence.speechKey, sentence) }))
        .filter((entry): entry is { sentence: Sentence; source: NonNullable<ReturnType<typeof resolveSource>> } => !!entry.source);

      if (!playable.length) {
        setSelected(sentences[0].id);
        setNotice("This recording is not installed. The words are here to read together.");
        return false;
      }

      const ticket = playback.current;
      setReadingSequence(true);
      setNotice("");

      const playStep = (index: number) => {
        // Explicitly pause any prior player and invalidate its step ticket before leaving it.
        releaseCurrentStep();
        if (!active.current || ticket !== playback.current) return;
        if (index >= playable.length) {
          clearSequence();
          setSelected("");
          return;
        }

        const { sentence, source } = playable[index];
        const myStep = stepTicket.current;

        try {
          const player = acquirePlayer(sentence.speechKey, source);
          currentStepPlayer.current = player;
          setSelected(sentence.id);

          let subscription: { remove?: () => void } | null = null;
          const detach = () => {
            try {
              subscription?.remove?.();
            } catch {
              /* Listener already removed. */
            }
            subscription = null;
          };

          if (typeof player.addListener === "function") {
            subscription = player.addListener("playbackStatusUpdate", (status: AudioStatus) => {
              if (!active.current || ticket !== playback.current || myStep !== stepTicket.current) {
                detach();
                return;
              }
              if (status?.didJustFinish) {
                playStep(index + 1);
              }
            });
          }
          sequenceCleanup.current = detach;

          void player
            .seekTo(0)
            .then(() => {
              if (active.current && ticket === playback.current && myStep === stepTicket.current) {
                player.play();
              }
            })
            .catch(() => {
              if (active.current && ticket === playback.current && myStep === stepTicket.current) {
                setNotice("Audio could not start. Try again.");
                clearSequence();
                setSelected("");
              }
            });
        } catch {
          setNotice("Audio could not start. Try again.");
          clearSequence();
          setSelected("");
        }
      };

      playStep(0);
      return true;
    },
    [enabled, stop, releaseCurrentStep, clearSequence, resolveSource, acquirePlayer]
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
