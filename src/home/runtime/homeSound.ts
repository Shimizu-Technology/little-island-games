import { useEffect, useMemo, useRef } from "react";
import { AppState, Platform } from "react-native";

/**
 * H4 (HD-03, HD-04, rule 60): Island Home's own small sound set and light haptics.
 * Every cue is an original generated waveform (`scripts/generate-home-sounds.py`, files in
 * `assets/home/`), preloaded once
 * per screen, never `replace()`d per tap. At most four play at once. Sound and haptics both
 * follow the app's sound switch (and the effects switch): with sound off nothing plays and
 * nothing buzzes, and every visual stays exactly the same.
 */
export const homeSounds = ["pick", "lift", "cloth", "wood", "shell", "splash", "munch", "burp", "bubbles",
  "sizzle", "clang", "rustle", "knob", "plop"] as const;
export type HomeSound = (typeof homeSounds)[number];
/** Lengths in milliseconds, from the generated files. A voice counts as busy for this long. */
export const soundLength: Record<HomeSound, number> = {
  pick: 40, lift: 50, cloth: 95, wood: 100, shell: 120, splash: 260, munch: 230, burp: 380,
  bubbles: 520, sizzle: 700, clang: 320, rustle: 300, knob: 150, plop: 100,
};
export const MAX_VOICES = 4;
export const HAPTIC_GAP_MS = 100;
export type HapticKind = "pickup" | "attach";
type Voice = { play(): void; seekTo(seconds: number): unknown; pause(): void; remove(): void };
export type FeedbackDeps = {
  create: (sound: HomeSound) => Voice | undefined;
  haptic: (kind: HapticKind) => void;
  now: () => number;
};
export type HomeFeedback = {
  /** True when the sound was started. */
  play: (sound: HomeSound) => boolean;
  /** True when the device was asked to tap. */
  haptic: (kind: HapticKind) => boolean;
  /** Stops one cue early (sizzling food taken off the heat). */
  stop: (sound: HomeSound) => void;
  setLive: (live: boolean) => void;
  silence: () => void;
  dispose: () => void;
};
/** Pure core, so the rules are tested without native audio. */
export function createFeedback(deps: FeedbackDeps): HomeFeedback {
  const voices: Partial<Record<HomeSound, Voice>> = {};
  for (const sound of homeSounds) {
    try { const voice = deps.create(sound); if (voice) voices[sound] = voice; } catch { /* A missing cue stays silent. */ }
  }
  let live = false, lastHaptic = -Infinity;
  const busy: { sound: HomeSound; until: number }[] = [];
  const silence = () => { for (const voice of Object.values(voices)) { try { voice?.pause(); } catch { /* Released. */ } } busy.length = 0; };
  return {
    play(sound) {
      const voice = voices[sound];
      if (!live || !voice) return false;
      const now = deps.now();
      for (let i = busy.length - 1; i >= 0; i--) if (busy[i].until <= now || busy[i].sound === sound) busy.splice(i, 1);
      if (busy.length >= MAX_VOICES) return false;
      try {
        void voice.seekTo(0);
        voice.play();
      } catch {
        return false;
      }
      busy.push({ sound, until: now + soundLength[sound] });
      return true;
    },
    haptic(kind) {
      const now = deps.now();
      if (!live || now - lastHaptic < HAPTIC_GAP_MS) return false;
      lastHaptic = now;
      try { deps.haptic(kind); } catch { return false; }
      return true;
    },
    stop(sound) {
      try { voices[sound]?.pause(); } catch { /* Released. */ }
      for (let i = busy.length - 1; i >= 0; i--) if (busy[i].sound === sound) busy.splice(i, 1);
    },
    setLive(next) { live = next; if (!next) silence(); },
    silence,
    dispose() { silence(); for (const voice of Object.values(voices)) { try { voice?.remove(); } catch { /* Released. */ } } },
  };
}

/* eslint-disable @typescript-eslint/no-require-imports -- static asset and native requires, evaluated lazily so tests run without native audio. */
/** Static requires so the bundler ships each file. */
function source(sound: HomeSound): number {
  switch (sound) {
    case "pick": return require("../../../assets/home/pick.wav");
    case "lift": return require("../../../assets/home/lift.wav");
    case "cloth": return require("../../../assets/home/cloth.wav");
    case "wood": return require("../../../assets/home/wood.wav");
    case "shell": return require("../../../assets/home/shell.wav");
    case "splash": return require("../../../assets/home/splash.wav");
    case "munch": return require("../../../assets/home/munch.wav");
    case "burp": return require("../../../assets/home/burp.wav");
    case "bubbles": return require("../../../assets/home/bubbles.wav");
    case "sizzle": return require("../../../assets/home/sizzle.wav");
    case "clang": return require("../../../assets/home/clang.wav");
    case "rustle": return require("../../../assets/home/rustle.wav");
    case "knob": return require("../../../assets/home/knob.wav");
    case "plop": return require("../../../assets/home/plop.wav");
  }
}
function nativeVoice(sound: HomeSound): Voice | undefined {
  const audio = require("expo-audio") as typeof import("expo-audio");
  const player = audio.createAudioPlayer(source(sound));
  player.volume = 0.8;
  return player;
}

function nativeHaptic(kind: HapticKind) {
  const { feel } = require("../../components/feel") as typeof import("../../components/feel");
  feel(kind === "pickup" ? "tap" : "select");
}
/* eslint-enable @typescript-eslint/no-require-imports */
const clockNow = () => Date.now();

/** One preloaded set per Home screen. `live` is the app's sound switch and its effects switch together. */
export function useHomeFeedback(live: boolean): HomeFeedback {
  const feedback = useMemo(() => createFeedback({
    create: (sound) => { try { return nativeVoice(sound); } catch { return undefined; } },
    // iPad has no Taptic Engine; feel() is a no-op there and on web.
    haptic: nativeHaptic,
    now: clockNow,
  }), []);
  const foreground = useRef(AppState.currentState === "active" || Platform.OS === "web");
  const wanted = useRef(live);
  useEffect(() => {
    wanted.current = live;
    feedback.setLive(live && foreground.current);
  }, [feedback, live]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      foreground.current = state === "active";
      feedback.setLive(wanted.current && foreground.current);
    });
    return () => sub.remove();
  }, [feedback]);
  useEffect(() => () => feedback.dispose(), [feedback]);
  return feedback;
}
